# 🔧 Résolution : Table Notifications Manquante

## 🎯 Problème

Erreur : "relation public.notifications doesn't exist"

La table `notifications` est utilisée dans l'application mais n'existe pas dans la base de données.

## ✅ Solution Automatique

### Étape 1 : Exécuter le Script SQL

1. **Ouvrez Supabase Dashboard** :
   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Allez dans SQL Editor** (💬 dans le menu)

3. **Cliquez sur "New query"**

4. **Ouvrez le fichier** : `supabase/CREATE-NOTIFICATIONS-TABLE.sql`

5. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)

6. **Collez dans SQL Editor** (Cmd+V)

7. **Cliquez sur "Run"** (ou Cmd+Enter)

8. **Vérifiez le résultat** :
   - `column_count: 9`
   - `policy_count: 5`

**Si vous voyez ça, c'est parfait ! ✅**

---

## 🔍 Vérifications

### Vérifier que la Table Existe

1. **Allez dans Table Editor** dans Supabase Dashboard
2. **Vérifiez** que la table `notifications` existe
3. **Vérifiez** qu'elle a 9 colonnes :
   - `id` (UUID)
   - `user_id` (UUID)
   - `title` (TEXT)
   - `message` (TEXT)
   - `type` (TEXT)
   - `related_table` (TEXT)
   - `related_id` (UUID)
   - `is_read` (BOOLEAN)
   - `created_at` (TIMESTAMP)
   - `read_at` (TIMESTAMP)

### Vérifier les Politiques RLS

1. **Dans Table Editor → notifications → Policies**
2. **Vérifiez** que 5 politiques existent :
   - ✅ "Users can view their own notifications" (SELECT)
   - ✅ "Users can update their own notifications" (UPDATE)
   - ✅ "Users can insert their own notifications" (INSERT)
   - ✅ "Users can delete their own notifications" (DELETE)
   - ✅ "Service can create notifications" (INSERT)

---

## 🧪 Test

### Test 1 : Vérifier la Table

Dans **SQL Editor**, exécutez :
```sql
SELECT * FROM public.notifications LIMIT 1;
```

Vous ne devriez pas avoir d'erreur.

### Test 2 : Tester les Notifications

1. **Rechargez l'application** (F5 ou Cmd+R)
2. **Allez dans l'application**
3. **Vérifiez** que l'icône de notifications apparaît dans la sidebar
4. **Cliquez sur l'icône** de notifications
5. **Vérifiez** que la liste des notifications s'affiche (même si elle est vide)

---

## 📊 Structure de la Table

La table `notifications` contient :
- **id** : Identifiant unique
- **user_id** : ID de l'utilisateur
- **title** : Titre de la notification
- **message** : Message de la notification
- **type** : Type (info, warning, urgent, success, error)
- **related_table** : Table liée (projects, clients, etc.)
- **related_id** : ID de l'élément lié
- **is_read** : Notification lue ou non
- **created_at** : Date de création
- **read_at** : Date de lecture

---

## 🆘 Si le Problème Persiste

### Erreur : "relation public.notifications doesn't exist"

**Solution** :
1. Vérifiez que le script SQL s'est exécuté sans erreur
2. Ré-exécutez `supabase/CREATE-NOTIFICATIONS-TABLE.sql`
3. Vérifiez que la table existe dans Table Editor

### Erreur : "permission denied"

**Solution** :
1. Vérifiez que les politiques RLS sont créées
2. Ré-exécutez le script SQL
3. Vérifiez que vous êtes connecté dans l'application

### Les notifications ne s'affichent pas

**Solution** :
1. Vérifiez que la table existe
2. Vérifiez que les politiques RLS sont créées
3. Vérifiez que vous êtes connecté
4. Vérifiez la console du navigateur (F12) pour les erreurs

---

## ✅ Checklist

- [ ] La table `notifications` existe
- [ ] La table a 9 colonnes
- [ ] Les 5 politiques RLS existent
- [ ] Vous êtes connecté dans l'application
- [ ] L'icône de notifications apparaît dans la sidebar
- [ ] Aucune erreur dans la console

---

## 🎯 Prochaine Étape

Après avoir exécuté le script SQL :

1. **Rechargez l'application**
2. **Vérifiez** que l'icône de notifications apparaît
3. **Testez** en créant un projet (cela devrait créer une notification)

---

**Exécutez `supabase/CREATE-NOTIFICATIONS-TABLE.sql` et testez !** 🚀

