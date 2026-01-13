# 🚀 Exécuter les Fix Events - Guide Rapide

## ⚠️ URGENT : Exécuter 2 Scripts SQL

Pour corriger définitivement l'erreur `invalid input syntax for type uuid: "events"`, vous devez exécuter **2 scripts SQL** dans l'ordre :

---

## 📋 Script 1 : FIX-EVENTS-UUID-ERROR-COMPLETE.sql

**Objectif** : Correction générale UUID + RLS + current_company_id()

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Ouvrez** : `supabase/FIX-EVENTS-UUID-ERROR-COMPLETE.sql`
3. **Copiez** tout le contenu
4. **Collez** dans l'éditeur SQL
5. **Cliquez sur** "Run"

**Ce script fait** :
- ✅ Nettoie les données corrompues
- ✅ Sécurise `current_company_id()`
- ✅ Crée `is_valid_uuid_strict()`
- ✅ Crée le trigger de validation
- ✅ Corrige les RLS policies
- ✅ Vérifie/ajoute les colonnes Google Calendar

---

## 📋 Script 2 : FIX-EVENTS-PROJECT-ID-UNDEFINED.sql

**Objectif** : Correction spécifique project_id undefined

1. **Toujours dans** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Ouvrez** : `supabase/FIX-EVENTS-PROJECT-ID-UNDEFINED.sql`
3. **Copiez** tout le contenu
4. **Collez** dans l'éditeur SQL
5. **Cliquez sur** "Run"

**Ce script fait** :
- ✅ Vérifie/rend `project_id` nullable
- ✅ Améliore le trigger pour gérer `project_id` NULL
- ✅ Bloque "events", "undefined", chaînes vides
- ✅ Nettoie les données corrompues

---

## ✅ Vérification

Après avoir exécuté les 2 scripts :

```sql
-- Vérifier qu'il n'y a plus de données corrompues
SELECT COUNT(*) 
FROM public.events 
WHERE company_id::text = 'events'
   OR user_id::text = 'events'
   OR project_id::text = 'events'
   OR project_id::text = 'undefined';
-- Résultat attendu : 0

-- Vérifier que project_id est nullable
SELECT is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
AND column_name = 'project_id';
-- Résultat attendu : YES
```

---

## 🧪 Test

1. **Allez sur** : `/calendar`
2. **Créez** un nouvel événement **sans** projet
3. **Vérifiez** que l'événement est créé avec succès
4. **Vérifiez** dans Supabase que `project_id` est `NULL`

---

## 🎯 Résultat Attendu

- ✅ Plus d'erreur "invalid input syntax for type uuid: 'events'"
- ✅ Création d'événement fonctionnelle
- ✅ Événements affichés dans le calendrier
- ✅ `project_id` peut être NULL (optionnel)
