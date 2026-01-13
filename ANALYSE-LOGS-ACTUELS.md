# 🔍 Analyse des Logs Actuels

## ✅ Ce Que Je Vois

D'après les logs que vous avez partagés :

1. **✅ L'Edge Function reçoit bien la requête**
2. **✅ Le code_verifier est manquant** (normal, on procède sans PKCE)
3. **✅ L'échange se fait sans PKCE** (comportement attendu)

## ❌ Ce Qui Manque

Les logs que vous avez partagés s'arrêtent avant l'erreur. Il faut chercher **les logs qui viennent APRÈS** ces messages.

---

## 🔍 Logs à Chercher (Après "Échange sans PKCE")

### 1. Erreur Google API (Le Plus Probable)

Cherchez ces messages qui doivent venir **juste après** "Échange sans PKCE" :

```
❌ [exchange_code] Google token exchange error: {...}
❌ [exchange_code] Status: 400
```

OU

```
Google token exchange error: invalid_grant
Google token exchange error: invalid_client
Google token exchange error: redirect_uri_mismatch
```

**Ces logs vous diront EXACTEMENT pourquoi Google refuse l'échange.**

---

### 2. Erreur de Validation

Cherchez :

```
❌ [exchange_code] Code manquant
❌ [exchange_code] Company ID manquant
❌ [exchange_code] Invalid state format
```

---

### 3. Erreur Non Gérée

Cherchez :

```
❌ [ERROR] Unhandled error: ...
```

---

## 📋 Action Immédiate

1. **Dans les logs Supabase**, cherchez les messages qui viennent **APRÈS** "⚠️ [exchange_code] Échange sans PKCE"

2. **Filtrez par "Error"** dans les logs Supabase pour voir seulement les erreurs

3. **Cherchez** tous les messages qui contiennent :
   - `❌`
   - `error`
   - `Error`
   - `failed`
   - `Failed`

4. **Copiez-collez ici** tous ces logs d'erreur

---

## 💡 Hypothèse

L'erreur 400 vient probablement de **Google API** qui refuse l'échange de token. Les raisons possibles :

1. **`invalid_grant`** : Le code a expiré ou a déjà été utilisé
2. **`invalid_client`** : GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET incorrect
3. **`redirect_uri_mismatch`** : GOOGLE_REDIRECT_URI ne correspond pas
4. **`code_verifier` manquant** : Si Google attend PKCE mais qu'on n'envoie pas

---

## 🔧 Solution Temporaire

Si l'erreur vient de Google API, vérifiez :

1. **GOOGLE_REDIRECT_URI** dans Supabase Secrets doit être :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
   ```

2. **Dans Google Cloud Console**, l'URI de redirection autorisée doit être **identique**

3. **Le code OAuth** ne doit pas être utilisé deux fois (relancez la connexion depuis le début)

---

## 📝 Prochaine Étape

**Partagez les logs qui viennent APRÈS "Échange sans PKCE"**, surtout ceux qui contiennent `❌` ou `error`.
