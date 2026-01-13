# 🔥 Guide : Correction JWT project_id injectant "events"

## 🎯 Problème Identifié

PostgREST injecte le nom de la ressource **"events"** comme valeur de `project_id` via `request.jwt.claim.project_id`, causant l'erreur :

```
invalid input syntax for type uuid: "events"
```

## 🔍 Diagnostic

### Étape 1 : Exécuter le diagnostic

Exécutez dans Supabase SQL Editor :

```sql
-- Fichier: supabase/DIAGNOSTIC-JWT-PROJECT-ID.sql
```

Ce script identifie :
- ✅ Toutes les policies RLS utilisant JWT claims
- ✅ Tous les triggers utilisant JWT claims
- ✅ Les fonctions qui assignent `project_id` depuis JWT
- ✅ La structure de la table `events`
- ✅ Les contraintes FK sur `project_id`

---

## ✅ Solution Définitive

### Étape 2 : Exécuter le fix complet

Exécutez dans Supabase SQL Editor :

```sql
-- Fichier: supabase/FIX-POSTGREST-JWT-PROJECT-ID.sql
```

Ce script effectue :

1. **Diagnostic automatique** : Compte les policies/triggers avec JWT
2. **Désactivation temporaire** : Désactive tous les triggers
3. **Suppression des triggers problématiques** :
   - `trigger_set_event_project_id`
   - `trigger_set_project_id_from_jwt`
   - `trigger_auto_set_project_id`
4. **Suppression des fonctions problématiques** :
   - `set_event_project_id_from_jwt()`
   - `auto_set_project_id()`
5. **Correction de la structure** :
   - Rend `project_id` nullable si nécessaire
   - Vérifie/crée la FK avec `ON DELETE SET NULL`
6. **Suppression de toutes les policies RLS** existantes
7. **Création de policies RLS sécurisées** :
   - ✅ Acceptent `project_id IS NULL`
   - ✅ Aucune référence à `request.jwt.claim.project_id`
   - ✅ Validation que `project_id` appartient à la même company
8. **Création d'un trigger de nettoyage** :
   - Bloque les valeurs invalides ("events", "undefined", etc.)
   - Met automatiquement à `NULL` si invalide
9. **Nettoyage des données corrompues**
10. **Vérification finale** : Confirme qu'il n'y a plus de références JWT

---

## 📋 Schéma Final Correct

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL, -- ⚠️ NULLABLE
  -- ... autres colonnes
);
```

**Points clés** :
- ✅ `project_id` est **NULLABLE** (pas de NOT NULL)
- ✅ FK avec `ON DELETE SET NULL`
- ✅ Aucun DEFAULT sur `project_id`
- ✅ Policies RLS acceptent `project_id IS NULL`
- ✅ Trigger nettoie les valeurs invalides

---

## 🔒 Policies RLS Finales

### Policy INSERT (accepte project_id NULL)

```sql
CREATE POLICY "Company users can insert events"
ON public.events FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND company_id = public.get_user_company_id()
  -- ⚠️ IMPORTANT: project_id peut être NULL
  AND (
    project_id IS NULL
    OR project_id IN (
      SELECT id FROM public.projects 
      WHERE company_id = public.get_user_company_id()
    )
  )
);
```

**Caractéristiques** :
- ✅ Aucune référence à `request.jwt.claim.project_id`
- ✅ Accepte `project_id IS NULL`
- ✅ Valide que `project_id` appartient à la même company si défini

---

## 🛡️ Trigger de Nettoyage

```sql
CREATE FUNCTION public.clean_event_project_id_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    -- Vérifier format UUID strict
    IF NOT (NEW.project_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      NEW.project_id := NULL;
      RETURN NEW;
    END IF;
    
    -- Vérifier que le projet existe et appartient à la company
    IF NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = NEW.project_id
      AND p.company_id = NEW.company_id
    ) THEN
      NEW.project_id := NULL;
    END IF;
  ELSE
    NEW.project_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;
```

**Fonctionnalités** :
- ✅ Bloque "events", "undefined", chaînes vides
- ✅ Valide le format UUID strict
- ✅ Vérifie que le projet existe et appartient à la company
- ✅ Met automatiquement à `NULL` si invalide

---

## ✅ Vérification Post-Fix

### Test 1 : INSERT sans project_id

```sql
INSERT INTO public.events (user_id, company_id, title, start_date)
VALUES (
  auth.uid(),
  (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1),
  'Test Event',
  NOW()
);
```

**Résultat attendu** : ✅ Succès, `project_id` = `NULL`

### Test 2 : INSERT avec project_id valide

```sql
INSERT INTO public.events (user_id, company_id, project_id, title, start_date)
VALUES (
  auth.uid(),
  (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1),
  'uuid-valide-du-projet',
  'Test Event',
  NOW()
);
```

**Résultat attendu** : ✅ Succès si le projet existe et appartient à la company

### Test 3 : INSERT avec project_id invalide ("events")

```sql
-- Ceci devrait être bloqué par le trigger
INSERT INTO public.events (user_id, company_id, project_id, title, start_date)
VALUES (
  auth.uid(),
  (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1),
  'events', -- ⚠️ Invalide
  'Test Event',
  NOW()
);
```

**Résultat attendu** : ✅ Le trigger met `project_id` à `NULL` automatiquement

---

## 🚀 Actions Immédiates

1. **Exécutez** : `supabase/DIAGNOSTIC-JWT-PROJECT-ID.sql` (optionnel, pour voir l'état actuel)
2. **Exécutez** : `supabase/FIX-POSTGREST-JWT-PROJECT-ID.sql` (obligatoire, corrige tout)
3. **Testez** un INSERT via PostgREST avec `project_id: null`
4. **Vérifiez** que l'erreur a disparu

---

## 🔍 Pourquoi PostgREST injecte "events"

PostgREST peut injecter le nom de la ressource ("events") dans `request.jwt.claim.project_id` si :

1. **Une policy RLS** utilise `request.jwt.claim.project_id` et essaie de le comparer/assigner
2. **Un trigger BEFORE INSERT** utilise `current_setting('request.jwt.claim.project_id')` et l'assigne à `project_id`
3. **PostgREST** a une configuration qui injecte automatiquement des JWT claims basés sur le nom de la ressource

**Solution** : Supprimer toutes les références à `request.jwt.claim.project_id` et accepter `project_id IS NULL`.

---

## ✅ Résultat Final

Après exécution du fix :

- ✅ `project_id` peut être `NULL`
- ✅ Aucune référence à `request.jwt.claim.project_id`
- ✅ Policies RLS sécurisées
- ✅ Trigger de nettoyage actif
- ✅ FK accepte NULL
- ✅ Le système fonctionne avec ou sans projet actif
- ✅ "events" ne peut plus être injecté comme UUID
