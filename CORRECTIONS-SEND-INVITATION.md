# Corrections de l'Edge Function send-invitation

## ✅ Modifications appliquées

### 1. Edge Function (`supabase/functions/send-invitation/index.ts`)

**Supprimé :**
- ✅ Vérification des permissions admin/owner (lignes 147-176)
- ✅ Utilisation de `service_role` (n'était pas utilisée, mais vérifiée)
- ✅ Vérifications de rôles dans `user_roles` et `company_users`

**Conservé :**
- ✅ Vérification simple du JWT dans les headers (lignes 74-117)
- ✅ Vérification que `invited_by` correspond à l'utilisateur authentifié
- ✅ Toutes les erreurs retournées en JSON propre

**Améliorations :**
- ✅ Messages d'erreur plus détaillés avec `details` quand disponible
- ✅ Gestion d'erreurs améliorée dans le catch final

### 2. Frontend - InviteUserDialog (`src/components/admin/InviteUserDialog.tsx`)

**Améliorations :**
- ✅ Toast de succès : `"✅ Invitation envoyée !"` avec durée de 5000ms
- ✅ Toast d'erreur : `"❌ Erreur"` avec le message exact de l'erreur
- ✅ Gestion d'erreurs améliorée pour extraire le message exact

### 3. Frontend - AdminContactRequests (`src/pages/AdminContactRequests.tsx`)

**Améliorations :**
- ✅ Ajout de `invited_by` dans le body de la requête
- ✅ Toast de succès : `"✅ Invitation envoyée !"`
- ✅ Toast d'erreur avec message exact

### 4. Configuration Supabase

**À faire manuellement dans Supabase Dashboard :**

1. Aller dans **Edge Functions** > **send-invitation**
2. Dans les **Settings** de la fonction :
   - Définir **"Invoke Function: Public"** (ou "Authenticated" si vous voulez garder la vérification JWT)
   - La fonction vérifie déjà le JWT dans le code, donc "Public" est acceptable

## 🔒 Sécurité

La fonction reste sécurisée car :
- ✅ Vérification du JWT dans les headers (ligne 74-117)
- ✅ Vérification que `invited_by` correspond à l'utilisateur authentifié (ligne 120-128)
- ✅ Validation de tous les champs requis
- ✅ Vérification que l'entreprise existe

## 📝 Notes

- La fonction n'utilise **PAS** `service_role`, seulement `anon_key` avec le JWT de l'utilisateur
- Toutes les erreurs sont retournées en JSON propre pour éviter les "FunctionsHttpError"
- Les toasts affichent immédiatement le succès ou l'erreur avec le message exact











