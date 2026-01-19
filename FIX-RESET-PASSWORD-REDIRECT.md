# Correction du flux de réinitialisation de mot de passe

## Problème identifié

Le lien Supabase de réinitialisation de mot de passe redirigeait vers la home (`https://btpsmartpro.com`) au lieu de rediriger vers la page de réinitialisation (`/reset-password`). On observait dans l'URL de vérification : `redirect_to=https://btpsmartpro.com`.

## Cause racine

### 1. URL de redirection non absolue ou incorrecte

Le paramètre `redirectTo` dans `supabase.auth.resetPasswordForEmail()` doit être :
- **Une URL absolue** (avec protocole et domaine complet)
- **Pointeur vers un domaine configuré** dans Supabase Dashboard

**Comportement Supabase :**
- Si `redirectTo` n'est pas fourni ou est invalide, Supabase utilise la **Site URL** par défaut (configurée dans Dashboard > Authentication > URL Configuration)
- Si la Site URL pointe vers `https://btpsmartpro.com` (sans `/reset-password`), le lien de réinitialisation redirige vers la home
- Si `redirectTo` pointe vers un domaine non autorisé dans la liste des Redirect URLs, Supabase ignore le paramètre et utilise la Site URL

### 2. Utilisation conditionnelle en dev/prod

Le code utilisait :
```typescript
const redirectUrl = import.meta.env.PROD 
  ? 'https://www.btpsmartpro.com/reset-password'
  : `${window.location.origin}/reset-password`;
```

**Problèmes :**
- En développement local (`localhost:4000`), le domaine n'est pas dans les Redirect URLs de Supabase
- En production, si `import.meta.env.PROD` était mal détecté, l'URL pouvait être incorrecte
- Le domaine devait être cohérent avec la configuration Supabase (avec `www.`)

## Solution appliquée

### 1. URL absolue fixe avec domaine canonique

**Fichier : `src/pages/ForgotPassword.tsx`**

```typescript
// CRITIQUE: Le redirectTo doit TOUJOURS utiliser l'URL absolue avec le domaine canonique www
const redirectUrl = 'https://www.btpsmartpro.com/reset-password';

const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
  redirectTo: redirectUrl,
});
```

**Avantages :**
- URL toujours correcte, même en développement (redirigera vers production pour le reset)
- Domaine canonique `www.btpsmartpro.com` cohérent avec la configuration Supabase
- Pas de dépendance aux variables d'environnement qui peuvent être mal configurées

### 2. Configuration Supabase Dashboard requise

Dans **Supabase Dashboard > Authentication > URL Configuration**, vérifier :

**Site URL :**
```
https://www.btpsmartpro.com
```

**Redirect URLs :**
```
https://www.btpsmartpro.com/reset-password
https://www.btpsmartpro.com/auth/callback
https://www.btpsmartpro.com/**
```

**Important :**
- Le domaine doit être exactement `www.btpsmartpro.com` (avec `www.`)
- Si vous utilisez aussi `btpsmartpro.com` (sans www), l'ajouter aussi dans Redirect URLs
- Les wildcards `**` permettent les sous-routes

### 3. Guards de redirection renforcés

Tous les composants vérifient maintenant :
- `window.location.pathname === '/reset-password'`
- `type=recovery` dans l'URL (hash ou query params)
- Flag global `window.__IS_PASSWORD_RESET_PAGE__`

**Fichiers modifiés :**
- `src/pages/Auth.tsx` : Ignore `SIGNED_IN` si recovery token
- `src/pages/AuthCallback.tsx` : Redirige vers `/reset-password` si `PASSWORD_RECOVERY`
- `src/pages/ResetPassword.tsx` : Définit le flag immédiatement au montage
- `src/components/ProtectedRoute.tsx` : Ne redirige jamais depuis `/reset-password`
- `src/pages/Index.tsx` : Ne redirige pas vers dashboard si recovery token
- `src/App.tsx` : Fallback global pour détecter `type=recovery`

### 4. Redirection après succès

**Fichier : `src/pages/ResetPassword.tsx`**

Après réinitialisation réussie :
1. `supabase.auth.updateUser({ password })` → Met à jour le mot de passe
2. `supabase.auth.signOut()` → Déconnecte l'utilisateur (évite auto-login)
3. Redirection vers `/auth?reset=success` → Affiche message de succès

**Fichier : `src/pages/Auth.tsx`**

Détecte `reset=success` dans l'URL et affiche un toast de confirmation.

## Flow complet corrigé

### Étape 1 : Demande de réinitialisation
1. Utilisateur clique sur "Mot de passe oublié ?" sur `/auth`
2. Redirection vers `/forgot-password`
3. Utilisateur saisit son email
4. `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://www.btpsmartpro.com/reset-password' })`
5. Email envoyé avec lien contenant `redirect_to=https://www.btpsmartpro.com/reset-password`

### Étape 2 : Clic sur le lien email
1. Utilisateur clique sur le lien dans l'email
2. Supabase vérifie le token et crée une session temporaire de recovery
3. Supabase redirige vers `https://www.btpsmartpro.com/reset-password#access_token=...&type=recovery`
4. **Aucun auto-login** : Le flag `__IS_PASSWORD_RESET_PAGE__` bloque les redirections automatiques

### Étape 3 : Réinitialisation du mot de passe
1. Page `/reset-password` détecte le token recovery
2. Formulaire affiché pour nouveau mot de passe
3. Utilisateur saisit et confirme le nouveau mot de passe
4. `supabase.auth.updateUser({ password })` → Mot de passe mis à jour
5. `supabase.auth.signOut()` → Déconnexion immédiate
6. Redirection vers `/auth?reset=success`
7. Message de succès affiché

### Étape 4 : Connexion
1. Utilisateur se connecte avec le nouveau mot de passe
2. Navigation vers `/dashboard`

## Tests à effectuer

1. **Demande de réinitialisation :**
   - Aller sur `/forgot-password`
   - Saisir un email valide
   - Vérifier l'email reçu
   - Vérifier que le lien contient `redirect_to=https://www.btpsmartpro.com/reset-password`

2. **Clic sur le lien email :**
   - Cliquer sur le lien dans l'email
   - Vérifier que la redirection va vers `/reset-password` (pas la home, pas le dashboard)
   - Vérifier qu'aucun auto-login n'a eu lieu

3. **Réinitialisation :**
   - Saisir un nouveau mot de passe (minimum 8 caractères)
   - Confirmer le mot de passe
   - Vérifier la redirection vers `/auth?reset=success`
   - Vérifier l'affichage du message de succès

4. **Connexion après reset :**
   - Se connecter avec le nouveau mot de passe
   - Vérifier l'accès au dashboard

## Notes importantes

- Le domaine canonique est `www.btpsmartpro.com` (avec `www.`)
- L'URL de redirection est **toujours absolue** pour éviter les problèmes de domaine
- En développement local, le reset redirige vers la production (c'est normal)
- Les guards empêchent toute redirection automatique pendant le processus de reset
- L'utilisateur doit **toujours se reconnecter** après avoir réinitialisé son mot de passe

## Fichiers modifiés

1. `src/pages/ForgotPassword.tsx` : URL absolue fixe avec `www.btpsmartpro.com`
2. `src/pages/ResetPassword.tsx` : Redirection vers `/auth?reset=success` après succès
3. `src/pages/Auth.tsx` : Détection du paramètre `reset=success` dans l'URL
4. `src/components/ProtectedRoute.tsx` : Vérifications supplémentaires pour `/reset-password`
