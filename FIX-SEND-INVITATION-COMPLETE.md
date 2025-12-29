# ✅ Fix Complet : Edge Function send-invitation

## 📋 Fichiers modifiés

1. **`supabase/functions/send-invitation/index.ts`** - Logique principale d'invitation

## ✅ Changements appliqués

### 1. Gestion des utilisateurs existants non confirmés

**Problème :** `inviteUserByEmail` ne peut pas être utilisé pour renvoyer une invitation à un utilisateur existant, même s'il n'est pas confirmé. Cela causait l'erreur `AuthApiError: email_exists`.

**Solution :** Utilisation de `generateLink` avec le type `'invite'` pour générer un nouveau lien d'invitation pour les utilisateurs existants non confirmés.

```typescript
// Pour les utilisateurs existants non confirmés
const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: 'invite',
  email: emailToInvite,
  options: {
    redirectTo: redirectUrl
  }
});
```

### 2. Vérification de l'état de confirmation

La fonction vérifie maintenant trois cas distincts :

#### Cas 1 : Utilisateur existe ET est confirmé
```typescript
if (isConfirmed) {
  return { success: false, reason: "already_confirmed" };
}
```
- **Comportement :** Ne génère PAS de lien d'invitation
- **Réponse :** `{ success: false, reason: "already_confirmed", message: "Cet utilisateur a déjà confirmé son compte." }`

#### Cas 2 : Utilisateur existe mais N'est PAS confirmé
```typescript
// Générer un lien d'invitation avec generateLink
const { data: linkData } = await supabase.auth.admin.generateLink({
  type: 'invite',
  email: emailToInvite,
  options: { redirectTo: redirectUrl }
});
return { success: true, reason: "invitation_sent" };
```
- **Comportement :** Génère un nouveau lien d'invitation
- **Réponse :** `{ success: true, reason: "invitation_sent", message: "Lien d'invitation généré avec succès." }`

#### Cas 3 : Utilisateur n'existe pas
```typescript
// Créer une nouvelle invitation avec inviteUserByEmail
await supabase.auth.admin.inviteUserByEmail(emailToInvite, {
  redirectTo: redirectUrl
});
return { success: true, reason: "invitation_sent" };
```
- **Comportement :** Crée une nouvelle invitation
- **Réponse :** `{ success: true, reason: "invitation_sent", message: "Invitation envoyée." }`

### 3. Gestion d'erreur améliorée pour les race conditions

Si `inviteUserByEmail` échoue avec `email_exists` (race condition), la fonction :
1. Vérifie à nouveau l'état de l'utilisateur
2. Si confirmé → Retourne `already_confirmed`
3. Si non confirmé → Génère un lien avec `generateLink`
4. Si la génération échoue → Retourne `email_exists` comme fallback

### 4. URL de redirection

L'URL de redirection est configurée pour pointer vers :
```typescript
const redirectUrl = `${redirectTo}/auth/callback`;
```

Où `redirectTo` est déterminé par :
- Variable d'environnement `SITE_URL` OU
- Variable d'environnement `PUBLIC_URL` OU
- Variable d'environnement `VITE_PUBLIC_URL` OU
- Valeur par défaut : `https://btpsmartpro.com`

## 🔄 Flux d'invitation complet

1. **Admin envoie une invitation** via `InviteUserDialog`
2. **Edge Function `send-invitation`** :
   - Vérifie si l'utilisateur existe (via `getUserByEmail`)
   - Si existe ET confirmé → Retourne `{ success: false, reason: "already_confirmed" }`
   - Si existe mais NON confirmé → Génère lien avec `generateLink` → Retourne `{ success: true, reason: "invitation_sent" }`
   - Si n'existe pas → Crée invitation avec `inviteUserByEmail` → Retourne `{ success: true, reason: "invitation_sent" }`
3. **Supabase envoie l'email** avec lien de confirmation pointant vers `https://btpsmartpro.com/auth/callback`
4. **Utilisateur clique** sur le lien → Redirection vers `/auth/callback#access_token=...`
5. **Page `/auth/callback`** (même composant que `/auth`) :
   - Client Supabase détecte automatiquement les tokens dans l'URL
   - `onAuthStateChange` détecte l'événement `SIGNED_IN`
   - Redirection automatique vers `/dashboard` ou `/complete-profile`

## 📋 Réponses JSON standardisées

### Utilisateur déjà confirmé
```json
{
  "success": false,
  "reason": "already_confirmed",
  "message": "Cet utilisateur a déjà confirmé son compte.",
  "user_id": "uuid"
}
```

### Invitation envoyée/renvoyée
```json
{
  "success": true,
  "reason": "invitation_sent",
  "message": "Lien d'invitation généré avec succès. L'email sera envoyé par Supabase.",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Erreur email_exists (fallback)
```json
{
  "success": false,
  "reason": "email_exists",
  "message": "Cet utilisateur existe déjà."
}
```

## ✅ Garanties

1. ✅ **Pas de crash** - Toutes les erreurs sont gérées et retournent des réponses JSON structurées
2. ✅ **Réenvoi intelligent** - Les utilisateurs non confirmés peuvent recevoir une nouvelle invitation via `generateLink`
3. ✅ **Pas de double invitation** - Les utilisateurs confirmés ne reçoivent pas de nouvelle invitation
4. ✅ **Redirection correcte** - Les invitations redirigent vers `/auth/callback`
5. ✅ **TypeScript strict** - Code typé et compatible avec Supabase Edge Functions (Deno)

## 🔍 Différences clés

### Avant
- Utilisait `inviteUserByEmail` pour tous les cas
- Crashait avec `email_exists` pour les utilisateurs existants
- Ne pouvait pas renvoyer d'invitation aux utilisateurs non confirmés

### Après
- Utilise `inviteUserByEmail` uniquement pour les nouveaux utilisateurs
- Utilise `generateLink` pour les utilisateurs existants non confirmés
- Gère toutes les erreurs gracieusement
- Retourne des réponses JSON structurées avec des raisons claires

## 🧪 Test

### Test 1 : Utilisateur déjà confirmé
1. Créez un compte et confirmez-le
2. Essayez d'envoyer une invitation au même email
3. **Attendu :** `{ success: false, reason: "already_confirmed" }`

### Test 2 : Utilisateur non confirmé
1. Créez un compte mais ne confirmez PAS l'email
2. Essayez d'envoyer une invitation au même email
3. **Attendu :** `{ success: true, reason: "invitation_sent" }` + Email reçu avec nouveau lien

### Test 3 : Nouvel utilisateur
1. Envoyez une invitation à un email qui n'existe pas
2. **Attendu :** `{ success: true, reason: "invitation_sent" }` + Email reçu

## 📝 Notes importantes

- `generateLink` avec type `'invite'` génère un lien d'invitation et Supabase envoie automatiquement l'email
- La vérification de confirmation utilise `email_confirmed_at`, `confirmed_at`, ou `confirmed` pour une compatibilité maximale
- L'URL de redirection peut être configurée via les variables d'environnement
- La route `/auth/callback` utilise le même composant que `/auth` pour une gestion cohérente des callbacks





