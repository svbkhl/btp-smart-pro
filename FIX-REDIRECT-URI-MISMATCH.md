# 🔧 Correction Erreur `redirect_uri_mismatch` Google OAuth

## 🔍 Problème

**Erreur** :
```
Erreur 400 : redirect_uri_mismatch
Vous ne pouvez pas vous connecter à cette appli, car elle ne respecte pas le règlement OAuth 2.0 de Google.
```

**Cause** : L'URI de redirection configurée dans le code ne correspond pas à celle enregistrée dans la Google Cloud Console.

---

## ✅ Solution : Configurer l'URI de Redirection dans Google Cloud Console

### Étape 1 : Identifier l'URI de Redirection Utilisée

D'après le code, l'URI de redirection doit être :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

**Important** : Cette URI doit être **exactement** la même dans :
1. ✅ La variable d'environnement Supabase `GOOGLE_REDIRECT_URI`
2. ✅ La Google Cloud Console (URI de redirection autorisée)

---

### Étape 2 : Vérifier la Variable d'Environnement Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/secrets
2. **Vérifiez** que `GOOGLE_REDIRECT_URI` est définie avec :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
   ```

**⚠️ IMPORTANT** : L'URI doit pointer vers `google-calendar-callback` (pas `google-calendar-oauth-entreprise-pkce`)

**Si elle n'existe pas ou est incorrecte** :
- Cliquez sur "Add new secret" ou "Edit" si elle existe déjà
- **Name** : `GOOGLE_REDIRECT_URI`
- **Value** : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
- Cliquez sur "Save"

---

### Étape 3 : Configurer l'URI dans Google Cloud Console

1. **Allez sur** : https://console.cloud.google.com/apis/credentials
2. **Sélectionnez votre projet** (celui qui contient vos credentials OAuth)
3. **Cliquez sur votre OAuth 2.0 Client ID** (celui utilisé pour Google Calendar)
4. **Dans la section "Authorized redirect URIs"**, ajoutez :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
   ```

**Important** :
- ✅ L'URI doit être **exactement** la même (pas d'espace, pas de slash final)
- ✅ Utilisez `https://` (pas `http://`)
- ✅ Pas de `localhost` ou `127.0.0.1` en production
- ✅ Cliquez sur "Save" après avoir ajouté l'URI

---

### Étape 4 : Vérifier les Autres Variables d'Environnement

Assurez-vous que ces variables sont également configurées dans Supabase :

| Variable | Valeur Attendue |
|----------|----------------|
| `GOOGLE_CLIENT_ID` | Votre Client ID Google (ex: `xxxxx.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Votre Client Secret Google |
| `GOOGLE_REDIRECT_URI` | `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback` |

**Où les trouver** :
- **Client ID & Secret** : https://console.cloud.google.com/apis/credentials
- **Redirect URI** : Doit correspondre à l'Edge Function Supabase

---

## 📋 Checklist Complète

### Supabase Secrets
- [ ] `GOOGLE_CLIENT_ID` configuré
- [ ] `GOOGLE_CLIENT_SECRET` configuré
- [ ] `GOOGLE_REDIRECT_URI` = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`

### Google Cloud Console
- [ ] OAuth 2.0 Client ID créé
- [ ] URI de redirection ajoutée : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
- [ ] URI enregistrée et sauvegardée

### Vérification
- [ ] Les deux URIs sont **identiques** (caractère par caractère)
- [ ] Pas d'espace avant/après
- [ ] Utilise `https://` (pas `http://`)
- [ ] Pas de `localhost` ou `127.0.0.1`

---

## 🔍 Comment Vérifier que C'est Correct

### 1. Vérifier les Logs Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Sélectionnez** `google-calendar-oauth`
3. **Lancez une connexion** Google Calendar depuis l'app
4. **Vérifiez les logs** :
   ```
   🔗 Redirect URI (production): https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
   ```

### 2. Tester la Connexion

1. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Cliquez sur** "Connecter Google Calendar"
3. **Vérifiez** :
   - ✅ Vous êtes redirigé vers Google
   - ✅ Pas d'erreur `redirect_uri_mismatch`
   - ✅ Après autorisation, vous êtes redirigé vers `/settings?tab=integrations`

---

## 🚨 Erreurs Courantes

### Erreur 1 : "redirect_uri_mismatch"
**Cause** : URI différente entre Supabase et Google Cloud Console
**Solution** : Vérifiez que les deux URIs sont **identiques**

### Erreur 2 : "invalid_client"
**Cause** : `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` incorrect
**Solution** : Vérifiez les secrets dans Supabase

### Erreur 3 : "access_denied"
**Cause** : L'utilisateur a refusé l'autorisation
**Solution** : Normal, l'utilisateur doit accepter les permissions

---

## 📝 Format Exact de l'URI

L'URI doit être **exactement** :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

**Pas** :
- ❌ `http://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback` (http au lieu de https)
- ❌ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback/` (slash final)
- ❌ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth` (mauvaise fonction)
- ❌ `https://www.btpsmartpro.com/settings?tab=integrations` (URL frontend, pas callback)

---

## ✅ Après Configuration

1. **Attendez 1-2 minutes** pour que Google propage les changements
2. **Testez la connexion** depuis l'application
3. **Vérifiez les logs** Supabase pour confirmer que tout fonctionne

---

## 🎯 Résultat Attendu

- ✅ Plus d'erreur `redirect_uri_mismatch`
- ✅ Redirection vers Google OAuth réussie
- ✅ Autorisation Google réussie
- ✅ Redirection vers `/settings?tab=integrations` avec `google_calendar_status=success`
- ✅ Google Calendar connecté avec succès

---

**Une fois ces étapes complétées, l'erreur `redirect_uri_mismatch` devrait être résolue !** 🎉
