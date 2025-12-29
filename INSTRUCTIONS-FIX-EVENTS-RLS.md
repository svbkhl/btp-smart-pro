# 🔧 Instructions pour corriger l'erreur 403 sur les événements

## Problème
Erreur `403 Forbidden` avec le message `new row violates row-level security policy for table "events"` lors de la création d'un événement.

## Solution

### Étape 1 : Exécuter le script SQL dans Supabase

1. Allez sur votre dashboard Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (éditeur SQL)
4. Ouvrez le fichier `supabase/FIX-EVENTS-RLS-URGENT.sql`
5. Copiez tout le contenu du fichier
6. Collez-le dans l'éditeur SQL de Supabase
7. Cliquez sur **Run** (Exécuter)

### Étape 2 : Vérifier que le code frontend est correct

Le code dans `src/hooks/useEvents.ts` a déjà été corrigé pour :
- ✅ Ajouter automatiquement le `user_id` lors de l'insertion
- ✅ Vérifier que l'utilisateur est authentifié

### Étape 3 : Tester

1. Rechargez votre application
2. Essayez de créer un nouvel événement
3. L'événement devrait être créé sans erreur 403

## Explication

La politique RLS (Row Level Security) vérifie que :
- L'utilisateur est authentifié (`auth.uid() IS NOT NULL`)
- Le `user_id` dans les données insérées correspond à l'ID de l'utilisateur authentifié (`auth.uid() = user_id`)

Le code frontend ajoute maintenant automatiquement le `user_id` :
```typescript
const cleanData: any = {
  user_id: user.id, // ✅ Ajouté automatiquement
  // ... autres champs
};
```

## Si le problème persiste

1. Vérifiez dans la console du navigateur que le `user_id` est bien inclus dans les logs
2. Vérifiez que vous êtes bien connecté
3. Vérifiez dans Supabase SQL Editor que les politiques existent :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'events';
   ```





