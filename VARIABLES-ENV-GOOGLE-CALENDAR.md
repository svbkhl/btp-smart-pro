# 🔐 Variables d'Environnement Google Calendar

## ⚠️ OBLIGATOIRE : Configurer dans Supabase

Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions**

---

## 📋 Variables à Configurer

### 1. `GOOGLE_CLIENT_ID`

- **Où trouver** : Google Cloud Console → Credentials → OAuth 2.0 Client ID
- **Format** : `xxxxx.apps.googleusercontent.com`
- **Exemple** : `123456789-abcdefghijklmnop.apps.googleusercontent.com`

---

### 2. `GOOGLE_CLIENT_SECRET`

- **Où trouver** : Google Cloud Console → Credentials → OAuth 2.0 Client ID → Cliquez sur votre client → Copiez le "Client secret"
- **Format** : Chaîne aléatoire
- **Exemple** : `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`

---

### 3. `GOOGLE_REDIRECT_URI` ⚠️ CRITIQUE

**DOIT ÊTRE EXACTEMENT** :

```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

**⚠️ ATTENTION** :
- ✅ Pas d'espace avant/après
- ✅ Pas de slash final
- ✅ Exactement cette URL (pas `google-calendar-oauth`, mais `google-calendar-callback`)
- ✅ La moindre différence = erreur 400

---

## 🔧 Comment Configurer

### Via Dashboard Supabase

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions**
2. Section **"Edge Functions Secrets"**
3. Cliquez sur **"Add new secret"**
4. Ajoutez les 3 variables :
   - `GOOGLE_CLIENT_ID` = votre Client ID
   - `GOOGLE_CLIENT_SECRET` = votre Client Secret
   - `GOOGLE_REDIRECT_URI` = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`

---

### Via CLI

```bash
supabase secrets set GOOGLE_CLIENT_ID="votre-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="votre-client-secret"
supabase secrets set GOOGLE_REDIRECT_URI="https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback"
```

---

## ✅ Vérification

Après configuration, vérifiez dans les logs de l'Edge Function :

- ❌ Si vous voyez `"❌ Missing Google env vars"` → Les variables ne sont pas configurées
- ✅ Si vous voyez l'URL OAuth générée → Tout est OK

---

## 🔗 URLs à Configurer dans Google Cloud Console

Dans **Google Cloud Console → Credentials → OAuth 2.0 Client ID** :

### Authorized redirect URIs

Ajoutez **EXACTEMENT** :

```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

⚠️ **La moindre différence = erreur 400**

---

## 📝 Résumé

| Variable | Valeur Exemple | Où Configurer |
|---------|----------------|---------------|
| `GOOGLE_CLIENT_ID` | `123456789-xxx.apps.googleusercontent.com` | Supabase Dashboard → Settings → Edge Functions |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Supabase Dashboard → Settings → Edge Functions |
| `GOOGLE_REDIRECT_URI` | `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback` | Supabase Dashboard → Settings → Edge Functions |

---

## 🚨 Erreurs Communes

### Erreur 400 "Google OAuth not configured"

→ Les variables d'environnement ne sont pas configurées dans Supabase

### Erreur 400 "redirect_uri_mismatch"

→ L'URL dans `GOOGLE_REDIRECT_URI` ne correspond pas à celle dans Google Cloud Console

### Erreur 400 "invalid_client"

→ Le `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` est incorrect

---

## ✅ Checklist

- [ ] `GOOGLE_CLIENT_ID` configuré dans Supabase
- [ ] `GOOGLE_CLIENT_SECRET` configuré dans Supabase
- [ ] `GOOGLE_REDIRECT_URI` configuré dans Supabase (exactement la bonne URL)
- [ ] URL ajoutée dans Google Cloud Console → Authorized redirect URIs
- [ ] Redéployé l'Edge Function après configuration

