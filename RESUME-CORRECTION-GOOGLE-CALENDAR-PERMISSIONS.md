# 📋 Résumé : Correction permissions Google Calendar

## 🎯 Problème initial

Le patron invité avec le rôle "owner" ne pouvait pas configurer Google Calendar car le `role_id` n'était pas correctement assigné dans `company_users`. Le système utilisait l'ancienne colonne `role` (TEXT) au lieu de `role_id` (UUID FK vers `roles`).

## ✅ Corrections complètes appliquées

### 1. Edge Function `send-invitation` ✅
**Fichier** : `supabase/functions/send-invitation/index.ts`

**Corrections** :
- ✅ Récupération du `role_id` depuis la table `roles` avec le slug correspondant
- ✅ Mapping : `dirigeant` → `owner`, `administrateur` → `admin`, `salarie` → `employee`
- ✅ Utilisation de `role_id` au lieu de `role` dans les insertions/upserts de `company_users`
- ✅ Correction appliquée pour **nouveaux utilisateurs** ET **utilisateurs existants**

**Lignes modifiées** :
- Ligne ~390-451 : Nouveaux utilisateurs (via `inviteUserByEmail`)
- Ligne ~1042-1134 : Utilisateurs existants (via `handleExistingUser`)

### 2. Fonction SQL `accept_invitation` ✅
**Fichier** : `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql`

**Corrections** :
- ✅ Utilisation de `role_id` au lieu de `role` dans `company_users`
- ✅ Priorité : `role_id` de l'invitation si disponible, sinon lookup depuis `roles` par slug
- ✅ Mapping correct : `owner` → `owner`, `admin` → `admin`, `member` → `employee`

### 3. Composant `GoogleCalendarConnection` ✅
**Fichier** : `src/components/GoogleCalendarConnection.tsx`

**Améliorations** :
- ✅ Affichage du statut Google Calendar même si l'utilisateur n'a pas les permissions
- ✅ Message informatif : "Google Calendar est déjà configuré" avec l'email du compte
- ✅ Distinction entre "connecté" et "configuré mais désactivé"

### 4. Scripts SQL de correction ✅

**Script 1** : `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql`
- Corrige les utilisateurs existants avec `role_id` NULL
- Récupère le rôle depuis `user_roles`
- Met à jour `company_users` avec le bon `role_id`

**Script 2** : `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql`
- Corrige la fonction SQL `accept_invitation`
- À exécuter dans Supabase Dashboard → SQL Editor

## 🚀 Actions de déploiement

### Étape 1 : Redéployer l'Edge Function (OBLIGATOIRE)

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy send-invitation
```

### Étape 2 : Corriger la fonction SQL (OBLIGATOIRE)

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Exécutez : `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql`

### Étape 3 : Corriger les utilisateurs existants (RECOMMANDÉ)

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Exécutez : `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql`

## 🧪 Tests à effectuer

### Test 1 : Nouvel utilisateur invité
1. Créer une entreprise
2. Inviter un utilisateur avec le rôle "owner"
3. L'utilisateur accepte l'invitation
4. ✅ Vérifier que `company_users.role_id` correspond au slug "owner"
5. ✅ Vérifier que le bouton "Connecter Google Calendar" est visible
6. ✅ Tester la connexion Google Calendar

### Test 2 : Utilisateur existant
1. Exécuter le script de correction SQL
2. ✅ Vérifier que les `role_id` sont correctement mis à jour
3. ✅ Vérifier que les permissions Google Calendar fonctionnent

### Test 3 : Affichage statut
1. Se connecter avec un utilisateur sans permissions (employee)
2. ✅ Vérifier que le statut Google Calendar est affiché si configuré
3. ✅ Vérifier le message "Google Calendar est déjà configuré"

## 📊 Vérification SQL

Pour vérifier que tout est correct, exécutez cette requête :

```sql
SELECT 
  cu.company_id,
  cu.user_id,
  cu.role_id,
  r.slug as role_slug,
  r.name as role_name,
  ur.role as user_role,
  CASE 
    WHEN cu.role_id IS NULL THEN '❌ role_id NULL'
    WHEN r.slug IS NULL THEN '❌ role_id invalide'
    ELSE '✅ OK'
  END as status
FROM public.company_users cu
LEFT JOIN public.roles r ON r.id = cu.role_id
LEFT JOIN public.user_roles ur ON ur.user_id = cu.user_id
ORDER BY cu.company_id, cu.user_id;
```

**Résultat attendu** : Tous les utilisateurs doivent avoir `status = '✅ OK'`

## 📁 Fichiers modifiés

### Code source
- ✅ `supabase/functions/send-invitation/index.ts` (2 corrections)
- ✅ `src/components/GoogleCalendarConnection.tsx` (affichage statut)

### Scripts SQL
- ✅ `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql` (nouveau)
- ✅ `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql` (nouveau)

### Documentation
- ✅ `DEPLOY-FIX-GOOGLE-CALENDAR-PERMISSIONS.md` (nouveau)
- ✅ `RESUME-CORRECTION-GOOGLE-CALENDAR-PERMISSIONS.md` (ce fichier)

## 🎯 Résultat final

Après déploiement et exécution des scripts SQL :

- ✅ Les nouveaux utilisateurs invités avec le rôle "owner" ont le bon `role_id`
- ✅ Les utilisateurs existants peuvent être corrigés avec le script SQL
- ✅ La fonction `accept_invitation` utilise correctement `role_id`
- ✅ Le bouton Google Calendar est visible pour les owners et admins
- ✅ Le statut Google Calendar est affiché même sans permissions
- ✅ Tous les utilisateurs peuvent voir si Google Calendar est configuré

## ⚠️ Important

1. **Redéployer l'Edge Function** est OBLIGATOIRE pour que les nouvelles invitations fonctionnent
2. **Exécuter le script SQL** `FIX-ACCEPT-INVITATION-ROLE-ID.sql` est OBLIGATOIRE pour que les acceptations d'invitations fonctionnent
3. **Exécuter le script de correction** pour les utilisateurs existants est RECOMMANDÉ mais optionnel

## 🔍 Dépannage

### Le bouton Google Calendar n'apparaît toujours pas

1. Vérifier que `role_id` est correct dans `company_users` :
   ```sql
   SELECT cu.*, r.slug 
   FROM company_users cu 
   LEFT JOIN roles r ON r.id = cu.role_id 
   WHERE cu.user_id = 'VOTRE_USER_ID';
   ```

2. Vérifier que le slug est bien "owner" ou "admin"

3. Vider le cache du navigateur et se reconnecter

4. Vérifier les logs de l'Edge Function `send-invitation` dans Supabase Dashboard

### Erreur lors de l'exécution du script SQL

- Vérifier que la table `roles` existe et contient les slugs "owner", "admin", "employee"
- Vérifier que la colonne `role_id` existe dans `company_users`
- Vérifier les permissions RLS
