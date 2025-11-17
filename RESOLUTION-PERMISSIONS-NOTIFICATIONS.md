# 🔧 Résolution : Erreur de Permissions Notifications

## 🎯 Problème

Erreur : "Erreur de permissions. Vérifiez que les politiques RLS sont configurées."

## ✅ Solution Automatique

### Étape 1 : Exécuter le Script de Correction

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Ouvrez** : `supabase/FIX-PERMISSIONS-NOTIFICATIONS.sql`
3. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
4. **Collez dans SQL Editor** (Cmd+V)
5. **Cliquez sur "Run"** (Cmd+Enter)
6. **Vérifiez le résultat** :
   - `column_count: 9`
   - `rls_enabled: true`
   - `policy_count: 4`

**Si vous voyez ça, c'est parfait ! ✅**

---

## 🔍 Vérifications

### Vérifier les Politiques RLS

1. **Allez dans Supabase Dashboard → Table Editor → notifications → Policies**
2. **Vérifiez** que 4 politiques existent :
   - ✅ "Users can view their own notifications" (SELECT)
   - ✅ "Users can insert their own notifications" (INSERT)
   - ✅ "Users can update their own notifications" (UPDATE)
   - ✅ "Users can delete their own notifications" (DELETE)

### Vérifier que RLS est Activé

1. **Dans Table Editor → notifications → Settings**
2. **Vérifiez** que "Row Level Security" est activé

---

## 🧪 Test

### Test 1 : Vérifier les Politiques

Dans **SQL Editor**, exécutez :
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications';
```

Vous devriez voir **4 politiques**.

### Test 2 : Tester dans l'Application

1. **Rechargez l'application** (F5)
2. **Cliquez sur l'icône de notifications** (🔔)
3. **Vérifiez** que la liste s'affiche sans erreur

### Test 3 : Créer une Notification de Test

Dans **SQL Editor**, exécutez :
```sql
-- Remplacez YOUR_USER_ID par votre user_id
INSERT INTO public.notifications (user_id, title, message, type)
VALUES (
  'YOUR_USER_ID'::UUID,
  'Test',
  'Ceci est un test',
  'info'
);
```

**Ensuite** :
1. **Rechargez l'application**
2. **Cliquez sur l'icône de notifications**
3. **Vérifiez** que la notification apparaît

---

## 🆘 Si le Problème Persiste

### Erreur : "permission denied"

**Solution** :
1. Vérifiez que vous êtes connecté dans l'application
2. Ré-exécutez `FIX-PERMISSIONS-NOTIFICATIONS.sql`
3. Vérifiez que les 4 politiques existent

### Erreur : "new row violates row-level security policy"

**Solution** :
1. Vérifiez que la politique INSERT existe
2. Vérifiez que vous utilisez votre propre user_id
3. Ré-exécutez le script de correction

### Les notifications ne s'affichent pas

**Solution** :
1. Vérifiez que la politique SELECT existe
2. Vérifiez que vous êtes connecté
3. Vérifiez la console du navigateur (F12) pour les erreurs

---

## 📊 Structure des Politiques

Les politiques RLS vérifient que :
- `auth.uid() = user_id`
- Cela garantit que chaque utilisateur ne peut voir/modifier que ses propres notifications

---

## ✅ Checklist

- [ ] La table `notifications` existe
- [ ] RLS est activé
- [ ] Les 4 politiques RLS existent
- [ ] Vous êtes connecté dans l'application
- [ ] Aucune erreur dans la console

---

## 🎯 Prochaine Étape

Après avoir exécuté le script :

1. **Rechargez l'application**
2. **Testez les notifications**
3. **Vérifiez** que tout fonctionne

---

**Exécutez `supabase/FIX-PERMISSIONS-NOTIFICATIONS.sql` et testez !** 🚀

