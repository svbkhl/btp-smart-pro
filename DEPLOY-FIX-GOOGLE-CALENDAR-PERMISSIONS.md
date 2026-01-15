# 🚀 Guide de déploiement : Correction permissions Google Calendar

## 📋 Problème résolu

Le patron invité avec le rôle "owner" ne pouvait pas configurer Google Calendar car le `role_id` n'était pas correctement assigné dans `company_users`.

## ✅ Corrections appliquées

### 1. Edge Function `send-invitation`
- ✅ Correction de l'assignation `role_id` dans `company_users` (au lieu de `role`)
- ✅ Récupération du `role_id` depuis la table `roles` avec le slug correspondant
- ✅ Mapping correct : `dirigeant` → `owner`, `administrateur` → `admin`, `salarie` → `employee`
- ✅ Correction appliquée pour nouveaux utilisateurs ET utilisateurs existants

### 2. Composant `GoogleCalendarConnection`
- ✅ Affichage du statut Google Calendar même si l'utilisateur n'a pas les permissions
- ✅ Message informatif : "Google Calendar est déjà configuré" avec l'email du compte

## 🔧 Actions à effectuer

### Étape 1 : Redéployer l'Edge Function

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy send-invitation
```

### Étape 2 : Corriger la fonction SQL `accept_invitation`

La fonction SQL `accept_invitation` doit aussi être corrigée pour utiliser `role_id` :

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Exécutez le script : `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql`

Ce script corrige la fonction pour qu'elle utilise `role_id` au lieu de `role` dans `company_users`.

### Étape 3 : Corriger les utilisateurs existants (optionnel mais recommandé)

Si vous avez déjà invité des utilisateurs avant cette correction, exécutez le script SQL pour corriger leurs `role_id` :

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Exécutez le script : `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql`

Ce script :
- Identifie tous les utilisateurs avec `role_id` NULL dans `company_users`
- Récupère leur rôle depuis `user_roles`
- Met à jour `company_users` avec le bon `role_id` depuis la table `roles`

### Étape 4 : Vérifier que tout fonctionne

1. **Inviter un nouveau patron** avec le rôle "owner"
2. **Vérifier** que le patron peut voir le bouton "Connecter Google Calendar"
3. **Tester** la connexion Google Calendar

## 🧪 Test

### Test 1 : Nouvel utilisateur invité
1. Créer une entreprise
2. Inviter un utilisateur avec le rôle "owner"
3. L'utilisateur accepte l'invitation
4. Vérifier que `company_users.role_id` correspond au slug "owner"
5. Vérifier que le bouton Google Calendar est visible

### Test 2 : Utilisateur existant
1. Exécuter le script de correction SQL
2. Vérifier que les `role_id` sont correctement mis à jour
3. Vérifier que les permissions Google Calendar fonctionnent

## 📊 Vérification

Pour vérifier que tout est correct, exécutez cette requête SQL :

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

Tous les utilisateurs doivent avoir un `status = '✅ OK'`.

## 🎯 Résultat attendu

- ✅ Les nouveaux utilisateurs invités avec le rôle "owner" ont le bon `role_id`
- ✅ Les utilisateurs existants peuvent être corrigés avec le script SQL
- ✅ Le bouton Google Calendar est visible pour les owners et admins
- ✅ Le statut Google Calendar est affiché même sans permissions
