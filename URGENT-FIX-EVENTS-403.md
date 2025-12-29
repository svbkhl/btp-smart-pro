# 🚨 URGENT : Fix erreur 403 sur les événements

## ⚠️ Le problème persiste

L'erreur `403 Forbidden` avec `new row violates row-level security policy` indique que les politiques RLS ne sont pas correctement configurées dans votre base de données Supabase.

## ✅ Solution immédiate

### Étape 1 : Exécuter le script SQL (OBLIGATOIRE)

1. **Allez sur** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Cliquez sur "SQL Editor"** dans le menu de gauche
4. **Ouvrez le fichier** : `supabase/FIX-EVENTS-RLS-DEFINITIF.sql`
5. **Copiez TOUT le contenu** du fichier
6. **Collez-le dans l'éditeur SQL** de Supabase
7. **Cliquez sur "Run"** (ou `Cmd+Enter` / `Ctrl+Enter`)

### Étape 2 : Vérifier que ça a fonctionné

Après avoir exécuté le script, exécutez cette requête dans l'éditeur SQL :

```sql
SELECT schemaname, tablename, policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;
```

Vous devriez voir **4 politiques** :
- `Allow authenticated users to insert events` (INSERT)
- `Users can view their own events` (SELECT)
- `Users can update their own events` (UPDATE)
- `Users can delete their own events` (DELETE)

Vérifiez aussi le trigger :

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'events';
```

Vous devriez voir `trigger_set_event_user_id`.

### Étape 3 : Tester dans l'application

1. **Rechargez complètement** votre application (Ctrl+Shift+R ou Cmd+Shift+R)
2. **Créez un nouvel événement**
3. **L'erreur 403 devrait être résolue**

## 🔍 Ce que fait le script

1. **Active RLS** sur la table `events`
2. **Supprime toutes les anciennes politiques** pour éviter les conflits
3. **Crée un trigger** qui définit automatiquement `user_id = auth.uid()` lors de chaque insertion
4. **Crée une politique INSERT** très permissive qui autorise tous les inserts pour les utilisateurs authentifiés
5. **Crée les politiques SELECT, UPDATE, DELETE** pour la sécurité

## 🔒 Sécurité

Le trigger garantit que :
- ✅ Chaque événement créé appartient à l'utilisateur qui le crée
- ✅ Même si le frontend oublie de fournir `user_id`, il sera défini automatiquement
- ✅ Un utilisateur ne peut pas créer d'événement pour un autre utilisateur

## 🐛 Si ça ne fonctionne toujours pas

1. **Vérifiez que vous êtes connecté** :
   - Ouvrez la console du navigateur
   - Vous devriez voir les logs `🔍 [useCreateEvent] Insertion événement:`
   - Vérifiez que `user_id` et `auth_uid` sont présents et identiques

2. **Vérifiez que le script SQL a bien été exécuté** :
   - Les politiques doivent exister (voir requête ci-dessus)
   - Le trigger doit exister (voir requête ci-dessus)

3. **Videz le cache du navigateur** :
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

4. **Vérifiez les logs Supabase** :
   - Allez dans "Logs" > "Postgres Logs" dans Supabase
   - Cherchez les erreurs liées à RLS

## 📝 Note importante

Le code frontend dans `src/hooks/useEvents.ts` est **déjà correct** et ajoute automatiquement le `user_id`. Le problème vient uniquement des politiques RLS dans la base de données qui doivent être recréées.





