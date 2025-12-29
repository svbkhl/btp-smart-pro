# ✅ Configuration : Redirection des invitations Supabase

## 🔍 Problème résolu

Les invitations Supabase redirigent maintenant vers `https://btpsmartpro.com/auth` au lieu de l'URL par défaut de Supabase.

## ✅ Modifications appliquées

### 1. Edge Function `supabase/functions/send-invitation/index.ts`

**Changement :** Ajout du paramètre `redirectTo` dans `inviteUserByEmail`

```typescript
const redirectTo = Deno.env.get("SITE_URL") || 
                   Deno.env.get("PUBLIC_URL") || 
                   Deno.env.get("VITE_PUBLIC_URL") ||
                   "https://btpsmartpro.com";

const redirectUrl = `${redirectTo}/auth`;

const { data, error } = await supabase.auth.admin.inviteUserByEmail(emailToInvite, {
  redirectTo: redirectUrl
});
```

**Pourquoi `/auth` ?**
- La page `/auth` gère déjà les callbacks via `onAuthStateChange`
- Après authentification, l'utilisateur est automatiquement redirigé vers `/dashboard` ou `/complete-profile`
- Pas besoin de créer une route `/auth/callback` séparée

## 📋 Configuration Supabase Dashboard (À FAIRE MANUELLEMENT)

### 1. Authentication → URL Configuration

1. Allez dans **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL** : `https://btpsmartpro.com`
3. **Redirect URLs** : Ajoutez :
   ```
   https://btpsmartpro.com/**
   https://btpsmartpro.com/auth
   https://btpsmartpro.com/dashboard
   https://btpsmartpro.com/complete-profile
   ```

### 2. Variables d'environnement (Optionnel mais recommandé)

Dans **Supabase Dashboard** → **Edge Functions** → **Secrets**, ajoutez :
- `SITE_URL` = `https://btpsmartpro.com`
- OU `PUBLIC_URL` = `https://btpsmartpro.com`
- OU `VITE_PUBLIC_URL` = `https://btpsmartpro.com`

Si aucune variable n'est définie, le code utilise `https://btpsmartpro.com` par défaut.

## 🔄 Flux d'invitation

1. **Admin envoie une invitation** → Edge Function `send-invitation`
2. **Edge Function vérifie** si l'utilisateur existe déjà
3. **Si nouveau** → `inviteUserByEmail(email, { redirectTo: "https://btpsmartpro.com/auth" })`
4. **Email envoyé** avec lien de confirmation
5. **Utilisateur clique** sur le lien dans l'email
6. **Redirection vers** `https://btpsmartpro.com/auth?token=...&type=invite`
7. **Page `/auth`** détecte l'authentification via `onAuthStateChange`
8. **Redirection automatique** vers `/dashboard` ou `/complete-profile`

## ✅ Garanties

1. ✅ **Redirection correcte** - Les invitations redirigent vers votre domaine
2. ✅ **Gestion automatique** - La page `/auth` gère les callbacks
3. ✅ **Configuration flexible** - Utilise les variables d'environnement ou la valeur par défaut
4. ✅ **Pas de route supplémentaire** - Utilise la route `/auth` existante

## 🧪 Test

1. Envoyez une invitation à un nouvel email
2. Vérifiez l'email reçu
3. Cliquez sur le lien de confirmation
4. Vous devriez être redirigé vers `https://btpsmartpro.com/auth`
5. Après authentification, redirection vers `/dashboard` ou `/complete-profile`





