# 🔍 Où Trouver le Client ID et Client Secret Google

## 📍 Emplacement dans Google Cloud Console

### Étape 1 : Accéder à Google Cloud Console

1. Allez sur : **https://console.cloud.google.com/**
2. **Connectez-vous** avec votre compte Google
3. **Sélectionnez votre projet** (ou créez-en un si nécessaire)

---

### Étape 2 : Accéder aux Credentials

1. Dans le menu de gauche, cliquez sur **"APIs & Services"**
2. Cliquez sur **"Credentials"** (dans le sous-menu)

**OU** directement via ce lien :
- **https://console.cloud.google.com/apis/credentials**

---

### Étape 3 : Voir ou Créer un OAuth Client ID

#### Si vous avez DÉJÀ un OAuth Client ID :

1. Dans la liste des **"OAuth 2.0 Client IDs"**, trouvez votre client
2. Cliquez sur le **nom du client** ou sur l'**icône crayon** (Edit)
3. Vous verrez :
   - **Client ID** : `123456789-abc...` (visible directement)
   - **Client secret** : `GOCSPX-abc...` (cliquez sur **"Show"** ou **"Reveal"** pour le voir)

#### Si vous N'AVEZ PAS encore de OAuth Client ID :

1. Cliquez sur **"+ CREATE CREDENTIALS"** (en haut)
2. Sélectionnez **"OAuth client ID"**
3. Si c'est la première fois, configurez l'**OAuth consent screen** :
   - **User Type** : External (ou Internal si vous avez Google Workspace)
   - **App name** : `BTP Smart Pro`
   - **User support email** : Votre email
   - **Developer contact information** : Votre email
   - Cliquez sur **"Save and Continue"**
   - **Scopes** : Cliquez sur **"Save and Continue"** (par défaut)
   - **Test users** : Cliquez sur **"Save and Continue"** (optionnel)
   - Cliquez sur **"Back to Dashboard"**

4. Maintenant, créez le **OAuth Client ID** :
   - **Application type** : **Web application**
   - **Name** : `BTP Smart Pro - Google Calendar`
   - **Authorized redirect URIs** : Cliquez sur **"+ ADD URI"** et ajoutez :
     ```
     https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
     ```
   - Cliquez sur **"CREATE"**

5. **Une popup s'affichera** avec :
   - **Your Client ID** : `123456789-abc...` → **COPIEZ-LE**
   - **Your Client Secret** : `GOCSPX-abc...` → **COPIEZ-LE**

   ⚠️ **IMPORTANT** : Copiez ces valeurs **MAINTENANT** car le Client Secret ne sera plus visible après !

---

## 📸 À Quoi Ça Ressemble ?

### Dans Google Cloud Console :

```
APIs & Services
  └── Credentials
      └── OAuth 2.0 Client IDs
          └── [Votre Client]
              ├── Client ID: 123456789-abc... (visible)
              └── Client secret: GOCSPX-abc... (cliquez sur "Show")
```

---

## 🔐 Si Vous Avez Perdu le Client Secret

Si vous avez déjà créé le Client ID mais ne voyez plus le Client Secret :

1. Allez dans **Credentials**
2. Cliquez sur votre **OAuth Client ID**
3. Si le secret n'est pas visible, vous devez le **réinitialiser** :
   - Cliquez sur **"Reset secret"** ou **"Regenerate secret"**
   - ⚠️ **Attention** : Cela invalidera l'ancien secret
   - Copiez le nouveau secret immédiatement

---

## ✅ Checklist

- [ ] J'ai accédé à Google Cloud Console
- [ ] J'ai créé/configuré l'OAuth consent screen
- [ ] J'ai créé un OAuth Client ID (type: Web application)
- [ ] J'ai ajouté l'URL de redirection dans "Authorized redirect URIs"
- [ ] J'ai copié le **Client ID**
- [ ] J'ai copié le **Client Secret**
- [ ] J'ai activé **Google Calendar API** (APIs & Services → Library → Google Calendar API → Enable)

---

## 🚀 Prochaines Étapes

Une fois que vous avez le Client ID et Client Secret :

1. Allez sur Supabase : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. Section **"Secrets"**
3. Ajoutez les 3 secrets :
   - `GOOGLE_CLIENT_ID` = Votre Client ID
   - `GOOGLE_CLIENT_SECRET` = Votre Client Secret
   - `GOOGLE_REDIRECT_URI` = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce`

---

## 📞 Aide Supplémentaire

Si vous ne trouvez toujours pas :

1. **Vérifiez que vous êtes sur le bon projet** dans Google Cloud Console
2. **Vérifiez que vous avez les permissions** pour voir les credentials
3. **Essayez de créer un nouveau OAuth Client ID** si l'ancien pose problème

