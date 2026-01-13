# 🚀 Déployer la correction PKCE complète

## ✅ Corrections appliquées

### 1. Frontend - Génération PKCE côté client (RFC 7636)

**Fichier** : `src/hooks/useGoogleCalendar.ts`

- ✅ Génère `code_verifier` et `code_challenge` côté frontend
- ✅ Stocke `code_verifier` dans `sessionStorage`
- ✅ Envoie `code_challenge` à l'Edge Function
- ✅ Récupère `code_verifier` depuis `sessionStorage` lors de l'échange
- ✅ Validation stricte : erreur si `code_verifier` manquant

### 2. Edge Function - Accepte `code_challenge` depuis frontend

**Fichier** : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`

- ✅ Action `get_auth_url` accepte `code_challenge` depuis le body
- ✅ Ne génère plus le PKCE côté serveur (sécurité renforcée)
- ✅ Utilise `code_challenge` fourni pour générer l'URL OAuth
- ✅ Logs détaillés pour debugging

### 3. Flow complet PKCE

1. **Frontend** génère `code_verifier` (43-128 caractères, base64url)
2. **Frontend** calcule `code_challenge = SHA256(code_verifier)` (base64url)
3. **Frontend** stocke `code_verifier` dans `sessionStorage`
4. **Frontend** envoie `code_challenge` à l'Edge Function
5. **Edge Function** génère l'URL OAuth avec `code_challenge` et `code_challenge_method=S256`
6. **Google** redirige vers le frontend avec `code` et `state`
7. **Frontend** récupère `code_verifier` depuis `sessionStorage`
8. **Frontend** envoie `code` + `code_verifier` à l'Edge Function
9. **Edge Function** échange le code contre des tokens avec PKCE

---

## 📋 Redéployer l'Edge Function

### 1. Ouvrir la fonction

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth-entreprise-pkce`
3. **Cliquez sur** "Edit"

### 2. Copier le code

1. **Ouvrez** le fichier : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`
2. **Sélectionnez TOUT** (Cmd+A)
3. **Copiez** (Cmd+C)

### 3. Coller et déployer

1. **Dans l'éditeur Supabase**, sélectionnez tout (Cmd+A)
2. **Supprimez** (Backspace)
3. **Collez** (Cmd+V)
4. **Cliquez sur** "Deploy"

---

## ✅ Vérifier GOOGLE_REDIRECT_URI

**IMPORTANT** : Le `redirect_uri` doit être identique dans :
1. **Supabase Secrets** : `GOOGLE_REDIRECT_URI`
2. **Google Cloud Console** : Authorized redirect URIs

**Format attendu** :
```
https://www.btpsmartpro.com/settings?tab=integrations
```

Voir `VERIFIER-REDIRECT-URI.md` pour les détails.

---

## 🧪 Tester le flow

1. **Ouvrez** la page Settings → Intégrations
2. **Cliquez** sur "Connecter Google Calendar"
3. **Autorisez** sur Google
4. **Vérifiez** que la connexion réussit
5. **Vérifiez les logs** Supabase pour confirmer l'utilisation de PKCE

---

## 📊 Logs attendus

### Frontend (console)
```
🔐 [useGetGoogleAuthUrl] PKCE généré:
  - code_verifier: ...
  - code_challenge: ...
```

### Edge Function (Supabase Logs)
```
🔐 [get_auth_url] PKCE code_challenge reçu depuis le frontend
✅ [get_auth_url] URL OAuth générée avec PKCE
🔗 [get_auth_url] Redirect URI: ...
```

### Lors de l'échange
```
✅ [exchange_code] Utilisation de PKCE
🔄 [exchange_code] Appel à Google token endpoint...
```

---

## ⚠️ Si erreur "code_verifier manquant"

1. **Vérifiez** que `sessionStorage` est accessible
2. **Vérifiez** que le `code_verifier` est bien stocké avant la redirection
3. **Vérifiez** que vous utilisez le même onglet/navigateur
4. **Vérifiez** que `sessionStorage` n'est pas vidé entre les étapes

---

## 🔒 Sécurité PKCE

- ✅ `code_verifier` généré côté client (aléatoire, 43-128 caractères)
- ✅ `code_verifier` stocké dans `sessionStorage` (non persistant)
- ✅ `code_verifier` jamais envoyé au serveur sauf lors de l'échange
- ✅ `code_challenge` = SHA256(`code_verifier`) (base64url)
- ✅ Google valide que `code_challenge` correspond à `code_verifier`

---

## 📝 Notes

- Le frontend doit être redéployé sur Vercel pour que les changements soient actifs
- L'Edge Function doit être redéployée sur Supabase
- Les deux doivent être synchronisés pour que le flow fonctionne
