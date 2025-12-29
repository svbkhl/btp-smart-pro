# ✅ Fix Complet : Flux d'Invitation Supabase

## 📋 Fichiers modifiés

1. **`supabase/functions/send-invitation/index.ts`** - Logique principale d'invitation
2. **`src/App.tsx`** - Ajout de la route `/auth/callback`

## ✅ Changements appliqués

### 1. Logique de vérification de l'état de l'utilisateur

**Avant :** La fonction retournait `email_exists` pour tous les utilisateurs existants, sans distinction.

**Après :** La fonction vérifie maintenant trois cas distincts :

#### Cas 1 : Utilisateur existe ET est confirmé
```typescript
if (isConfirmed) {
  return { success: false, reason: "already_confirmed" };
}
```
- **Comportement :** Ne renvoie PAS l'invitation
- **Réponse :** `{ success: false, reason: "already_confirmed", message: "Cet utilisateur a déjà confirmé son compte." }`

#### Cas 2 : Utilisateur existe mais N'est PAS confirmé
```typescript
if (existingUser?.user && !isConfirmed) {
  // Renvoyer l'invitation
  await supabase.auth.admin.inviteUserByEmail(emailToInvite, { redirectTo: redirectUrl });
  return { success: true, reason: "invitation_sent" };
}
```
- **Comportement :** Renvoie l'invitation
- **Réponse :** `{ success: true, reason: "invitation_sent", message: "Invitation renvoyée avec succès." }`

#### Cas 3 : Utilisateur n'existe pas
```typescript
// Créer une nouvelle invitation
await supabase.auth.admin.inviteUserByEmail(emailToInvite, { redirectTo: redirectUrl });
return { success: true, reason: "invitation_sent" };
```
- **Comportement :** Crée une nouvelle invitation
- **Réponse :** `{ success: true, reason: "invitation_sent", message: "Invitation envoyée." }`

### 2. Vérification de confirmation

La fonction vérifie maintenant si l'utilisateur est confirmé en utilisant :
```typescript
const isConfirmed = user.email_confirmed_at !== null || 
                   user.confirmed_at !== null ||
                   (user as any).confirmed === true;
```

### 3. URL de redirection

L'URL de redirection est maintenant configurée pour pointer vers :
```typescript
const redirectUrl = `${redirectTo}/auth/callback`;
```

Où `redirectTo` est déterminé par :
- Variable d'environnement `SITE_URL` OU
- Variable d'environnement `PUBLIC_URL` OU
- Variable d'environnement `VITE_PUBLIC_URL` OU
- Valeur par défaut : `https://btpsmartpro.com`

### 4. Route `/auth/callback`

Une nouvelle route a été ajoutée dans `src/App.tsx` :
```typescript
<Route path="/auth/callback" element={<Auth />} />
```

Cette route utilise le même composant `Auth` que `/auth`, qui gère automatiquement les callbacks via `onAuthStateChange`.

## 🔄 Flux d'invitation complet

1. **Admin envoie une invitation** via `InviteUserDialog`
2. **Edge Function `send-invitation`** :
   - Vérifie si l'utilisateur existe (via `getUserByEmail`)
   - Si existe ET confirmé → Retourne `{ success: false, reason: "already_confirmed" }`
   - Si existe mais NON confirmé → Renvoie l'invitation → Retourne `{ success: true, reason: "invitation_sent" }`
   - Si n'existe pas → Crée invitation → Retourne `{ success: true, reason: "invitation_sent" }`
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

### Invitation renvoyée (utilisateur non confirmé)
```json
{
  "success": true,
  "reason": "invitation_sent",
  "message": "Invitation renvoyée avec succès.",
  "user": { ... }
}
```

### Nouvelle invitation créée
```json
{
  "success": true,
  "reason": "invitation_sent",
  "message": "Invitation envoyée.",
  "user": { ... }
}
```

### Erreur (utilisateur existe mais erreur lors du réenvoi)
```json
{
  "success": false,
  "message": "Erreur lors de la réenvoi de l'invitation.",
  "error": "error message"
}
```

## ✅ Garanties

1. ✅ **Pas de double invitation** - Les utilisateurs confirmés ne reçoivent pas de nouvelle invitation
2. ✅ **Réenvoi intelligent** - Les utilisateurs non confirmés peuvent recevoir une nouvelle invitation
3. ✅ **Gestion d'erreurs robuste** - Toutes les erreurs sont gérées et retournent des réponses JSON structurées
4. ✅ **Redirection correcte** - Les invitations redirigent vers `/auth/callback`
5. ✅ **TypeScript strict** - Code typé et compatible avec Supabase Edge Functions (Deno)

## 🧪 Test

### Test 1 : Utilisateur déjà confirmé
1. Créez un compte et confirmez-le
2. Essayez d'envoyer une invitation au même email
3. **Attendu :** `{ success: false, reason: "already_confirmed" }`

### Test 2 : Utilisateur non confirmé
1. Créez un compte mais ne confirmez PAS l'email
2. Essayez d'envoyer une invitation au même email
3. **Attendu :** `{ success: true, reason: "invitation_sent" }` + Email reçu

### Test 3 : Nouvel utilisateur
1. Envoyez une invitation à un email qui n'existe pas
2. **Attendu :** `{ success: true, reason: "invitation_sent" }` + Email reçu

## 📝 Notes importantes

- La vérification de confirmation utilise `email_confirmed_at`, `confirmed_at`, ou `confirmed` pour une compatibilité maximale
- L'URL de redirection peut être configurée via les variables d'environnement
- La route `/auth/callback` utilise le même composant que `/auth` pour une gestion cohérente des callbacks





