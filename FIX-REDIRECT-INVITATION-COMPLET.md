# ✅ Fix complet : Redirection des invitations Supabase

## 📋 Fichiers modifiés

### 1. `supabase/functions/send-invitation/index.ts`

## ✅ Changements appliqués

### Ajout du paramètre `redirectTo` dans `inviteUserByEmail`

**Avant :**
```typescript
const { data, error } = await supabase.auth.admin.inviteUserByEmail(emailToInvite);
```

**Après :**
```typescript
// Configuration de l'URL de redirection pour l'email d'invitation
const redirectTo = Deno.env.get("SITE_URL") || 
                   Deno.env.get("PUBLIC_URL") || 
                   Deno.env.get("VITE_PUBLIC_URL") ||
                   "https://btpsmartpro.com";

// URL complète de redirection après confirmation d'email
const redirectUrl = `${redirectTo}/auth`;

console.log("🚀 Calling inviteUserByEmail for:", emailToInvite);
console.log("🔗 Redirect URL:", redirectUrl);

const { data, error } = await supabase.auth.admin.inviteUserByEmail(emailToInvite, {
  redirectTo: redirectUrl
});
```

## 🔄 Flux d'invitation complet

1. **Admin envoie une invitation** via `InviteUserDialog`
2. **Edge Function `send-invitation`** :
   - Vérifie si l'utilisateur existe déjà (via `getUserByEmail`)
   - Si nouveau → Appelle `inviteUserByEmail(email, { redirectTo: "https://btpsmartpro.com/auth" })`
3. **Supabase envoie l'email** avec un lien de confirmation
4. **Utilisateur clique** sur le lien dans l'email
5. **Redirection vers** `https://btpsmartpro.com/auth#access_token=...&refresh_token=...&type=invite`
6. **Client Supabase** (`src/integrations/supabase/client.ts`) détecte automatiquement les tokens dans l'URL
7. **Page `/auth`** :
   - `onAuthStateChange` détecte l'événement `SIGNED_IN`
   - Redirige automatiquement vers `/dashboard` ou `/complete-profile`

## 📋 Configuration Supabase Dashboard (À FAIRE)

### 1. Authentication → URL Configuration

1. Allez dans **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL** : `https://btpsmartpro.com`
3. **Redirect URLs** : Ajoutez (si pas déjà présent) :
   ```
   https://btpsmartpro.com/**
   https://btpsmartpro.com/auth
   https://btpsmartpro.com/dashboard
   https://btpsmartpro.com/complete-profile
   ```

### 2. Variables d'environnement Edge Function (Optionnel)

Dans **Supabase Dashboard** → **Edge Functions** → **Secrets**, vous pouvez ajouter :
- `SITE_URL` = `https://btpsmartpro.com`
- OU `PUBLIC_URL` = `https://btpsmartpro.com`
- OU `VITE_PUBLIC_URL` = `https://btpsmartpro.com`

**Note :** Si aucune variable n'est définie, le code utilise `https://btpsmartpro.com` par défaut.

## ✅ Garanties

1. ✅ **Redirection correcte** - Les invitations redirigent vers `https://btpsmartpro.com/auth`
2. ✅ **Gestion automatique** - Le client Supabase gère automatiquement les tokens dans l'URL
3. ✅ **Navigation automatique** - `onAuthStateChange` redirige vers `/dashboard` ou `/complete-profile`
4. ✅ **Configuration flexible** - Utilise les variables d'environnement ou la valeur par défaut
5. ✅ **Pas de route supplémentaire** - Utilise la route `/auth` existante

## 🧪 Test

1. **Envoyez une invitation** à un nouvel email
2. **Vérifiez l'email reçu** - Le lien devrait pointer vers `https://btpsmartpro.com/auth?token=...`
3. **Cliquez sur le lien** de confirmation
4. **Vous devriez être redirigé** vers `https://btpsmartpro.com/auth` avec les tokens dans l'URL
5. **Après authentification automatique** → Redirection vers `/dashboard` ou `/complete-profile`

## 🔍 Vérification

Pour vérifier que tout fonctionne :
1. Ouvrez la console du navigateur
2. Envoyez une invitation
3. Cliquez sur le lien dans l'email
4. Vérifiez dans la console que :
   - L'URL contient `#access_token=...` ou `?token=...`
   - `onAuthStateChange` est déclenché avec l'événement `SIGNED_IN`
   - La redirection vers `/dashboard` ou `/complete-profile` fonctionne





