# 🔍 Debug : Écran Blanc lors de la Création de Projet

## 🎯 Problème

L'écran devient blanc quand vous cliquez sur "Créer votre premier projet".

## 🔧 Causes Possibles

1. **Table `projects` n'existe pas**
2. **RLS policies mal configurées**
3. **Erreur JavaScript non gérée**
4. **Problème avec les données envoyées**

## 📋 Étapes de Diagnostic

### Étape 1 : Vérifier la Console (F12)

1. **Ouvrez la console du navigateur** (F12)
2. **Cliquez sur "Créer votre premier projet"**
3. **Regardez les erreurs** dans la console

**Erreurs courantes** :
- `relation "public.projects" does not exist` → Table n'existe pas
- `new row violates row-level security policy` → RLS mal configuré
- `permission denied for table projects` → Permissions manquantes

### Étape 2 : Vérifier la Table dans Supabase

1. **Ouvrez Supabase Dashboard** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Allez dans Table Editor**
3. **Vérifiez** si la table `projects` existe

**Si la table n'existe pas** :
- Exécutez `supabase/APPLY-MIGRATION.sql` dans SQL Editor

### Étape 3 : Exécuter le Script de Vérification

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Ouvrez** `supabase/VERIFIER-TABLE-PROJECTS.sql`
3. **Copiez-collez** le contenu
4. **Cliquez sur "Run"**
5. **Vérifiez** les résultats

**Résultat attendu** :
- ✅ Table existe
- ✅ 14 colonnes (id, user_id, client_id, name, status, progress, budget, location, start_date, end_date, description, image_url, created_at, updated_at)
- ✅ 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ RLS activé

### Étape 4 : Vérifier les RLS Policies

1. **Allez dans Authentication → Policies**
2. **Vérifiez** que les policies pour `projects` existent :
   - `Users can view their own projects` (SELECT)
   - `Users can create their own projects` (INSERT)
   - `Users can update their own projects` (UPDATE)
   - `Users can delete their own projects` (DELETE)

**Si les policies n'existent pas** :
- Exécutez `supabase/APPLY-MIGRATION.sql` dans SQL Editor

## 🔧 Solutions

### Solution 1 : Créer la Table

Si la table n'existe pas :

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Ouvrez** `supabase/APPLY-MIGRATION.sql`
3. **Copiez-collez** le contenu
4. **Cliquez sur "Run"**
5. **Vérifiez** que la table est créée

### Solution 2 : Vérifier les RLS Policies

Si les policies sont manquantes :

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Exécutez** cette requête :

```sql
-- Vérifier les policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'projects';
```

**Si aucune policy n'existe** :
- Exécutez `supabase/APPLY-MIGRATION.sql` dans SQL Editor

### Solution 3 : Vérifier les Logs

1. **Ouvrez Supabase Dashboard → Logs**
2. **Filtrez** par "Database"
3. **Regardez** les erreurs récentes

## 🧪 Test Rapide

### Test 1 : Créer un Projet Directement dans Supabase

1. **Ouvrez Supabase Dashboard → Table Editor → projects**
2. **Cliquez sur "Insert row"**
3. **Remplissez** :
   - `name` : "Test"
   - `user_id` : Votre user_id (trouvez-le dans Authentication → Users)
   - `status` : "planifié"
   - `progress` : 0
4. **Cliquez sur "Save"**

**Si ça fonctionne** : La table existe et les RLS sont OK
**Si ça ne fonctionne pas** : Problème de RLS ou de permissions

### Test 2 : Vérifier la Console du Navigateur

1. **Ouvrez la console** (F12)
2. **Cliquez sur "Créer votre premier projet"**
3. **Regardez** les erreurs

**Erreurs courantes** :
- `Failed to fetch` → Problème de connexion à Supabase
- `relation "public.projects" does not exist` → Table n'existe pas
- `new row violates row-level security policy` → RLS mal configuré

## 📊 Checklist de Vérification

- [ ] La table `projects` existe dans Supabase
- [ ] Les RLS policies sont créées (4 policies)
- [ ] RLS est activé sur la table
- [ ] Vous êtes connecté dans l'application
- [ ] Le `.env` contient les bonnes clés Supabase
- [ ] Aucune erreur dans la console du navigateur
- [ ] Aucune erreur dans les logs Supabase

## 🆘 Si le Problème Persiste

1. **Vérifiez** les logs Supabase
2. **Vérifiez** la console du navigateur
3. **Vérifiez** que vous êtes connecté
4. **Vérifiez** que le `.env` est correct
5. **Dites-moi** ce que vous voyez dans la console et les logs

## 📄 Fichiers Utiles

- `supabase/APPLY-MIGRATION.sql` → Créer la table et les RLS
- `supabase/VERIFIER-TABLE-PROJECTS.sql` → Vérifier la table
- `src/hooks/useProjects.ts` → Hook pour créer un projet
- `src/components/ProjectForm.tsx` → Formulaire de projet

---

**Commencez par vérifier la console (F12) et dites-moi ce que vous voyez !** 🔍

