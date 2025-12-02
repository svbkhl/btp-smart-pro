# 🚀 Configuration OAuth - Guide Rapide

## ✅ Code Frontend : DÉJÀ TERMINÉ

Tout le code est prêt ! Il ne reste qu'à configurer les providers dans Supabase.

---

## 📋 ÉTAPE 1 : Google OAuth (5 minutes)

### 1. Créer les Credentials Google

**Lien direct** : https://console.cloud.google.com/apis/credentials

1. **Créez un projet** (ou sélectionnez-en un)
2. **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth client ID**
4. Si demandé, configurez l'écran de consentement :
   - **User Type** : External
   - **App name** : Edifice Opus One
   - **User support email** : votre email
   - **Save and Continue** (2 fois)
5. **Application type** : Web application
6. **Name** : Edifice Opus One Web
7. **Authorized redirect URIs** :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
   ⚠️ Remplacez `renmjmqlmafqjzldmsgs` par votre Project Reference Supabase
8. **Create**
9. **COPIEZ** :
   - Client ID : `123456789-abc...`
   - Client Secret : `GOCSPX-abc...`

### 2. Configurer dans Supabase

**Lien direct** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/auth/providers

1. **Authentication** → **Providers**
2. Trouvez **Google**
3. **Activez** (toggle ON)
4. Collez :
   - **Client ID** : votre Client ID
   - **Client Secret** : votre Client Secret
5. **Save**

✅ **Google OAuth configuré !**

---

## 📋 ÉTAPE 2 : Apple OAuth (10 minutes)

### 1. Créer les Credentials Apple

**Lien direct** : https://developer.apple.com/account/resources/identifiers/list

**Prérequis** : Compte Apple Developer (99$/an)

1. **Identifiers** → **App IDs** → **+** (créer un App ID)
2. **Identifiers** → **Services IDs** → **+** (créer un Service ID)
   - **Description** : Edifice Opus One
   - **Identifier** : `com.edifice.opusone`
   - Cochez **Sign in with Apple**
   - **Configure** :
     - **Primary App ID** : sélectionnez votre App ID
     - **Website URLs** :
       - **Domains** : `renmjmqlmafqjzldmsgs.supabase.co`
       - **Return URLs** : `https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback`
     - **Save** → **Continue** → **Register**
3. **Keys** → **+** (créer une Key)
   - **Key Name** : Edifice Opus One OAuth
   - Cochez **Sign in with Apple**
   - **Configure** → **Primary App ID** → **Save** → **Continue** → **Register**
   - **⚠️ TÉLÉCHARGEZ le fichier `.p8`** (vous ne pourrez plus le télécharger)
   - **⚠️ NOTEZ le Key ID** (ex: `ABC123DEF4`)
   - **⚠️ NOTEZ le Team ID** (visible en haut de la page)

### 2. Configurer dans Supabase

**Lien direct** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/auth/providers

1. **Authentication** → **Providers**
2. Trouvez **Apple**
3. **Activez** (toggle ON)
4. Collez :
   - **Services ID** : `com.edifice.opusone`
   - **Secret Key** : contenu du fichier `.p8` (ouvrez-le avec un éditeur de texte)
   - **Key ID** : votre Key ID
   - **Team ID** : votre Team ID
5. **Save**

✅ **Apple OAuth configuré !**

---

## 📋 ÉTAPE 3 : Configurer les URLs de Redirection

**Lien direct** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/auth/url-configuration

1. **Authentication** → **URL Configuration**
2. **Site URL** :
   ```
   http://localhost:5173
   ```
3. **Redirect URLs** : Ajoutez :
   ```
   http://localhost:5173/**
   https://votre-domaine.vercel.app/**
   https://votre-domaine.vercel.app/complete-profile
   ```

---

## ✅ Checklist

- [ ] Google OAuth configuré dans Google Cloud Console
- [ ] Google OAuth activé dans Supabase Dashboard
- [ ] Apple OAuth configuré dans Apple Developer
- [ ] Apple OAuth activé dans Supabase Dashboard
- [ ] URLs de redirection configurées dans Supabase

---

## 🧪 Tester

1. Lancez l'app : `npm run dev`
2. Allez sur `/auth`
3. Cliquez sur **"Se connecter avec Google"** ou **"Se connecter avec Apple"**
4. Vous devriez être redirigé vers le provider
5. Après autorisation → `/complete-profile`
6. Remplissez nom, prénom, statut
7. → `/dashboard`

---

## ⚠️ Important

- **Google** : Gratuit, configuration rapide
- **Apple** : Nécessite un compte Apple Developer (99$/an)
- **Project Reference Supabase** : `renmjmqlmafqjzldmsgs` (remplacez par le vôtre)

---

**Temps total : 15-20 minutes** ⏱️

