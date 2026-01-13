# 🔍 Explication : Pourquoi PostgREST peut injecter "events" comme UUID

## 🎯 Cause Probable Identifiée

Le problème vient probablement d'un **trigger BEFORE INSERT** qui utilise `TG_TABLE_NAME` ou `TG_RELNAME` et essaie de l'assigner à une colonne UUID.

### Scénario Typique

```sql
-- ❌ TRIGGER PROBLÉMATIQUE (exemple)
CREATE FUNCTION bad_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- ⚠️ ERREUR : TG_TABLE_NAME retourne "events" (string)
  NEW.company_id := TG_TABLE_NAME;  -- ❌ Essaie d'assigner "events" à un UUID
  RETURN NEW;
END;
$$;
```

### Pourquoi PostgREST est impliqué

PostgREST utilise des **triggers PostgreSQL** pour valider les données. Si un trigger BEFORE INSERT essaie d'assigner `TG_TABLE_NAME` (qui vaut "events") à une colonne UUID, PostgreSQL lève l'erreur.

---

## 🔍 Diagnostic SQL

Exécutez ce script pour identifier le problème :

```sql
-- Voir TOUS les triggers avec leur code source
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_code
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'events'
AND NOT t.tgisinternal;
```

**Cherchez** dans le code source :
- `TG_TABLE_NAME`
- `TG_RELNAME`
- `NEW.company_id := ...`
- `NEW.user_id := ...`
- `NEW.project_id := ...`

---

## ✅ Solution Définitive

### 1. Exécuter le Diagnostic

```sql
-- Exécutez : supabase/DIAGNOSTIC-PRECIS-EVENTS-UUID.sql
```

### 2. Exécuter le Fix

```sql
-- Exécutez : supabase/FIX-EVENTS-UUID-DEFINITIF.sql
```

Ce script :
- ✅ Désactive tous les triggers problématiques
- ✅ Supprime les triggers qui utilisent `TG_TABLE_NAME`
- ✅ Crée un trigger sécurisé sans `TG_TABLE_NAME`
- ✅ Nettoie les données corrompues

### 3. Vérifier le Schéma Final

```sql
-- Exécutez : supabase/SCHEMA-EVENTS-FINAL.sql
```

---

## 📋 Schéma Final Correct

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id), -- ⚠️ NULLABLE
  title TEXT NOT NULL,
  -- ... autres colonnes
);
```

**Points clés** :
- ✅ `project_id` est **NULLABLE** (pas de NOT NULL)
- ✅ Aucun DEFAULT sur les colonnes UUID
- ✅ Trigger de validation **sans** `TG_TABLE_NAME`
- ✅ RLS policies correctes

---

## 🔒 Pourquoi PostgREST injecte "events"

PostgREST **ne injecte pas** "events" directement. Le problème vient d'un **trigger PostgreSQL** qui :

1. Utilise `TG_TABLE_NAME` (qui retourne "events")
2. Essaie d'assigner cette valeur à une colonne UUID
3. PostgreSQL lève l'erreur lors de la conversion

**Solution** : Supprimer/corriger tous les triggers qui utilisent `TG_TABLE_NAME` ou `TG_RELNAME` pour assigner des valeurs aux colonnes UUID.

---

## 🚀 Actions Immédiates

1. **Exécutez** : `supabase/DIAGNOSTIC-PRECIS-EVENTS-UUID.sql`
2. **Analysez** les résultats (cherchez `TG_TABLE_NAME`)
3. **Exécutez** : `supabase/FIX-EVENTS-UUID-DEFINITIF.sql`
4. **Testez** un INSERT via PostgREST
5. **Vérifiez** que l'erreur a disparu
