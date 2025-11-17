# 🔍 Diagnostic : Table Notifications

## 🎯 Problème

Erreur : "relation public.notifications doesn't exist"

La table n'existe toujours pas après l'exécution du script.

## 🔧 Solution en 3 Étapes

### Étape 1 : Vérifier si la Table Existe

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Exécutez** : `supabase/VERIFIER-NOTIFICATIONS.sql`
3. **Regardez le résultat** :
   - Si vous voyez "❌ Table n'existe pas" → Passez à l'étape 2
   - Si vous voyez "✅ Table existe" → Le problème est ailleurs

### Étape 2 : Créer la Table (Script Simple)

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Ouvrez** : `supabase/CRÉER-NOTIFICATIONS-SIMPLE.sql`
3. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
4. **Collez dans SQL Editor** (Cmd+V)
5. **Cliquez sur "Run"** (ou Cmd+Enter)
6. **Vérifiez** :
   - `✅ Table notifications créée`
   - `column_count: 9`
   - `policy_count: 5`

### Étape 3 : Vérifier à Nouveau

1. **Ré-exécutez** : `supabase/VERIFIER-NOTIFICATIONS.sql`
2. **Vérifiez** que vous voyez maintenant "✅ Table existe"

---

## 🆘 Si le Script ne Fonctionne Pas

### Option 1 : Créer la Table Manuellement

1. **Allez dans Supabase Dashboard → Table Editor**
2. **Cliquez sur "New table"**
3. **Nom de la table** : `notifications`
4. **Ajoutez les colonnes** :
   - `id` : UUID, Primary Key, Default: `gen_random_uuid()`
   - `user_id` : UUID, Foreign Key → `auth.users(id)`
   - `title` : Text
   - `message` : Text
   - `type` : Text, Default: `'info'`
   - `related_table` : Text, Nullable
   - `related_id` : UUID, Nullable
   - `is_read` : Boolean, Default: `false`
   - `created_at` : Timestamp, Default: `now()`
   - `read_at` : Timestamp, Nullable
5. **Cliquez sur "Save"**

### Option 2 : Exécuter le Script Ligne par Ligne

Si le script complet ne fonctionne pas, essayez d'exécuter chaque partie séparément :

1. **Créez d'abord la table** :
```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  related_table TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);
```

2. **Puis activez RLS** :
```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
```

3. **Puis créez les politiques** (une par une)

---

## 🔍 Vérifications

### Vérifier dans Table Editor

1. **Allez dans Supabase Dashboard → Table Editor**
2. **Vérifiez** que la table `notifications` apparaît dans la liste
3. **Cliquez sur la table** pour voir ses colonnes

### Vérifier avec SQL

Dans **SQL Editor**, exécutez :
```sql
SELECT * FROM public.notifications LIMIT 1;
```

**Si vous ne voyez pas d'erreur**, la table existe ! ✅
**Si vous voyez une erreur**, la table n'existe pas ❌

---

## 🎯 Après la Création

1. **Rechargez l'application** (F5 ou Cmd+R)
2. **Vérifiez** que l'icône de notifications apparaît
3. **Cliquez sur l'icône** de notifications
4. **Vérifiez** que la liste s'affiche (même si vide)

---

## 📋 Checklist

- [ ] J'ai exécuté `VERIFIER-NOTIFICATIONS.sql`
- [ ] J'ai exécuté `CRÉER-NOTIFICATIONS-SIMPLE.sql`
- [ ] La table apparaît dans Table Editor
- [ ] Les 5 politiques RLS existent
- [ ] J'ai rechargé l'application
- [ ] L'icône de notifications apparaît

---

**Exécutez d'abord `VERIFIER-NOTIFICATIONS.sql` pour voir si la table existe !** 🔍

