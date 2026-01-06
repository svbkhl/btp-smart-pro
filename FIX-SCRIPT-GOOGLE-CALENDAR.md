# 🔧 Correction du Script Google Calendar Entreprise

## ❌ Problèmes identifiés

1. **Contrainte UNIQUE(company_id) sans vérification** :
   - Le script essayait d'ajouter une contrainte UNIQUE sans vérifier si elle existe déjà
   - Risque d'échec si des doublons existent dans la table

2. **Migration company_id pour employee_assignments** :
   - La migration pouvait échouer si certains employés n'avaient pas de `company_id`
   - Pas de fallback via `projects.company_id`

## ✅ Corrections apportées

### 1. Gestion de la contrainte UNIQUE

```sql
-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE public.google_calendar_connections 
DROP CONSTRAINT IF EXISTS google_calendar_connections_company_id_unique;

-- Nettoyer les doublons avant d'ajouter la contrainte
-- Garde seulement la connexion la plus récente par entreprise
DO $$
DECLARE
  dup_record RECORD;
BEGIN
  FOR dup_record IN 
    SELECT company_id, array_agg(id ORDER BY created_at DESC) as ids
    FROM public.google_calendar_connections
    WHERE company_id IS NOT NULL
    GROUP BY company_id
    HAVING COUNT(*) > 1
  LOOP
    DELETE FROM public.google_calendar_connections
    WHERE company_id = dup_record.company_id
    AND id != dup_record.ids[1];
  END LOOP;
END $$;

-- Ajouter la contrainte avec vérification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'google_calendar_connections_company_id_unique'
  ) THEN
    ALTER TABLE public.google_calendar_connections 
    ADD CONSTRAINT google_calendar_connections_company_id_unique 
    UNIQUE(company_id);
  END IF;
END $$;
```

### 2. Migration company_id améliorée

```sql
-- Ajouter la colonne (nullable d'abord)
ALTER TABLE public.employee_assignments ADD COLUMN company_id UUID;

-- Migrer depuis employees
UPDATE public.employee_assignments ea
SET company_id = e.company_id
FROM public.employees e
WHERE ea.employee_id = e.id
AND ea.company_id IS NULL
AND e.company_id IS NOT NULL;

-- Fallback via projects si nécessaire
UPDATE public.employee_assignments ea
SET company_id = p.company_id
FROM public.projects p
WHERE ea.project_id = p.id
AND ea.company_id IS NULL
AND p.company_id IS NOT NULL;

-- Rendre NOT NULL seulement si toutes les données sont migrées
IF NOT EXISTS (
  SELECT 1 FROM public.employee_assignments WHERE company_id IS NULL
) THEN
  ALTER TABLE public.employee_assignments ALTER COLUMN company_id SET NOT NULL;
END IF;
```

## 📝 Instructions

1. **Exécuter le script corrigé** :
   ```sql
   -- Dans Supabase SQL Editor
   -- Exécuter: supabase/migrations/20260106000001_google_calendar_entreprise_level.sql
   ```

2. **Vérifier les résultats** :
   ```sql
   -- Vérifier qu'il n'y a pas de doublons
   SELECT company_id, COUNT(*) 
   FROM google_calendar_connections 
   GROUP BY company_id 
   HAVING COUNT(*) > 1;
   -- Doit retourner 0 lignes

   -- Vérifier que tous les assignments ont un company_id
   SELECT COUNT(*) 
   FROM employee_assignments 
   WHERE company_id IS NULL;
   -- Doit retourner 0 (ou un nombre acceptable si certains employés/projets n'ont pas de company_id)
   ```

## ⚠️ Notes

- Si des `employee_assignments` restent sans `company_id`, c'est parce que :
  - L'employé associé n'a pas de `company_id`
  - Le projet associé n'a pas de `company_id`
  - Il faudra corriger ces données manuellement avant de rendre la colonne NOT NULL
