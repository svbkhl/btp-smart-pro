# 🔐 Guide Complet : Correction PKCE OAuth Google Calendar

## ✅ Corrections Appliquées

### 1. Frontend : Génération PKCE côté client (RFC 7636)

**Fichier modifié** : `src/hooks/useGoogleCalendar.ts`

- ✅ Génération de `code_verifier` et `code_challenge` côté frontend
- ✅ Stockage de `code_verifier` dans `sessionStorage`
- ✅ Envoi de `code_challenge` à l'Edge Function
- ✅ Récupération de `code_verifier` lors de l'échange
- ✅ Nettoyage automatique après utilisation

### 2. Edge Function : Acceptation de `code_challenge` depuis le frontend

**Fichier modifié** : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`

- ✅ Action `get_auth_url` accepte `code_challenge` depuis le body
- ✅ Validation que `code_challenge` est présent
- ✅ Utilisation de `code_challenge` dans l'URL OAuth
- ✅ `code_verifier` ne passe JAMAIS par le serveur (sécurité)

### 3. Flow PKCE Complet

```
1. Frontend génère code_verifier (43-128 chars, base64url)
2. Frontend génère code_challenge = SHA256(code_verifier) en base64url
3. Frontend stocke code_verifier dans sessionStorage
4. Frontend envoie code_challenge à Edge Function
5. Edge Function génère URL OAuth avec code_challenge
6. Google redirige vers redirect_uri avec code
7. Frontend récupère code_verifier depuis sessionStorage
8. Frontend envoie code + code_verifier à Edge Function
9. Edge Function échange code contre tokens avec Google
10. Frontend nettoie code_verifier de sessionStorage
```

---

## 🚀 Déploiement

### Étape 1 : Redéployer l'Edge Function

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth-entreprise-pkce`
3. **Cliquez sur** "Edit"
4. **Copiez** le contenu de `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`
5. **Collez** dans l'éditeur Supabase
6. **Cliquez sur** "Deploy"

### Étape 2 : Vérifier GOOGLE_REDIRECT_URI

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/secrets
2. **Vérifiez** que `GOOGLE_REDIRECT_URI` est défini
3. **Format attendu** : `https://www.btpsmartpro.com/settings?tab=integrations`

### Étape 3 : Vérifier Google Cloud Console

1. **Allez sur** : https://console.cloud.google.com/apis/credentials
2. **Trouvez** votre OAuth 2.0 Client ID
3. **Vérifiez** "Authorized redirect URIs"
4. **Assurez-vous** que l'URI est **EXACTEMENT identique** à `GOOGLE_REDIRECT_URI`

**⚠️ IMPORTANT** : L'URI doit être identique caractère par caractère :
- Même protocole (https)
- Même domaine
- Même chemin
- Même casse
- Pas d'espaces

### Étape 4 : Déployer le Frontend

Le frontend sera automatiquement déployé sur Vercel après le commit Git.

---

## 🧪 Test du Flow PKCE

### 1. Ouvrir la console navigateur

Ouvrez les DevTools (F12) et allez dans l'onglet Console.

### 2. Tester la connexion

1. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Cliquez sur** "Connecter Google Calendar"
3. **Vérifiez dans la console** :
   ```
   🔐 [useGetGoogleAuthUrl] PKCE généré:
     - code_verifier: ...
     - code_challenge: ...
   ```
4. **Autorisez** sur Google
5. **Vérifiez dans la console** :
   ```
   🔍 [useExchangeGoogleCode] Paramètres d'échange PKCE:
     - code: present
     - code_verifier: present (XX chars)
     - state: present
     - company_id: ...
   ```

### 3. Vérifier les logs Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Filtrez** par `google-calendar-oauth-entreprise-pkce`
3. **Cherchez** :
   - `🔐 [get_auth_url] PKCE code_challenge reçu depuis le frontend`
   - `✅ [exchange_code] Utilisation de PKCE`
   - `✅ [exchange_code] Tokens reçus de Google:`

---

## ❌ Erreurs Courantes

### Erreur : "code_verifier manquant"

**Cause** : Le `code_verifier` n'a pas été stocké dans `sessionStorage` ou a été supprimé.

**Solution** :
1. Vérifiez que `storeCodeVerifier()` est appelé avant la redirection
2. Vérifiez que `sessionStorage` n'est pas bloqué par le navigateur
3. Vérifiez que vous n'avez pas plusieurs onglets ouverts (sessionStorage est par onglet)

### Erreur : "code_challenge is required"

**Cause** : L'Edge Function n'a pas reçu `code_challenge` dans le body.

**Solution** :
1. Vérifiez que `useGetGoogleAuthUrl` envoie bien `code_challenge` dans le body
2. Vérifiez que l'Edge Function est bien redéployée

### Erreur : "redirect_uri_mismatch"

**Cause** : Le `redirect_uri` dans Google Cloud Console ne correspond pas à `GOOGLE_REDIRECT_URI`.

**Solution** :
1. Vérifiez que les deux URIs sont identiques caractère par caractère
2. Vérifiez qu'il n'y a pas d'espaces ou caractères invisibles
3. Mettez à jour Google Cloud Console si nécessaire

### Erreur : "invalid_grant"

**Cause** : Le `code_verifier` ne correspond pas au `code_challenge` utilisé initialement.

**Solution** :
1. Vérifiez que le même `code_verifier` est utilisé pour générer `code_challenge` et pour l'échange
2. Vérifiez que `code_verifier` n'a pas été modifié entre les deux étapes
3. Réessayez la connexion complète

---

## 🔒 Sécurité PKCE

### Pourquoi PKCE ?

PKCE (Proof Key for Code Exchange) sécurise le flow OAuth 2.0 en :
- ✅ Empêchant l'interception du code d'autorisation
- ✅ Protégeant contre les attaques CSRF
- ✅ Fonctionnant même avec des clients publics (SPA)

### Implémentation RFC 7636

- ✅ `code_verifier` : 43-128 caractères, base64url
- ✅ `code_challenge` : SHA256(code_verifier) en base64url
- ✅ `code_challenge_method` : S256 (SHA256)
- ✅ `code_verifier` reste côté client (jamais envoyé au serveur sauf lors de l'échange)

---

## 📊 Checklist de Vérification

- [ ] Edge Function `google-calendar-oauth-entreprise-pkce` redéployée
- [ ] `GOOGLE_REDIRECT_URI` défini dans Supabase Secrets
- [ ] URI identique dans Google Cloud Console
- [ ] Frontend déployé sur Vercel
- [ ] Test de connexion réussi
- [ ] Logs Supabase montrent PKCE utilisé
- [ ] Pas d'erreur "code_verifier manquant"
- [ ] Connexion Google Calendar fonctionnelle

---

## 🎯 Résultat Attendu

Après toutes ces étapes :
- ✅ Le flow OAuth utilise PKCE (RFC 7636)
- ✅ Plus d'erreur "code_verifier manquant"
- ✅ Connexion Google Calendar fonctionnelle
- ✅ Sécurité renforcée
