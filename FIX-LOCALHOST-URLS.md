# 🔧 Correction URLs Localhost → Production

## 🔍 Problème

- ❌ Erreur 404 avec `/undefined`
- ❌ Toutes les fonctions appellent `localhost` alors qu'on est sur `btpsmartpro.com`
- ❌ `GOOGLE_REDIRECT_URI` pointe probablement vers localhost

---

## ✅ Corrections Appliquées

### 1. Fonction Callback Créée

**Nouveau fichier** : `supabase/functions/google-calendar-callback/index.ts`

Cette fonction :
- ✅ Reçoit le code OAuth de Google
- ✅ Redirige vers l'application avec le code
- ✅ Gère les erreurs OAuth
- ✅ Utilise l'URL de production (`https://www.btpsmartpro.com`)

---

### 2. Vérification Localhost dans `google-calendar-oauth`

La fonction vérifie maintenant que `GOOGLE_REDIRECT_URI` n'est **PAS** localhost :

```typescript
if (redirectUri.includes("localhost") || redirectUri.includes("127.0.0.1")) {
  return new Response(
    JSON.stringify({ 
      error: "GOOGLE_REDIRECT_URI cannot be localhost in production",
      current_redirect_uri: redirectUri 
    }),
    { status: 400 }
  );
}
```

---

### 3. Ajout du State OAuth

La fonction inclut maintenant `user_id` et `company_id` dans le state OAuth pour le callback.

---

## 🚀 Actions Requises

### 1. Configurer `GOOGLE_REDIRECT_URI` dans Supabase

Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions**

**Ajoutez/modifiez** :

```
GOOGLE_REDIRECT_URI = https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

⚠️ **IMPORTANT** :
- ✅ Pas de `localhost`
- ✅ Pas de `127.0.0.1`
- ✅ Exactement cette URL

---

### 2. Ajouter Variable `APP_URL` (Optionnel)

Pour personnaliser l'URL de redirection après OAuth :

```
APP_URL = https://www.btpsmartpro.com
```

Si non défini, utilise `https://www.btpsmartpro.com` par défaut.

---

### 3. Redéployer les Fonctions

#### Via Dashboard

1. **`google-calendar-oauth`** :
   - https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
   - Trouvez `google-calendar-oauth` → 3 points → Redeploy

2. **`google-calendar-callback`** (nouvelle fonction) :
   - Cliquez sur "Deploy new function"
   - Ou via CLI (voir ci-dessous)

#### Via CLI

```bash
# Redéployer google-calendar-oauth
supabase functions deploy google-calendar-oauth --no-verify-jwt

# Déployer google-calendar-callback (nouvelle)
supabase functions deploy google-calendar-callback --no-verify-jwt
```

---

### 4. Configurer dans Google Cloud Console

Dans **Google Cloud Console → Credentials → OAuth 2.0 Client ID** :

**Authorized redirect URIs** :

```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

⚠️ **Exactement cette URL** (pas de localhost)

---

## 📋 Checklist

- [ ] `GOOGLE_REDIRECT_URI` configuré dans Supabase (sans localhost)
- [ ] `APP_URL` configuré dans Supabase (optionnel)
- [ ] `google-calendar-oauth` redéployée
- [ ] `google-calendar-callback` déployée (nouvelle fonction)
- [ ] URL ajoutée dans Google Cloud Console
- [ ] Test de connexion Google Calendar

---

## 🧪 Test

1. **Testez la connexion Google Calendar** dans l'app
2. **Vérifiez les logs** :
   - ✅ Si vous voyez `"✅ Generated OAuth URL"` → OK
   - ❌ Si vous voyez `"GOOGLE_REDIRECT_URI cannot be localhost"` → Corriger la variable
3. **Après autorisation Google**, vous devriez être redirigé vers :
   ```
   https://www.btpsmartpro.com/settings?google_calendar_code=...
   ```

---

## 🔍 Vérification des URLs

### Dans Supabase Dashboard

**Settings → Edge Functions → Secrets** :

| Variable | Valeur Correcte | ❌ Valeur Incorrecte |
|---------|----------------|---------------------|
| `GOOGLE_REDIRECT_URI` | `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback` | `http://localhost:9999/...` |
| `APP_URL` | `https://www.btpsmartpro.com` | `http://localhost:5173` |

---

## 📝 Résumé

1. ✅ Fonction `google-calendar-callback` créée
2. ✅ Vérification localhost ajoutée
3. ✅ State OAuth avec user_id/company_id
4. ⚠️ **À FAIRE** : Configurer `GOOGLE_REDIRECT_URI` sans localhost
5. ⚠️ **À FAIRE** : Déployer `google-calendar-callback`
