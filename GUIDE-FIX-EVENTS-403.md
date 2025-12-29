# 🔧 Guide : Corriger l'erreur 403 sur les événements

## ❌ Pourquoi `supabase.rpc('sql', ...)` ne fonctionne pas

La méthode `supabase.rpc('sql', ...)` **n'existe pas** dans le client Supabase JavaScript. Vous ne pouvez pas exécuter du SQL arbitraire depuis le client pour des raisons de sécurité.

## ✅ Solution recommandée : Utiliser l'éditeur SQL de Supabase

### Étape 1 : Ouvrir l'éditeur SQL

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2 : Exécuter le script

1. Ouvrez le fichier `supabase/FIX-EVENTS-RLS-SECURE.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **Run** (ou appuyez sur `Cmd+Enter` / `Ctrl+Enter`)

### Étape 3 : Vérifier

Exécutez cette requête pour vérifier que les politiques sont créées :

```sql
SELECT schemaname, tablename, policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'events';
```

Vous devriez voir 4 politiques :
- `Users can view their own events` (SELECT)
- `Users can insert their own events` (INSERT)
- `Users can update their own events` (UPDATE)
- `Users can delete their own events` (DELETE)

## 🔒 Sécurité de la politique INSERT

La politique que j'ai créée est **sécurisée** :

```sql
CREATE POLICY "Users can insert their own events"
ON public.events FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL        -- L'utilisateur doit être authentifié
  AND auth.uid() = user_id      -- Le user_id doit correspondre à l'utilisateur connecté
);
```

Cela empêche :
- ❌ Les utilisateurs non authentifiés de créer des événements
- ❌ Un utilisateur de créer des événements pour un autre utilisateur

## 📝 Code frontend (déjà corrigé)

Le code dans `src/hooks/useEvents.ts` ajoute automatiquement le `user_id` :

```typescript
const cleanData: any = {
  user_id: user.id, // ✅ Ajouté automatiquement
  // ... autres champs
};
```

## 🧪 Tester

1. Rechargez votre application
2. Créez un nouvel événement
3. L'erreur 403 devrait être résolue

## 🐛 Si le problème persiste

1. **Vérifiez les logs dans la console** :
   - Vous devriez voir `🔍 [useCreateEvent] Insertion événement:` avec le `user_id`
   - Vérifiez que `user_id` et `auth_uid` sont identiques

2. **Vérifiez que vous êtes connecté** :
   - Le `user` doit exister dans `useAuth()`

3. **Vérifiez les politiques RLS** :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'events';
   ```

4. **Vérifiez que RLS est activé** :
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'events';
   ```
   Le champ `rowsecurity` doit être `true`.





