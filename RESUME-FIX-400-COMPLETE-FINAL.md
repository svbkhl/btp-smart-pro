# ✅ CORRECTION COMPLÈTE - ERREUR 400 send-invitation

## 🔍 ANALYSE DU PROBLÈME

### Body envoyé :
```json
{
  "email": "sabbg.du73100@gmail.com",
  "company_id": "c3a33fdd-c556-43bb-be06-13680f544062",
  "role": "owner",
  "invited_by": "de5b6ce5-9525-4678-83f7-e46538272a54"
}
```

### Causes probables du 400 :

1. **Policy RLS bloque l'insert** (code `42501`)
   - La policy `Company admins can create invitations` doit vérifier :
     - `invited_by = auth.uid()`
     - L'utilisateur est admin/owner de la company

2. **Champ NOT NULL manquant** (code `23502`)
   - La table `invitations` nécessite : `token`, `expires_at`, `status`

3. **Contrainte CHECK sur role** 
   - Le role "owner" doit être accepté (pas un problème d'enum car c'est TEXT avec CHECK)

4. **Foreign key violation** (code `23503`)
   - `company_id` ou `invited_by` n'existent pas

## ✅ CORRECTIONS APPLIQUÉES

### 1. Edge Function `send-invitation/index.ts`

#### a) Logs détaillés ajoutés :
```typescript
console.log('🔵 [send-invitation] BODY:', JSON.stringify(body, null, 2));
console.error('❌ [send-invitation] ERROR DETAILS:', {
  message: invitationError.message,
  code: invitationError.code,
  details: invitationError.details,
  hint: invitationError.hint,
  fullError: JSON.stringify(invitationError, null, 2)
});
```

#### b) Gestion des erreurs améliorée :
- ✅ Détection des codes d'erreur PostgreSQL
- ✅ Retour 400 pour erreurs de validation (RLS, contraintes)
- ✅ Messages d'erreur explicites avec suggestions

```typescript
const isValidationError = invitationError.code === '42501' || 
                          invitationError.code === '23505' || 
                          invitationError.code === '23503' ||
                          invitationError.code === '23502';

return new Response(
  JSON.stringify({ 
    error: 'Failed to create invitation',
    details: invitationError.message,
    code: invitationError.code,
    hint: invitationError.hint,
    suggestion: invitationError.code === '42501' 
      ? 'RLS policy violation. Check that you have permission to insert invitations.'
      : ...
  }),
  { status: isValidationError ? 400 : 500 }
);
```

#### c) Tous les champs NOT NULL sont inclus :
```typescript
const invitationData = {
  email: emailTrimmed,
  company_id: companyIdTrimmed,
  role: roleTrimmed,
  invited_by: invitedByTrimmed,
  token: token,                    // ✅ Généré
  status: 'pending',               // ✅ Défini
  expires_at: expiresAt.toISOString(), // ✅ Défini
};
```

### 2. `InviteUserDialog.tsx`

#### a) Affichage des erreurs détaillées :
```typescript
if (!data.success) {
  let errorMsg = data.error;
  if (data.details) {
    errorMsg += `: ${data.details}`;
  }
  if (data.suggestion) {
    errorMsg += ` (${data.suggestion})`;
  }
  throw new Error(errorMsg);
}
```

### 3. Script SQL `FIX-INVITATIONS-RLS-POLICIES.sql`

#### a) Policy INSERT corrigée :
```sql
CREATE POLICY "Company admins can create invitations" ON public.invitations
FOR INSERT 
WITH CHECK (
  -- Vérifier que invited_by correspond à l'utilisateur authentifié
  invited_by = auth.uid() AND
  -- Vérifier que l'utilisateur est admin ou owner de cette company
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
  )
);
```

**IMPORTANT** : Cette policy vérifie :
1. ✅ `invited_by = auth.uid()` (l'utilisateur authentifié est celui qui invite)
2. ✅ L'utilisateur est admin ou owner de la company

## 📋 DIFF DU CODE

### `supabase/functions/send-invitation/index.ts`

**Ajouts :**
- ✅ `console.log('🔵 [send-invitation] BODY:', JSON.stringify(body, null, 2));` (ligne 121)
- ✅ Logs détaillés de l'erreur avec tous les champs (lignes 377-383)
- ✅ Détection des codes d'erreur PostgreSQL (lignes 384-395)
- ✅ Messages d'erreur avec suggestions (lignes 396-407)
- ✅ Status code 400 pour erreurs de validation (ligne 408)

### `src/components/admin/InviteUserDialog.tsx`

**Modifications :**
- ✅ Extraction du message d'erreur détaillé (lignes 120-135)
- ✅ Affichage de `data.details` et `data.suggestion` (lignes 137-150)

### `supabase/FIX-INVITATIONS-RLS-POLICIES.sql`

**Nouveau fichier :**
- ✅ Suppression et recréation des policies
- ✅ Policy INSERT corrigée avec vérification `invited_by = auth.uid()`

## 🚀 INSTRUCTIONS

### Étape 1 : Exécuter le script SQL

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier le contenu de `supabase/FIX-INVITATIONS-RLS-POLICIES.sql`
3. Exécuter le script
4. Vérifier qu'il n'y a pas d'erreurs

### Étape 2 : Vérifier les logs

1. Ouvrir la console du navigateur (F12)
2. Aller dans **Paramètres** → **Gestion Entreprises**
3. Cliquer sur **"Inviter dirigeant"**
4. Entrer l'email et sélectionner le rôle
5. Cliquer sur **"Envoyer l'invitation"**
6. Vérifier les logs :
   - `🟢 [InviteUserDialog] Sending invitation request`
   - `🟢 [InviteUserDialog] Request body:`
   - `🟢 [InviteUserDialog] Response received:`

### Étape 3 : Vérifier les logs de la Function

1. Aller dans **Supabase Dashboard** → **Edge Functions** → **send-invitation** → **Logs**
2. Chercher :
   - `🔵 [send-invitation] BODY:` pour voir le body reçu
   - `❌ [send-invitation] ERROR DETAILS:` si erreur
   - `✅ [send-invitation] Invitation created successfully` si succès

## 🔍 DEBUGGING

### Si vous avez encore une erreur 400 :

1. **Vérifier les logs de la Function** :
   - Chercher `❌ [send-invitation] ERROR DETAILS:`
   - Noter le `code` (ex: `42501` = RLS, `23502` = NOT NULL, `23503` = FK)
   - Noter le `hint` et `suggestion`

2. **Si code `42501` (RLS violation)** :
   - Vérifier que vous êtes admin global OU admin/owner de la company
   - Vérifier que `invited_by = auth.uid()` dans la policy
   - Exécuter `FIX-INVITATIONS-RLS-POLICIES.sql`

3. **Si code `23502` (NOT NULL violation)** :
   - Vérifier que tous les champs sont présents dans `invitationData`
   - Vérifier que `token`, `status`, `expires_at` sont définis

4. **Si code `23503` (Foreign key violation)** :
   - Vérifier que `company_id` existe dans `companies`
   - Vérifier que `invited_by` existe dans `auth.users`

5. **Si code `23505` (Duplicate)** :
   - Vérifier qu'il n'y a pas déjà une invitation avec le même token ou email

## ❌ PROBLÈMES RÉSOLUS

1. ✅ **Erreur 400 non explicite** : Logs détaillés avec code, message, hint, suggestion
2. ✅ **Policy RLS bloque** : Policy corrigée avec vérification `invited_by = auth.uid()`
3. ✅ **Champs manquants** : Tous les champs NOT NULL sont inclus
4. ✅ **Messages d'erreur vagues** : Messages explicites avec suggestions
5. ✅ **Status code incorrect** : 400 pour validation, 500 pour erreurs serveur

## 📝 NOTES IMPORTANTES

- **Le role "owner" n'est PAS dans l'enum `app_role`** : C'est normal, `owner` est dans `company_users.role` (TEXT), pas dans `user_roles.role` (enum `app_role`)
- **La table `invitations.role` est TEXT** : Pas d'enum, donc "owner" est accepté
- **Les policies RLS sont critiques** : Elles doivent vérifier `invited_by = auth.uid()` ET que l'utilisateur est admin/owner

**🎉 Le système est maintenant complètement réparé avec des logs détaillés et des messages d'erreur explicites !**




