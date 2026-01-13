# ⚡ Correction Rapide : redirect_uri_mismatch

## 🎯 URI de Redirection Correcte

```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

---

## ✅ Étapes Rapides (5 minutes)

### 1. Supabase Secrets

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/secrets
2. **Trouvez ou créez** `GOOGLE_REDIRECT_URI`
3. **Valeur** : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
4. **Sauvegardez**

### 2. Google Cloud Console

1. **Allez sur** : https://console.cloud.google.com/apis/credentials
2. **Cliquez sur votre OAuth 2.0 Client ID**
3. **Dans "Authorized redirect URIs"**, ajoutez :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
   ```
4. **Sauvegardez**

### 3. Attendre et Tester

1. **Attendez 1-2 minutes** (propagation Google)
2. **Testez** : https://www.btpsmartpro.com/settings?tab=integrations
3. **Cliquez sur** "Connecter Google Calendar"

---

## ✅ Vérification

Les deux URIs doivent être **IDENTIQUES** :

- ✅ Supabase Secret `GOOGLE_REDIRECT_URI` = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
- ✅ Google Cloud Console Authorized redirect URI = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`

**Caractère par caractère, identiques !**

---

## 🚨 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs Supabase** :
   - https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
   - Sélectionnez `google-calendar-oauth`
   - Vérifiez le log : `🔗 Redirect URI (production): ...`

2. **Vérifiez que l'URI dans les logs correspond** à celle dans Google Cloud Console

3. **Redéployez l'Edge Function** si nécessaire :
   ```bash
   supabase functions deploy google-calendar-callback
   ```

---

**C'est tout !** 🎉
