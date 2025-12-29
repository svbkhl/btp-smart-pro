# 🧪 Guide : Tester l'insertion d'événements

## ⚠️ Pourquoi `supabase.rpc('sql', ...)` ne fonctionne pas

La méthode `supabase.rpc('sql', ...)` **n'existe pas** dans le client Supabase JavaScript. Vous ne pouvez pas exécuter du SQL arbitraire depuis le client.

## ✅ Solution en 3 étapes

### Étape 1 : Configurer les politiques RLS dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor**
4. Ouvrez le fichier `supabase/FIX-EVENTS-RLS-TEST.sql`
5. Copiez tout le contenu et collez-le dans l'éditeur SQL
6. Cliquez sur **Run**

**Ce que fait ce script :**
- ✅ Active RLS sur la table `events`
- ✅ Crée une politique INSERT qui autorise les utilisateurs authentifiés
- ✅ Crée un trigger qui définit automatiquement `user_id` si non fourni
- ✅ Crée les politiques SELECT, UPDATE, DELETE

### Étape 2 : Tester l'insertion depuis l'application

Le code frontend dans `src/hooks/useEvents.ts` est déjà corrigé et ajoute automatiquement le `user_id`.

**Testez dans votre application :**
1. Connectez-vous
2. Créez un nouvel événement
3. L'événement devrait être créé sans erreur 403

### Étape 3 : Tester avec un script (optionnel)

Si vous voulez tester depuis un script Node.js :

```bash
# Configurer les variables d'environnement
export VITE_SUPABASE_URL="https://renmjmqlmafqjzldmsgs.supabase.co"
export VITE_SUPABASE_ANON_KEY="votre_clé_anon"

# Exécuter le script de test
npx tsx scripts/test-insert-event.ts
# ou
node scripts/test-insert-event.js
```

**Note :** Pour que le script fonctionne, vous devez d'abord vous connecter via l'application web pour obtenir un token de session.

## 🔒 Sécurité de la politique

La politique créée est **sécurisée** :

```sql
CREATE POLICY "Allow authenticated users to insert events"
ON public.events FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL  -- L'utilisateur doit être authentifié
  AND (
    user_id = auth.uid()  -- Soit user_id correspond à l'utilisateur
    OR user_id IS NULL    -- Soit user_id sera défini par le trigger
  )
);
```

**Le trigger** définit automatiquement `user_id = auth.uid()` si non fourni, ce qui garantit que chaque événement appartient à l'utilisateur qui le crée.

## 🐛 Dépannage

### Erreur 403 persiste

1. **Vérifiez que le script SQL a été exécuté** :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'events';
   ```

2. **Vérifiez que RLS est activé** :
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'events';
   ```

3. **Vérifiez les logs dans la console du navigateur** :
   - Vous devriez voir `🔍 [useCreateEvent] Insertion événement:`
   - Vérifiez que `user_id` est présent

### Le trigger ne fonctionne pas

Si le trigger ne définit pas automatiquement `user_id`, vérifiez qu'il existe :

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'events';
```

Vous devriez voir `trigger_set_event_user_id`.

## 📝 Code frontend (déjà corrigé)

Le hook `useCreateEvent` ajoute automatiquement le `user_id` :

```typescript
const cleanData: any = {
  user_id: user.id, // ✅ Ajouté automatiquement
  // ... autres champs
};
```

Même si vous oubliez d'inclure `user_id`, le trigger le définira automatiquement.





