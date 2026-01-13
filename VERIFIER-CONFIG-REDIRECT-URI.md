# 🔍 Vérification Configuration redirect_uri

## 🎯 URI Correcte à Utiliser

```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

---

## ✅ Checklist de Vérification

### 1. Supabase Secrets

**URL** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/secrets

**À vérifier** :
- [ ] `GOOGLE_REDIRECT_URI` existe
- [ ] Valeur = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
- [ ] Pas d'espace avant/après
- [ ] Pas de slash final (`/`)

**Si incorrect** :
1. Cliquez sur "Edit" ou "Add new secret"
2. **Name** : `GOOGLE_REDIRECT_URI`
3. **Value** : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
4. Cliquez sur "Save"

---

### 2. Google Cloud Console

**URL** : https://console.cloud.google.com/apis/credentials

**À vérifier** :
- [ ] Sélectionnez votre projet
- [ ] Cliquez sur votre **OAuth 2.0 Client ID**
- [ ] Dans **"Authorized redirect URIs"**, vérifiez que cette URI existe :
  ```
  https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
  ```

**Si elle n'existe pas** :
1. Cliquez sur **"ADD URI"** ou le bouton **"+"**
2. Collez : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
3. Cliquez sur **"SAVE"**

---

### 3. Vérifier les Logs Supabase

**URL** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions

**Étapes** :
1. Sélectionnez `google-calendar-oauth`
2. Lancez une connexion depuis l'app
3. Vérifiez le log qui affiche :
   ```
   🔗 Redirect URI (production): https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
   ```

**Si l'URI dans les logs est différente** :
- C'est que `GOOGLE_REDIRECT_URI` dans Supabase n'est pas correcte
- Corrigez-la dans Supabase Secrets

---

## 🚨 Erreurs Courantes

### Erreur 1 : URI avec slash final
❌ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback/`
✅ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`

### Erreur 2 : URI avec espace
❌ ` https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback `
✅ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`

### Erreur 3 : Mauvaise fonction
❌ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth`
❌ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce`
✅ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`

### Erreur 4 : http au lieu de https
❌ `http://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
✅ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`

---

## 🔄 Après Correction

1. **Attendez 1-2 minutes** (propagation Google)
2. **Redéployez l'Edge Function** (optionnel mais recommandé) :
   ```bash
   supabase functions deploy google-calendar-callback
   ```
3. **Testez** : https://www.btpsmartpro.com/settings?tab=integrations
4. **Cliquez sur** "Connecter Google Calendar"

---

## ✅ Résultat Attendu

- ✅ Plus d'erreur `redirect_uri_mismatch`
- ✅ Redirection vers Google OAuth réussie
- ✅ Autorisation Google réussie
- ✅ Retour vers `/settings?tab=integrations` avec `google_calendar_status=success`

---

## 📞 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs Supabase** pour voir quelle URI est réellement utilisée
2. **Vérifiez que les deux URIs sont identiques** (caractère par caractère)
3. **Vérifiez que Google Calendar API est activée** dans Google Cloud Console
4. **Vérifiez que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont corrects**

---

**L'URI doit être EXACTEMENT la même dans Supabase ET Google Cloud Console !** 🎯
