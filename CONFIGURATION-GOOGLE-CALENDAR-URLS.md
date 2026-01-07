# 🔗 URLs de Configuration Google Calendar

## ✅ URL de Redirection OAuth

### Pour Google Cloud Console

**Authorized redirect URIs** :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
```

### Pour Supabase Secrets

**GOOGLE_REDIRECT_URI** :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
```

---

## 📋 Instructions Complètes

### 1. Google Cloud Console

1. Allez sur : https://console.cloud.google.com/
2. **APIs & Services** → **Credentials**
3. Trouvez votre **OAuth 2.0 Client ID**
4. Cliquez sur **Edit**
5. Dans **Authorized redirect URIs**, ajoutez :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
   ```
6. Cliquez sur **Save**

### 2. Supabase Secrets

1. Allez sur : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. Section **Secrets**
3. Ajoutez ou modifiez :
   - **Name** : `GOOGLE_REDIRECT_URI`
   - **Value** : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce`

**Via CLI** :
```bash
supabase secrets set GOOGLE_REDIRECT_URI="https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce"
```

---

## ⚠️ Important

- L'URL doit être **exactement** la même dans Google Cloud Console et Supabase
- Pas de trailing slash (`/`) à la fin
- Utilisez `https://` (pas `http://`)
- Le nom du projet est : `renmjmqlmafqjzldmsgs`

---

## ✅ Vérification

Après configuration, testez la connexion :
1. Allez dans l'app → **Paramètres** → **Intégrations**
2. Cliquez sur **"Connecter Google Calendar"**
3. Si tout est correct, vous serez redirigé vers Google OAuth
4. Après autorisation, vous serez redirigé vers l'app


