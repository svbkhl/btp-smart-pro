# 🚨 INSTRUCTIONS URGENTES : Fix erreur 403 sur les événements

## ❌ Pourquoi le code JavaScript ne fonctionne pas

Le code que vous avez fourni utilise `supabase.rpc('sql', ...)` qui **n'existe pas** dans le client Supabase JavaScript. Vous ne pouvez pas exécuter du SQL arbitraire depuis le client pour des raisons de sécurité.

## ✅ SOLUTION : Exécuter le script SQL dans Supabase

### 📋 Étapes à suivre (5 minutes)

1. **Ouvrez votre dashboard Supabase** :
   - Allez sur : https://supabase.com/dashboard
   - Connectez-vous si nécessaire

2. **Sélectionnez votre projet** :
   - Cliquez sur le projet correspondant à `renmjmqlmafqjzldmsgs.supabase.co`

3. **Ouvrez l'éditeur SQL** :
   - Dans le menu de gauche, cliquez sur **"SQL Editor"**
   - Ou allez directement sur : https://supabase.com/dashboard/project/YOUR_PROJECT/sql

4. **Ouvrez le fichier SQL** :
   - Dans votre projet local, ouvrez : `supabase/FIX-EVENTS-RLS-FINAL.sql`
   - **Copiez TOUT le contenu** du fichier (Cmd+A puis Cmd+C)

5. **Collez dans l'éditeur SQL** :
   - Collez le contenu dans l'éditeur SQL de Supabase
   - Cliquez sur le bouton **"Run"** (ou appuyez sur `Cmd+Enter` / `Ctrl+Enter`)

6. **Vérifiez le résultat** :
   - Vous devriez voir "Success. No rows returned"
   - Si vous voyez des erreurs, copiez-les et envoyez-les-moi

7. **Vérifiez que ça a fonctionné** :
   - Dans l'éditeur SQL, exécutez cette requête :
   ```sql
   SELECT policyname, cmd, with_check
   FROM pg_policies 
   WHERE tablename = 'events';
   ```
   - Vous devriez voir 4 politiques créées

8. **Testez dans votre application** :
   - Rechargez complètement votre application (Ctrl+Shift+R)
   - Créez un nouvel événement
   - L'erreur 403 devrait être résolue

## 🔍 Ce que fait le script

1. ✅ **Active RLS** sur la table `events`
2. ✅ **Supprime toutes les anciennes politiques** (pour éviter les conflits)
3. ✅ **Crée un trigger** qui définit automatiquement `user_id = auth.uid()` lors de chaque insertion
4. ✅ **Crée une politique INSERT** qui autorise tous les inserts pour les utilisateurs authentifiés
5. ✅ **Crée les politiques SELECT, UPDATE, DELETE** pour la sécurité

## 🔒 Sécurité

Le trigger garantit que :
- ✅ Chaque événement créé appartient automatiquement à l'utilisateur qui le crée
- ✅ Même si le frontend oublie de fournir `user_id`, il sera défini automatiquement
- ✅ Un utilisateur ne peut pas créer d'événement pour un autre utilisateur

## 🐛 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs dans la console du navigateur** :
   - Ouvrez la console (F12)
   - Créez un événement
   - Vous devriez voir : `🔍 [useCreateEvent] Insertion événement:`
   - Vérifiez que `user_id` et `auth_uid` sont présents et identiques

2. **Vérifiez que vous êtes connecté** :
   - Le `user` doit exister dans `useAuth()`
   - Si vous n'êtes pas connecté, connectez-vous d'abord

3. **Vérifiez que le script SQL a été exécuté** :
   - Dans l'éditeur SQL de Supabase, exécutez :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'events';
   ```
   - Vous devriez voir 4 politiques

4. **Vérifiez le trigger** :
   ```sql
   SELECT * FROM information_schema.triggers WHERE event_object_table = 'events';
   ```
   - Vous devriez voir `trigger_set_event_user_id`

5. **Videz le cache du navigateur** :
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

## 📝 Note importante

Le code frontend dans `src/hooks/useEvents.ts` est **déjà correct** et ajoute automatiquement le `user_id`. Le problème vient uniquement des politiques RLS dans la base de données qui doivent être recréées avec le script SQL.

**Vous DEVEZ exécuter le script SQL dans Supabase. Il n'y a pas d'autre solution.**





