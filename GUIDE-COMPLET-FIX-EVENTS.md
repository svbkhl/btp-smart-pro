# 🔧 Guide complet : Fix erreur 403 sur les événements

## ❌ Le problème

Erreur `403 Forbidden` avec le message `new row violates row-level security policy for table "events"` lors de la création d'un événement.

## 🔍 Cause

Les politiques RLS (Row Level Security) ne sont pas correctement configurées dans votre base de données Supabase. Même si le code frontend ajoute le `user_id`, la politique RLS bloque l'insertion.

## ✅ Solution en 2 étapes

### ÉTAPE 1 : Exécuter le script SQL dans Supabase (OBLIGATOIRE)

**⚠️ IMPORTANT : Vous DEVEZ exécuter ce script dans Supabase. Il n'y a pas d'alternative.**

1. **Allez sur** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Cliquez sur "SQL Editor"** dans le menu de gauche
4. **Ouvrez le fichier** : `supabase/FIX-EVENTS-RLS-FINAL.sql`
5. **Copiez TOUT le contenu** du fichier
6. **Collez-le dans l'éditeur SQL** de Supabase
7. **Cliquez sur "Run"** (ou `Cmd+Enter` / `Ctrl+Enter`)

**Ce que fait le script :**
- ✅ Active RLS sur la table `events`
- ✅ Supprime toutes les anciennes politiques (pour éviter les conflits)
- ✅ Crée un trigger qui définit automatiquement `user_id = auth.uid()` lors de chaque insertion
- ✅ Crée une politique INSERT qui autorise tous les inserts pour les utilisateurs authentifiés
- ✅ Crée les politiques SELECT, UPDATE, DELETE

### ÉTAPE 2 : Vérifier que ça a fonctionné

Après avoir exécuté le script, exécutez cette requête dans l'éditeur SQL :

```sql
SELECT policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;
```

Vous devriez voir **4 politiques** :
- `Allow insert for authenticated users` (INSERT)
- `Users can view their own events` (SELECT)
- `Users can update their own events` (UPDATE)
- `Users can delete their own events` (DELETE)

Vérifiez aussi le trigger :

```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'events';
```

Vous devriez voir `trigger_set_event_user_id`.

### ÉTAPE 3 : Tester dans l'application

1. **Rechargez complètement** votre application (Ctrl+Shift+R ou Cmd+Shift+R)
2. **Créez un nouvel événement**
3. **L'erreur 403 devrait être résolue**

## 📝 Code frontend (déjà corrigé)

Le code dans `src/hooks/useEvents.ts` est **déjà correct** et ajoute automatiquement le `user_id` :

```typescript
const cleanData: any = {
  user_id: user.id, // ✅ Ajouté automatiquement
  // ... autres champs
};
```

Même si vous oubliez d'inclure `user_id`, le trigger le définira automatiquement.

## 🔒 Sécurité

Le trigger garantit que :
- ✅ Chaque événement créé appartient à l'utilisateur qui le crée
- ✅ Même si le frontend oublie de fournir `user_id`, il sera défini automatiquement
- ✅ Un utilisateur ne peut pas créer d'événement pour un autre utilisateur

## 🧪 Test avec un script (optionnel)

Si vous voulez tester depuis un script Node.js :

```bash
# Configurer les variables d'environnement
export VITE_SUPABASE_URL="https://renmjmqlmafqjzldmsgs.supabase.co"
export VITE_SUPABASE_ANON_KEY="votre_clé_anon"

# Exécuter le script de test
node scripts/test-insert-event-simple.js
```

**Note :** Pour que le script fonctionne, vous devez d'abord vous connecter via l'application web pour obtenir un token de session.

## 🐛 Dépannage

### Erreur 403 persiste après avoir exécuté le script SQL

1. **Vérifiez que le script a bien été exécuté** :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'events';
   ```
   - Vous devriez voir 4 politiques

2. **Vérifiez que RLS est activé** :
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'events';
   ```
   - Le champ `rowsecurity` doit être `true`

3. **Vérifiez les logs dans la console du navigateur** :
   - Ouvrez la console (F12)
   - Créez un événement
   - Vous devriez voir : `🔍 [useCreateEvent] Insertion événement:`
   - Vérifiez que `user_id` est présent

4. **Vérifiez que vous êtes connecté** :
   - Le `user` doit exister dans `useAuth()`
   - Si vous n'êtes pas connecté, connectez-vous d'abord

5. **Videz le cache du navigateur** :
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

### Le trigger ne fonctionne pas

Si le trigger ne définit pas automatiquement `user_id`, vérifiez qu'il existe :

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'events';
```

Vous devriez voir `trigger_set_event_user_id`.

## ⚠️ Note importante

**Vous DEVEZ exécuter le script SQL dans Supabase. Il n'y a pas d'autre solution.**

Le code JavaScript ne peut pas exécuter du SQL directement. La méthode `supabase.rpc('sql', ...)` n'existe pas dans le client Supabase JavaScript.

## 📋 Résumé

1. ✅ Exécutez `supabase/FIX-EVENTS-RLS-FINAL.sql` dans l'éditeur SQL de Supabase
2. ✅ Vérifiez que les politiques sont créées
3. ✅ Rechargez votre application
4. ✅ Testez la création d'un événement

L'erreur 403 devrait être résolue après ces étapes.





