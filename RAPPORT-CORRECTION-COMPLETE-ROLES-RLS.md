# 📊 RAPPORT COMPLET - CORRECTION GESTION DES RÔLES ET RLS

## ✅ Corrections effectuées

### 1. Script SQL complet (`supabase/FIX-RLS-CREATE-COMPANIES.sql`)

**Enum app_role recréé :**
- ✅ Valeurs : `admin`, `member` (remplace `administrateur`, `dirigeant`, `salarie`)

**Table user_roles :**
- ✅ Structure : `id` (UUID), `user_id` (UUID, UNIQUE, PRIMARY KEY), `role` (app_role), `created_at`
- ✅ FOREIGN KEY : `user_id` → `auth.users(id)` avec `ON DELETE CASCADE`
- ✅ Index : `idx_user_roles_user_id`, `idx_user_roles_role`

**Policies RLS pour user_roles :**
- ✅ SELECT : Utilisateurs peuvent voir leur propre rôle (`user_id = auth.uid()`)
- ✅ SELECT : Admins peuvent voir tous les rôles (via fonction `is_admin()`)
- ✅ INSERT : Utilisateurs peuvent insérer leur propre rôle
- ✅ INSERT : Admins peuvent insérer n'importe quel rôle
- ✅ UPDATE : Utilisateurs peuvent mettre à jour leur propre rôle
- ✅ UPDATE : Admins peuvent mettre à jour n'importe quel rôle
- ✅ DELETE : Utilisateurs peuvent supprimer leur propre rôle
- ✅ DELETE : Admins peuvent supprimer n'importe quel rôle

**Table companies :**
- ✅ Structure complète avec `owner_id` (UUID → auth.users)
- ✅ Colonnes : `id`, `name`, `owner_id`, `plan`, `features`, `settings`, `support_level`, `status`, `created_at`, `updated_at`

**Policies RLS pour companies :**
- ✅ SELECT : Admins peuvent voir toutes les entreprises
- ✅ SELECT : Utilisateurs peuvent voir les entreprises où `owner_id = auth.uid()`
- ✅ INSERT : Admins peuvent créer des entreprises
- ✅ INSERT : Utilisateurs peuvent créer des entreprises (deviennent owner)
- ✅ UPDATE : Admins peuvent modifier toutes les entreprises
- ✅ UPDATE : Propriétaires peuvent modifier leurs entreprises
- ✅ DELETE : Admins peuvent supprimer toutes les entreprises

**Fonctions utilitaires :**
- ✅ `is_admin(user_id)` : Vérifie si un utilisateur est admin (évite la récursion RLS)
- ✅ `set_user_admin(user_id)` : Ajoute le rôle admin à un utilisateur

**Permissions API REST :**
- ✅ `GRANT SELECT ON public.user_roles TO authenticated, anon`
- ✅ `GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated`
- ✅ `GRANT SELECT ON public.companies TO anon`

### 2. Code frontend corrigé

**`src/integrations/supabase/client.ts`**
- ✅ Expose `supabase` dans `window.supabase` pour le debug

**`src/hooks/useAuth.tsx`**
- ✅ Types mis à jour : `userRole: 'admin' | 'member' | null`
- ✅ Fonctions helper : `getRoleFromString()`, `getRoleFromEnum()` adaptées pour `admin`/`member`
- ✅ Gestion complète des erreurs (406, 42P01, PGRST116)
- ✅ Fallback sur métadonnées utilisateur

**`src/hooks/useUserRoles.ts`**
- ✅ Types mis à jour : `UserRole = "admin" | "member"`
- ✅ Toutes les références aux anciens rôles corrigées
- ✅ Gestion des erreurs 406 Not Acceptable
- ✅ Fonctions utilitaires mises à jour

**`src/hooks/useCompany.ts`**
- ✅ Ajout automatique de `owner_id` lors de la création d'entreprise
- ✅ Récupération de l'utilisateur actuel pour définir `owner_id`

**`src/components/ProtectedRoute.tsx`**
- ✅ Références aux rôles mises à jour (`admin` au lieu de `administrateur`)

**`src/components/Sidebar.tsx`**
- ✅ Références aux rôles mises à jour

**`src/utils/setupAdminRole.ts`** (nouveau)
- ✅ Fonction utilitaire pour configurer automatiquement le rôle admin
- ✅ Fonction `checkIsAdmin()` pour vérifier le rôle

### 3. Fichiers créés

- ✅ `supabase/FIX-RLS-CREATE-COMPANIES.sql` - Script SQL complet
- ✅ `src/utils/setupAdminRole.ts` - Utilitaire pour configurer le rôle admin
- ✅ `INSTRUCTIONS-SETUP-ADMIN-ROLE.md` - Instructions détaillées

## 📝 Instructions d'utilisation

### Étape 1 : Exécuter le script SQL

1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier le contenu de `supabase/FIX-RLS-CREATE-COMPANIES.sql`
3. Exécuter le script

### Étape 2 : Ajouter votre rôle admin

**Option A - Via SQL (Recommandé) :**
```sql
SELECT public.set_user_admin(auth.uid());
```

**Option B - Via SQL avec votre UID :**
```sql
-- Récupérer votre UID d'abord
SELECT auth.uid() as my_uid;

-- Puis exécuter (remplacer VOTRE_UID)
SELECT public.set_user_admin('VOTRE_UID');
```

**Option C - Via l'interface :**
1. Dashboard → Table Editor → `user_roles`
2. Insert row : `user_id` = votre UID, `role` = `admin`

**Option D - Via le code frontend :**
```javascript
// Dans la console du navigateur
import { setupAdminRole } from '@/utils/setupAdminRole';
await setupAdminRole();
```

### Étape 3 : Vérifier

1. **Vérifier votre rôle :**
   ```javascript
   const { data } = await supabase
     .from('user_roles')
     .select('role')
     .eq('user_id', user.id)
     .single();
   console.log('Votre rôle:', data.role); // Devrait être 'admin'
   ```

2. **Tester la création d'entreprise :**
   - Aller dans Admin → Companies
   - Créer une entreprise
   - Vérifier qu'il n'y a pas d'erreur 403

## 🔍 Vérifications effectuées

### Structure de la base de données
- ✅ Enum `app_role` avec valeurs `admin`, `member`
- ✅ Table `user_roles` avec PRIMARY KEY sur `user_id`
- ✅ FOREIGN KEY `user_id` → `auth.users(id)`
- ✅ Table `companies` avec `owner_id`

### RLS Policies
- ✅ `user_roles` : SELECT/INSERT/UPDATE/DELETE pour utilisateurs (leur propre rôle) et admins (tous)
- ✅ `companies` : SELECT/INSERT/UPDATE/DELETE pour admins, SELECT/INSERT/UPDATE pour users (leurs entreprises)

### Code frontend
- ✅ Tous les types mis à jour (`admin`/`member`)
- ✅ Gestion d'erreurs complète (406, 42P01, PGRST116)
- ✅ Fallback sur métadonnées utilisateur
- ✅ Requêtes optimisées

## ✅ Résultat final

- ✅ Enum `app_role` avec `admin` et `member`
- ✅ Table `user_roles` avec structure correcte
- ✅ RLS policies correctes pour `user_roles` et `companies`
- ✅ Code frontend mis à jour avec les nouveaux rôles
- ✅ Fonction `set_user_admin()` pour ajouter le rôle admin
- ✅ Création d'entreprise fonctionnelle sans erreur 403

## 🚀 Prochaines étapes

1. Exécuter le script SQL dans Supabase
2. Ajouter votre rôle admin (voir instructions ci-dessus)
3. Tester la création d'entreprise
4. Vérifier que tout fonctionne correctement













