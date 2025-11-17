# 🔧 Guide Complet : Résolution des Erreurs de Permissions Notifications

## 🎯 Problème

**Erreur** : "Erreur de permissions. Vérifiez que les politiques RLS sont configurées."

Cette erreur apparaît lorsque :
- Les politiques RLS (Row Level Security) ne sont pas configurées correctement
- Les politiques RLS n'existent pas
- Les politiques RLS sont mal configurées
- RLS n'est pas activé sur la table `notifications`

---

## ✅ Solution Automatique

### Étape 1 : Exécuter le Script de Correction

1. **Ouvrez Supabase Dashboard** → https://supabase.com/dashboard
2. **Sélectionnez votre projet** (`renmjmqlmafqjzldmsgs`)
3. **Allez dans SQL Editor** (menu de gauche)
4. **Ouvrez** : `supabase/FIX-PERMISSIONS-NOTIFICATIONS.sql`
5. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
6. **Collez dans SQL Editor** (Cmd+V)
7. **Cliquez sur "Run"** (Cmd+Enter ou bouton "Run")
8. **Vérifiez le résultat** :
   - `column_count: 9` ✅
   - `rls_enabled: true` ✅
   - `policy_count: 4` ✅

**Si vous voyez ces résultats, c'est parfait ! ✅**

---

## 🔍 Vérifications Détaillées

### Vérifier les Politiques RLS

1. **Allez dans Supabase Dashboard → Table Editor → notifications → Policies**
2. **Vérifiez** que 4 politiques existent :
   - ✅ "Users can view their own notifications" (SELECT)
   - ✅ "Users can insert their own notifications" (INSERT)
   - ✅ "Users can update their own notifications" (UPDATE)
   - ✅ "Users can delete their own notifications" (DELETE)

### Vérifier que RLS est Activé

1. **Dans Table Editor → notifications → Settings**
2. **Vérifiez** que "Row Level Security" est activé (toggle ON)

### Vérifier la Table

1. **Dans Table Editor → notifications**
2. **Vérifiez** que la table existe et contient les colonnes :
   - `id` (UUID)
   - `user_id` (UUID)
   - `title` (TEXT)
   - `message` (TEXT)
   - `type` (TEXT)
   - `is_read` (BOOLEAN)
   - `created_at` (TIMESTAMP)
   - `read_at` (TIMESTAMP)
   - `related_table` (TEXT, nullable)
   - `related_id` (UUID, nullable)

---

## 🧪 Tests

### Test 1 : Vérifier les Politiques (SQL)

Dans **SQL Editor**, exécutez :
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications';
```

**Résultat attendu** : 4 lignes (une pour chaque politique)

### Test 2 : Vérifier RLS (SQL)

Dans **SQL Editor**, exécutez :
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'notifications';
```

**Résultat attendu** : `rowsecurity: true`

### Test 3 : Tester dans l'Application

1. **Rechargez l'application** (F5 ou Cmd+R)
2. **Connectez-vous** si nécessaire
3. **Cliquez sur l'icône de notifications** (🔔)
4. **Vérifiez** que la liste s'affiche sans erreur

### Test 4 : Créer une Notification de Test

Dans **SQL Editor**, exécutez :
```sql
-- 1. Récupérez votre user_id
SELECT id, email FROM auth.users;

-- 2. Remplacez YOUR_USER_ID par votre user_id et exécutez :
INSERT INTO public.notifications (user_id, title, message, type)
VALUES (
  'YOUR_USER_ID'::UUID,
  'Test de notification',
  'Ceci est un test de notification',
  'info'
);
```

**Ensuite** :
1. **Rechargez l'application**
2. **Cliquez sur l'icône de notifications**
3. **Vérifiez** que la notification apparaît
4. **Cliquez sur le bouton "Marquer comme lu"**
5. **Vérifiez** que la notification est marquée comme lue

---

## 🆘 Résolution des Problèmes

### Problème 1 : "permission denied"

**Cause** : Les politiques RLS ne permettent pas l'opération.

**Solution** :
1. Vérifiez que vous êtes connecté dans l'application
2. Vérifiez que les 4 politiques RLS existent
3. Ré-exécutez `FIX-PERMISSIONS-NOTIFICATIONS.sql`
4. Vérifiez que `auth.uid() = user_id` dans les politiques

### Problème 2 : "new row violates row-level security policy"

**Cause** : La politique INSERT ne permet pas la création.

**Solution** :
1. Vérifiez que la politique INSERT existe
2. Vérifiez que vous utilisez votre propre `user_id`
3. Vérifiez que `WITH CHECK (auth.uid() = user_id)` est présent
4. Ré-exécutez le script de correction

### Problème 3 : Les notifications ne s'affichent pas

**Cause** : La politique SELECT ne fonctionne pas.

**Solution** :
1. Vérifiez que la politique SELECT existe
2. Vérifiez que vous êtes connecté
3. Vérifiez la console du navigateur (F12) pour les erreurs
4. Vérifiez que `USING (auth.uid() = user_id)` est présent

### Problème 4 : Impossible de marquer comme lu

**Cause** : La politique UPDATE ne fonctionne pas.

**Solution** :
1. Vérifiez que la politique UPDATE existe
2. Vérifiez que `USING (auth.uid() = user_id)` et `WITH CHECK (auth.uid() = user_id)` sont présents
3. Ré-exécutez le script de correction

### Problème 5 : La table n'existe pas

**Cause** : La table `notifications` n'a pas été créée.

**Solution** :
1. Exécutez d'abord `CRÉER-NOTIFICATIONS-MINIMAL.sql`
2. Ensuite exécutez `FIX-PERMISSIONS-NOTIFICATIONS.sql`

---

## 📊 Structure des Politiques RLS

Les politiques RLS vérifient que :
- `auth.uid() = user_id`
- Cela garantit que chaque utilisateur ne peut voir/modifier que ses propres notifications

### Politique SELECT
```sql
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### Politique INSERT
```sql
CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### Politique UPDATE
```sql
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Politique DELETE
```sql
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

---

## 🔐 Fonction create_notification()

La fonction `create_notification()` utilise `SECURITY DEFINER`, ce qui permet :
- Aux triggers de créer des notifications automatiquement
- De créer des notifications pour n'importe quel utilisateur
- De contourner les politiques RLS lors de la création via les triggers

**Cette fonction est utilisée par** :
- Les triggers sur `projects` (nouveau projet, projet en retard, changement de statut)
- Les triggers sur `clients` (nouveau client)
- Les triggers sur `events` (nouvel événement, rappel)

---

## ✅ Checklist de Vérification

- [ ] La table `notifications` existe
- [ ] RLS est activé sur la table
- [ ] Les 4 politiques RLS existent (SELECT, INSERT, UPDATE, DELETE)
- [ ] La fonction `create_notification()` existe
- [ ] Vous êtes connecté dans l'application
- [ ] Aucune erreur dans la console du navigateur (F12)
- [ ] Les notifications s'affichent dans l'application
- [ ] Vous pouvez marquer une notification comme lue
- [ ] Vous pouvez marquer toutes les notifications comme lues

---

## 🎯 Prochaines Étapes

Après avoir résolu le problème :

1. **Testez les notifications automatiques** :
   - Créez un nouveau projet → une notification devrait apparaître
   - Créez un nouveau client → une notification devrait apparaître
   - Changez le statut d'un projet → une notification devrait apparaître

2. **Vérifiez les triggers** :
   - Vérifiez que les triggers existent dans `CREATE-EMAIL-SYSTEM.sql`
   - Vérifiez que les triggers sont actifs

3. **Testez les notifications en temps réel** :
   - Ouvrez deux onglets de l'application
   - Créez une notification dans un onglet
   - Vérifiez qu'elle apparaît automatiquement dans l'autre onglet

---

## 📚 Ressources

- **Script de correction** : `supabase/FIX-PERMISSIONS-NOTIFICATIONS.sql`
- **Script de création** : `supabase/CRÉER-NOTIFICATIONS-MINIMAL.sql`
- **Guide rapide** : `RESOLUTION-PERMISSIONS-NOTIFICATIONS.md`
- **Documentation Supabase RLS** : https://supabase.com/docs/guides/auth/row-level-security

---

**Exécutez `supabase/FIX-PERMISSIONS-NOTIFICATIONS.sql` et testez !** 🚀

