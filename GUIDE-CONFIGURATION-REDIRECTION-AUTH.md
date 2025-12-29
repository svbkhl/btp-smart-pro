# 🔐 Guide Complet : Configuration des Redirections Auth Supabase

## 🎯 Objectif

Corriger le problème **"Connexion au serveur impossible"** après clic sur les liens d'invitation/magic link.

---

## ✅ Corrections Appliquées

### 1. Frontend (`src/pages/Auth.tsx`)
- ✅ Gestion explicite des callbacks avec paramètres URL (`code`, `token`, `access_token`, `error`)
- ✅ Traitement des erreurs dans l'URL
- ✅ Logs détaillés pour le debugging
- ✅ Nettoyage automatique de l'URL après traitement

### 2. Backend (`supabase/functions/send-invitation/index.ts`)
- ✅ URL de redirection corrigée : `https://btpsmartpro.com/auth/callback`
- ✅ Fallback automatique vers l'URL de production si localhost détecté
- ✅ Validation stricte des URLs (HTTPS requis en production)
- ✅ Logs explicites avec l'URL utilisée

---

## 📋 Configuration Supabase Dashboard (OBLIGATOIRE)

### Étape 1 : Configurer Site URL

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/auth**
2. Dans la section **"Site URL"**, entrez :
   ```
   https://btpsmartpro.com
   ```
3. Cliquez sur **"Save"**

### Étape 2 : Configurer Redirect URLs

1. Toujours dans **Settings → Auth**
2. Dans la section **"Redirect URLs"**, ajoutez **TOUTES** ces URLs (une par ligne) :
   ```
   https://btpsmartpro.com/auth/callback
   https://btpsmartpro.com/**
   http://localhost:5173/auth/callback
   http://localhost:5173/**
   ```
3. ⚠️ **IMPORTANT** : 
   - Les URLs doivent être **exactes** (pas de trailing slash sauf si nécessaire)
   - Utilisez `/**` pour autoriser toutes les sous-routes
   - Ajoutez vos URLs de développement si nécessaire
4. Cliquez sur **"Save"**

### Étape 3 : Vérifier Email Templates (Optionnel)

1. Allez dans **Authentication → Email Templates**
2. Vérifiez que les templates utilisent bien les variables :
   - `{{ .ConfirmationURL }}` pour les invitations
   - `{{ .ConfirmationURL }}` pour les magic links
3. Les URLs générées incluront automatiquement le `redirectTo` si configuré

---

## 🔍 Vérification de la Configuration

### Test 1 : Vérifier les URLs dans Supabase Dashboard

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/auth**
2. Vérifiez que :
   - ✅ **Site URL** = `https://btpsmartpro.com`
   - ✅ **Redirect URLs** contient `https://btpsmartpro.com/auth/callback`

### Test 2 : Tester une Invitation

1. Envoyez une invitation depuis votre application
2. Vérifiez les logs de l'Edge Function :
   ```bash
   supabase functions logs send-invitation --project-ref renmjmqlmafqjzldmsgs
   ```
3. Recherchez dans les logs :
   ```
   Redirect URL configured and validated
   redirectUrl: https://btpsmartpro.com/auth/callback
   ```

### Test 3 : Vérifier le Lien Email

1. Ouvrez l'email reçu
2. Le lien devrait ressembler à :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=https%3A%2F%2Fbtpsmartpro.com%2Fauth%2Fcallback
   ```
3. ⚠️ **Si le lien ne contient pas `redirect_to`**, vérifiez que `redirectUrl` est bien configuré dans l'Edge Function

### Test 4 : Tester le Callback

1. Cliquez sur le lien dans l'email
2. Vous devriez être redirigé vers : `https://btpsmartpro.com/auth/callback?code=...`
3. La page devrait automatiquement :
   - Traiter le callback
   - Créer la session
   - Rediriger vers `/dashboard` ou `/complete-profile`

---

## 🐛 Debugging

### Problème : "Connexion au serveur impossible"

**Causes possibles :**
1. ❌ URL de redirection non autorisée dans Supabase Dashboard
2. ❌ Route `/auth/callback` manquante ou mal configurée
3. ❌ URL de redirection invalide (localhost en production, HTTP au lieu de HTTPS)
4. ❌ Site URL non configuré dans Supabase Dashboard

**Solutions :**
1. Vérifiez les **Redirect URLs** dans Supabase Dashboard
2. Vérifiez les logs de l'Edge Function pour voir l'URL utilisée
3. Vérifiez la console du navigateur (F12) pour les erreurs
4. Vérifiez que la route `/auth/callback` existe dans `src/App.tsx`

### Problème : Redirection vers une page blanche

**Causes possibles :**
1. ❌ Le composant `Auth` ne traite pas correctement les paramètres
2. ❌ Erreur JavaScript dans le traitement du callback

**Solutions :**
1. Ouvrez la console du navigateur (F12)
2. Recherchez les logs `[Auth]` pour voir ce qui se passe
3. Vérifiez que `supabase.auth.getSession()` fonctionne

### Problème : Session non créée après callback

**Causes possibles :**
1. ❌ Token expiré ou invalide
2. ❌ Erreur lors de l'échange du code contre un token

**Solutions :**
1. Vérifiez les logs Supabase Dashboard → Logs → Auth
2. Vérifiez que le token dans l'URL n'est pas expiré (magic links expirent après 24h)
3. Réessayez avec un nouveau lien d'invitation

---

## 📝 Logs à Surveiller

### Logs Edge Function

Recherchez ces messages dans les logs :
```
✅ "Redirect URL configured and validated"
✅ "Magic link generated, sending email via Resend"
✅ "Magic link sent successfully via Resend"
```

### Logs Frontend (Console Navigateur)

Recherchez ces messages dans la console :
```
✅ [Auth] Processing callback with params: {...}
✅ [Auth] Session created successfully, redirecting...
✅ [Auth] Auth state changed: { event: "SIGNED_IN", ... }
```

---

## 🔒 Sécurité

### URLs Autorisées

- ✅ **Production** : `https://btpsmartpro.com/**`
- ✅ **Développement** : `http://localhost:5173/**` (uniquement en dev)
- ❌ **Ne jamais** autoriser des URLs non vérifiées
- ❌ **Ne jamais** utiliser HTTP en production

### Validation des URLs

L'Edge Function valide automatiquement :
- ✅ Format URL valide
- ✅ HTTPS en production (sauf localhost)
- ✅ Pas de localhost en production

---

## ✅ Checklist de Configuration

- [ ] Site URL configuré dans Supabase Dashboard
- [ ] Redirect URLs configurées dans Supabase Dashboard
- [ ] Route `/auth/callback` existe dans `src/App.tsx`
- [ ] Composant `Auth` gère les callbacks
- [ ] Edge Function utilise l'URL de production
- [ ] Test d'invitation réussi
- [ ] Test de callback réussi
- [ ] Redirection vers `/dashboard` fonctionne

---

## 🚀 Déploiement

Après configuration :

1. **Déployez l'Edge Function** :
   ```bash
   supabase functions deploy send-invitation --project-ref renmjmqlmafqjzldmsgs
   ```

2. **Vérifiez les variables d'environnement** :
   - `SITE_URL` (optionnel, défaut: `https://btpsmartpro.com`)
   - `RESEND_API_KEY` (obligatoire)
   - `RESEND_FROM_EMAIL` (optionnel)

3. **Testez en production** :
   - Envoyez une invitation
   - Vérifiez que l'email contient le bon lien
   - Cliquez sur le lien
   - Vérifiez la redirection

---

## 📞 Support

Si le problème persiste :

1. Vérifiez les logs Supabase Dashboard → Logs → Edge Functions
2. Vérifiez les logs du navigateur (F12 → Console)
3. Vérifiez que toutes les URLs sont bien configurées
4. Testez avec un utilisateur de test

---

**✅ Une fois ces étapes complétées, le problème "Connexion au serveur impossible" devrait être résolu !**
