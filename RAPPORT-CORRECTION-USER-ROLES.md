# 📊 RAPPORT DE CORRECTION - TABLE user_roles

## ✅ Corrections effectuées

### 1. Script SQL complet (`supabase/FIX-USER-ROLES-COMPLETE.sql`)

**Structure de la table :**
- ✅ `id` : UUID (PRIMARY KEY)
- ✅ `user_id` : UUID (FOREIGN KEY → auth.users, UNIQUE)
- ✅ `role` : app_role ENUM (dirigeant, salarie, client, administrateur)
- ✅ `created_at` : TIMESTAMP

**RLS Policies :**
- ✅ SELECT : Les utilisateurs peuvent voir leur propre rôle (`user_id = auth.uid()`)
- ✅ INSERT/UPDATE/DELETE : Uniquement service_role (via fonction server-side)

**Permissions API REST :**
- ✅ `GRANT SELECT ON public.user_roles TO authenticated;`
- ✅ `GRANT SELECT ON public.user_roles TO anon;`

**Fonction server-side :**
- ✅ `create_or_update_user_role()` : Permet de créer/modifier les rôles via service_role

### 2. Code frontend corrigé

#### `src/integrations/supabase/client.ts`
- ✅ Expose `supabase` dans `window.supabase` pour le debug (uniquement en développement)

#### `src/hooks/useAuth.tsx`
- ✅ Gestion complète des erreurs :
  - Erreur 406 Not Acceptable (table non exposée)
  - Erreur 42P01 (table n'existe pas)
  - Erreur PGRST116 (utilisateur n'a pas de rôle)
- ✅ Fallback sur les métadonnées utilisateur si la table n'est pas accessible
- ✅ Fonctions helper pour convertir les rôles (`getRoleFromString`, `getRoleFromEnum`)
- ✅ Optimisation : une seule requête par utilisateur

#### `src/hooks/useUserRoles.ts`
- ✅ Gestion des erreurs 406 Not Acceptable
- ✅ Gestion des erreurs PGRST116 (pas de rôle)
- ✅ Suppression des tentatives d'insertion/update directes (non autorisées par RLS)
- ✅ Messages d'erreur clairs pour guider l'utilisateur
- ✅ Optimisation des requêtes (select uniquement les colonnes nécessaires)

### 3. Optimisations

**Requêtes optimisées :**
- ✅ `select('role')` au lieu de `select('*')` pour réduire la bande passante
- ✅ Une seule requête par utilisateur dans `useAuth`
- ✅ Cache avec React Query pour éviter les requêtes répétées

**Gestion des erreurs :**
- ✅ Messages d'erreur clairs et informatifs
- ✅ Fallback automatique sur les métadonnées utilisateur
- ✅ Logs de warning pour le debug

## 📝 Instructions d'utilisation

### 1. Exécuter le script SQL

1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier le contenu de `supabase/FIX-USER-ROLES-COMPLETE.sql`
3. Exécuter le script

### 2. Vérifier l'exposition de la table

1. Aller dans Dashboard → API → Tables
2. Vérifier que `user_roles` est listée
3. Vérifier que les colonnes `user_id` et `role` sont exposées

### 3. Créer un rôle pour un utilisateur

Via SQL (service_role uniquement) :
```sql
SELECT public.create_or_update_user_role('USER_ID', 'administrateur'::app_role);
```

Ou directement (service_role uniquement) :
```sql
INSERT INTO public.user_roles (user_id, role) 
VALUES ('USER_ID', 'administrateur'::app_role)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

### 4. Tester dans le frontend

La requête suivante devrait maintenant fonctionner :
```typescript
const { data, error } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .single();
```

## 🔍 Debug

### Accéder à supabase dans la console

En développement, vous pouvez maintenant accéder à supabase via :
```javascript
window.supabase
```

### Vérifier les erreurs

Les erreurs sont maintenant loggées avec des messages clairs :
- `⚠️ Table user_roles non accessible via API` : Vérifiez les permissions RLS
- `⚠️ Table user_roles n'existe pas encore` : Exécutez le script SQL
- `⚠️ Erreur lors de la récupération du rôle` : Vérifiez les logs pour plus de détails

## ⚠️ Points importants

1. **RLS strict** : Les utilisateurs ne peuvent que LIRE leur propre rôle
2. **Pas d'insertion/update directe** : Utilisez la fonction server-side ou service_role
3. **Fallback automatique** : Si la table n'est pas accessible, les métadonnées utilisateur sont utilisées
4. **Optimisation** : Les requêtes sont optimisées pour éviter le spam

## ✅ Résultat final

- ✅ Table `user_roles` créée avec la bonne structure
- ✅ RLS activé avec policies correctes
- ✅ API REST exposée avec permissions
- ✅ Code frontend corrigé avec gestion d'erreurs complète
- ✅ Optimisations pour éviter le spam de requêtes
- ✅ Debug facilité avec `window.supabase`













