# 📋 GUIDE D'AUDIT ET MIGRATION MULTI-TENANT

## 🎯 Vue d'ensemble

Le script `supabase/migrations/audit_multi_tenant.sql` est un outil automatisé qui:
1. ✅ Audite toutes les tables de votre base de données
2. ✅ Vérifie l'isolation multi-tenant (company_id, FK, RLS, policies)
3. ✅ Génère automatiquement les commandes SQL de migration
4. ✅ Fournit des fonctions utilitaires pour la vérification et le backfill

---

## 🚀 ÉTAPE 1: EXÉCUTER L'AUDIT

### Dans Supabase Dashboard

1. **Ouvrir le SQL Editor**
   - Aller dans votre projet Supabase
   - Cliquer sur "SQL Editor" dans le menu de gauche

2. **Copier le script**
   - Ouvrir `supabase/migrations/audit_multi_tenant.sql`
   - Copier tout le contenu

3. **Exécuter l'audit**
   - Coller dans le SQL Editor
   - Cliquer sur "Run"

4. **Lire les résultats**
   - Les résultats s'affichent dans l'onglet "Results"
   - Chaque table est analysée avec des émojis pour faciliter la lecture

---

## 📊 COMPRENDRE LES RÉSULTATS

### Symboles et Statuts

| Symbole | Signification |
|---------|---------------|
| ✅ | Élément configuré correctement |
| ❌ | Élément manquant ou incorrect |
| ⚠️  | Élément partiellement configuré |
| 🔧 | Migration SQL nécessaire |

### Exemple de Sortie

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 TABLE: public.clients
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Colonne company_id: PRÉSENTE
✅ Foreign Key vers companies: PRÉSENTE
✅ Index sur company_id: PRÉSENT
✅ RLS (Row Level Security): ACTIVÉ
ℹ️  Policies RLS: 4 trouvée(s)

📝 Policies existantes:
   - select_own_company_clients (FOR SELECT)
   - insert_own_company_clients (FOR INSERT)
   - update_own_company_clients (FOR UPDATE)
   - delete_own_company_clients (FOR DELETE)
```

### Table Nécessitant une Migration

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 TABLE: public.projects
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Colonne company_id: ABSENTE

🔧 MIGRATION NÉCESSAIRE:
-- Ajouter la colonne company_id
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS company_id UUID;

❌ Foreign Key vers companies: ABSENTE

🔧 MIGRATION NÉCESSAIRE:
-- Ajouter la contrainte FK
ALTER TABLE public.projects ADD CONSTRAINT IF NOT EXISTS fk_projects_company_id
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

⚠️  Index sur company_id: ABSENT

🔧 MIGRATION NÉCESSAIRE:
-- Créer un index sur company_id pour les performances
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects (company_id);

❌ RLS (Row Level Security): DÉSACTIVÉ

🔧 MIGRATION NÉCESSAIRE:
-- Activer RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

ℹ️  Policies RLS: 0 trouvée(s)

🔧 MIGRATION NÉCESSAIRE:
-- Créer les 4 policies standards (SELECT, INSERT, UPDATE, DELETE)

-- Policy SELECT
CREATE POLICY "select_own_company_projects" ON public.projects
  FOR SELECT
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- Policy INSERT
CREATE POLICY "insert_own_company_projects" ON public.projects
  FOR INSERT
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

-- Policy UPDATE
CREATE POLICY "update_own_company_projects" ON public.projects
  FOR UPDATE
  USING (company_id = (auth.jwt()->>'company_id')::uuid)
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

-- Policy DELETE
CREATE POLICY "delete_own_company_projects" ON public.projects
  FOR DELETE
  USING (company_id = (auth.jwt()->>'company_id')::uuid);
```

---

## 🔧 ÉTAPE 2: APPLIQUER LES MIGRATIONS

### A. Copier les Migrations

1. **Identifier les tables à migrer**
   - Chercher tous les blocs "🔧 MIGRATION NÉCESSAIRE"
   - Noter les tables concernées

2. **Copier les commandes SQL**
   - Copier TOUTES les commandes SQL générées
   - Les regrouper par table

### B. Créer un Fichier de Migration

Créer un nouveau fichier: `supabase/migrations/fix_multi_tenant_YYYYMMDD.sql`

```sql
-- ============================================================================
-- MIGRATION: Correction isolation multi-tenant
-- Date: 2026-01-23
-- ============================================================================

-- ============================================================================
-- TABLE: projects
-- ============================================================================

-- 1. Ajouter company_id
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Backfiller les données existantes (IMPORTANT!)
-- Option A: Si tous les projects ont un user_id
UPDATE public.projects p
SET company_id = cu.company_id
FROM public.company_users cu
WHERE p.user_id = cu.user_id
  AND p.company_id IS NULL
  AND cu.status = 'active';

-- Option B: Utiliser la fonction de backfill
-- SELECT public.backfill_company_id_from_user('projects');

-- 3. Rendre company_id NOT NULL (après le backfill!)
ALTER TABLE public.projects 
  ALTER COLUMN company_id SET NOT NULL;

-- 4. Ajouter FK
ALTER TABLE public.projects 
  ADD CONSTRAINT IF NOT EXISTS fk_projects_company_id
  FOREIGN KEY (company_id) 
  REFERENCES public.companies(id) 
  ON DELETE CASCADE;

-- 5. Créer index
CREATE INDEX IF NOT EXISTS idx_projects_company_id 
  ON public.projects (company_id);

-- 6. Activer RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

-- 7. Créer policies
DROP POLICY IF EXISTS "select_own_company_projects" ON public.projects;
DROP POLICY IF EXISTS "insert_own_company_projects" ON public.projects;
DROP POLICY IF EXISTS "update_own_company_projects" ON public.projects;
DROP POLICY IF EXISTS "delete_own_company_projects" ON public.projects;

CREATE POLICY "select_own_company_projects" ON public.projects
  FOR SELECT
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "insert_own_company_projects" ON public.projects
  FOR INSERT
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "update_own_company_projects" ON public.projects
  FOR UPDATE
  USING (company_id = (auth.jwt()->>'company_id')::uuid)
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "delete_own_company_projects" ON public.projects
  FOR DELETE
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ============================================================================
-- Répéter pour chaque table...
-- ============================================================================
```

### C. Exécuter la Migration

1. **Sur un environnement de développement d'abord!**
   - Tester la migration sur une copie de la base
   - Vérifier qu'aucune erreur n'apparaît
   - Vérifier que les données sont accessibles

2. **Sauvegarder la production**
   ```bash
   # Dans Supabase Dashboard: Database > Backups
   # Créer un backup manuel avant la migration
   ```

3. **Exécuter sur production**
   - Aller dans SQL Editor
   - Coller la migration
   - Exécuter

---

## ✅ ÉTAPE 3: VÉRIFIER LA MIGRATION

### A. Ré-exécuter l'Audit

```sql
-- Copier/coller le script d'audit à nouveau
-- Vérifier que toutes les tables ont des ✅
```

### B. Utiliser la Fonction de Vérification

```sql
-- Vérifier une table spécifique
SELECT * FROM public.check_table_isolation('clients');
SELECT * FROM public.check_table_isolation('projects');
SELECT * FROM public.check_table_isolation('invoices');
```

**Résultat attendu:**
```
check_name          | status    | details
--------------------|-----------|---------------------------------
company_id column   | ✅ OK     | Column company_id existence
Foreign Key         | ✅ OK     | Foreign key to companies table
RLS Enabled         | ✅ OK     | Row Level Security status
RLS Policies        | ✅ OK     | 4 policies found
```

### C. Tester en Conditions Réelles

1. **Créer un enregistrement**
   ```typescript
   // Dans votre app React
   const { data } = await supabase
     .from("projects")
     .insert({ name: "Test Project" })
     .select()
     .single();
   
   console.log(data.company_id); // Doit être le company_id de l'user
   ```

2. **Vérifier l'isolation**
   ```typescript
   // Se connecter avec User A (Company A)
   const { data: projectsA } = await supabase
     .from("projects")
     .select("*");
   
   // Se connecter avec User B (Company B)
   const { data: projectsB } = await supabase
     .from("projects")
     .select("*");
   
   // projectsA et projectsB doivent être différents!
   ```

---

## 🛠️ FONCTIONS UTILITAIRES

### 1. Vérifier l'Isolation d'une Table

```sql
SELECT * FROM public.check_table_isolation('nom_de_la_table');
```

**Utilisation:**
- Vérifier rapidement le statut d'une table
- Identifier les problèmes de configuration
- Valider après migration

---

### 2. Backfiller company_id

```sql
SELECT public.backfill_company_id_from_user('nom_de_la_table');
```

**Utilisation:**
- Attribuer automatiquement un company_id aux enregistrements existants
- Basé sur le user_id de l'enregistrement
- Utilise la table company_users pour trouver le company_id

**Conditions:**
- La table doit avoir une colonne `user_id`
- La table doit avoir une colonne `company_id`
- L'utilisateur doit être dans `company_users`

**Exemple:**
```sql
-- Backfiller tous les clients sans company_id
SELECT public.backfill_company_id_from_user('clients');

-- Résultat: "Backfilled 42 rows in table clients"
```

---

## ⚠️ AVERTISSEMENTS ET BONNES PRATIQUES

### 🔴 CRITIQUE: Ordre des Opérations

**TOUJOURS suivre cet ordre:**

1. ✅ Ajouter `company_id` (nullable)
2. ✅ **Backfiller les données existantes**
3. ✅ Rendre `company_id` NOT NULL
4. ✅ Ajouter FK et index
5. ✅ Activer RLS
6. ✅ Créer policies

**❌ NE JAMAIS:**
- Rendre `company_id` NOT NULL avant le backfill
- Activer RLS avant d'avoir backfillé les données
- Supprimer des policies avant d'en créer de nouvelles

---

### 🟡 Données Orphelines

Si des enregistrements n'ont pas de `user_id` ou si le `user_id` n'existe pas dans `company_users`:

**Option 1: Attribuer à une entreprise par défaut**
```sql
UPDATE public.projects
SET company_id = 'UUID-DE-LENTREPRISE-PAR-DEFAUT'
WHERE company_id IS NULL;
```

**Option 2: Supprimer (ATTENTION!)**
```sql
-- SAUVEGARDER D'ABORD!
DELETE FROM public.projects WHERE company_id IS NULL;
```

---

### 🟢 Tables Sans company_id

Certaines tables ne nécessitent PAS de `company_id`:
- `auth.users` (gérées par Supabase Auth)
- `storage.*` (gérées par Supabase Storage)
- `companies` (table racine)
- `company_users` (table de liaison)
- Tables de configuration globale

Le script d'audit ignore automatiquement ces tables.

---

## 📊 CHECKLIST COMPLÈTE

### Avant Migration
- [ ] Exécuter l'audit SQL
- [ ] Identifier toutes les tables nécessitant une migration
- [ ] Créer une sauvegarde complète de la base
- [ ] Tester la migration sur un environnement de développement

### Pendant Migration
- [ ] Créer le fichier de migration SQL
- [ ] Ajouter `company_id` (nullable)
- [ ] Backfiller les données existantes
- [ ] Vérifier qu'aucune donnée orpheline ne reste
- [ ] Rendre `company_id` NOT NULL
- [ ] Ajouter FK et index
- [ ] Activer RLS
- [ ] Créer les 4 policies (SELECT, INSERT, UPDATE, DELETE)

### Après Migration
- [ ] Ré-exécuter l'audit pour vérifier
- [ ] Utiliser `check_table_isolation()` pour chaque table
- [ ] Tester la création d'enregistrements
- [ ] Tester l'isolation entre entreprises
- [ ] Vérifier les performances (indexes)
- [ ] Documenter les changements

---

## 🎯 EXEMPLES COMPLETS

### Exemple 1: Migration Simple (Table avec user_id)

```sql
-- Table: invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id UUID;

SELECT public.backfill_company_id_from_user('invoices');

ALTER TABLE public.invoices ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.invoices 
  ADD CONSTRAINT fk_invoices_company_id
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_invoices_company_id ON public.invoices (company_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

-- Policies...
```

### Exemple 2: Migration Complexe (Données Orphelines)

```sql
-- Table: old_data (pas de user_id)
ALTER TABLE public.old_data ADD COLUMN IF NOT EXISTS company_id UUID;

-- Identifier les données orphelines
SELECT COUNT(*) FROM public.old_data WHERE company_id IS NULL;

-- Attribuer à une entreprise par défaut
UPDATE public.old_data
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL;

-- Suite de la migration...
```

---

## 📞 SUPPORT ET DÉPANNAGE

### Erreur: "column company_id does not exist"
**Cause:** Migration pas encore exécutée  
**Solution:** Exécuter la migration pour ajouter `company_id`

### Erreur: "null value in column company_id violates not-null constraint"
**Cause:** Données pas backfillées avant NOT NULL  
**Solution:** Backfiller d'abord, puis ajouter NOT NULL

### Erreur: "new row violates row-level security policy"
**Cause:** RLS activé mais policies mal configurées  
**Solution:** Vérifier que les 4 policies sont créées correctement

### Performance Lente
**Cause:** Index manquant sur `company_id`  
**Solution:** Créer l'index avec `CREATE INDEX`

---

**Créé le:** 2026-01-23  
**Version:** 1.0  
**Statut:** Production-ready
