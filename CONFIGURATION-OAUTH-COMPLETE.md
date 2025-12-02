# 🔐 Configuration OAuth Google et Apple - Guide Complet

## ✅ État Actuel du Code

### Frontend (Code) ✅ TERMINÉ

- ✅ **Boutons Google/Apple** dans l'onglet "Connexion"
- ✅ **Boutons Google/Apple** dans l'onglet "Inscription"
- ✅ **Fonctions `handleGoogleSignIn` et `handleAppleSignIn`** implémentées
- ✅ **Redirection vers `/complete-profile`** après OAuth
- ✅ **Page `CompleteProfile.tsx`** pour collecter nom, prénom, statut
- ✅ **Vérification automatique** des métadonnées utilisateur
- ✅ **Assignation automatique de rôle** via trigger SQL

### Backend (Supabase Dashboard) ⚠️ À CONFIGURER

La configuration OAuth doit être faite **manuellement dans le dashboard Supabase**.

---

## 📋 ÉTAPE 1 : Configurer Google OAuth dans Supabase

### A. Créer un Projet Google Cloud

1. Allez sur : **https://console.cloud.google.com/**
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur **Create Credentials** → **OAuth client ID**
5. Si demandé, configurez l'écran de consentement OAuth :
   - **User Type** : External
   - **App name** : Edifice Opus One (ou votre nom)
   - **User support email** : votre email
   - **Developer contact** : votre email
   - Cliquez sur **Save and Continue**
   - Ajoutez votre email dans **Test users** (optionnel)
   - Cliquez sur **Save and Continue**
6. **Application type** : Web application
7. **Name** : Edifice Opus One Web
8. **Authorized redirect URIs** : 
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
   ⚠️ **Remplacez `renmjmqlmafqjzldmsgs` par votre Project Reference Supabase**
9. Cliquez sur **Create**
10. **⚠️ COPIEZ** :
    - **Client ID** (ex: `123456789-abc...`)
    - **Client Secret** (ex: `GOCSPX-abc...`)

### B. Configurer dans Supabase Dashboard

1. Allez sur : **https://supabase.com/dashboard**
2. Sélectionnez votre projet : **renmjmqlmafqjzldmsgs**
3. Allez dans **Authentication** → **Providers**
4. Trouvez **Google** dans la liste
5. **Activez Google** (toggle ON)
6. Collez :
   - **Client ID (for OAuth)** : votre Client ID Google
   - **Client Secret (for OAuth)** : votre Client Secret Google
7. Cliquez sur **Save**

---

## 📋 ÉTAPE 2 : Configurer Apple OAuth dans Supabase

### A. Créer un App ID et Service ID dans Apple Developer

1. Allez sur : **https://developer.apple.com/account/**
2. Allez dans **Certificates, Identifiers & Profiles**
3. **Identifiers** → **App IDs** → Créez un nouvel App ID
4. **Identifiers** → **Services IDs** → Créez un nouveau Service ID
   - **Description** : Edifice Opus One
   - **Identifier** : `com.edifice.opusone` (ou votre identifiant)
   - Cochez **Sign in with Apple**
   - Cliquez sur **Configure**
   - **Primary App ID** : sélectionnez votre App ID
   - **Website URLs** :
     - **Domains** : `renmjmqlmafqjzldmsgs.supabase.co`
     - **Return URLs** : `https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback`
   - Cliquez sur **Save** puis **Continue** puis **Register**
5. **Keys** → Créez une nouvelle clé :
   - **Key Name** : Edifice Opus One OAuth
   - Cochez **Sign in with Apple**
   - Cliquez sur **Configure**
   - **Primary App ID** : sélectionnez votre App ID
   - Cliquez sur **Save** puis **Continue** puis **Register**
   - **⚠️ TÉLÉCHARGEZ le fichier `.p8`** (vous ne pourrez plus le télécharger après)
   - **⚠️ NOTEZ le Key ID** (ex: `ABC123DEF4`)

### B. Configurer dans Supabase Dashboard

1. Dans **Supabase Dashboard** → **Authentication** → **Providers**
2. Trouvez **Apple** dans la liste
3. **Activez Apple** (toggle ON)
4. Collez :
   - **Services ID** : votre Service ID (ex: `com.edifice.opusone`)
   - **Secret Key** : contenu du fichier `.p8` téléchargé
   - **Key ID** : votre Key ID (ex: `ABC123DEF4`)
   - **Team ID** : votre Team ID Apple (trouvable dans https://developer.apple.com/account/)
5. Cliquez sur **Save**

---

## 📋 ÉTAPE 3 : Configurer les URLs de Redirection

### Dans Supabase Dashboard

1. Allez dans **Authentication** → **URL Configuration**
2. **Site URL** : 
   ```
   http://localhost:5173
   ```
   (pour le développement local)

3. **Redirect URLs** : Ajoutez :
   ```
   http://localhost:5173/**
   https://votre-domaine.vercel.app/**
   https://votre-domaine.vercel.app/complete-profile
   ```

---

## 📋 ÉTAPE 4 : Vérifier le Code SQL (Déjà Appliqué)

Le trigger SQL pour assigner automatiquement le rôle "administrateur" aux nouveaux utilisateurs OAuth est déjà configuré via `supabase/CONFIGURE-GOOGLE-OAUTH.sql`.

---

## ✅ Checklist de Configuration

### Google OAuth
- [ ] Projet Google Cloud créé
- [ ] OAuth Client ID créé
- [ ] Redirect URI configuré dans Google Cloud
- [ ] Client ID et Secret ajoutés dans Supabase Dashboard
- [ ] Google OAuth activé dans Supabase

### Apple OAuth
- [ ] Compte Apple Developer actif
- [ ] App ID créé
- [ ] Service ID créé avec Sign in with Apple
- [ ] Key créée avec Sign in with Apple
- [ ] Fichier `.p8` téléchargé
- [ ] Service ID, Secret Key, Key ID, Team ID ajoutés dans Supabase Dashboard
- [ ] Apple OAuth activé dans Supabase

### Configuration Générale
- [ ] Site URL configuré dans Supabase
- [ ] Redirect URLs configurées
- [ ] Trigger SQL pour assignation de rôle appliqué

---

## 🧪 Tester la Configuration

### Test Google OAuth

1. Lancez l'application : `npm run dev`
2. Allez sur `/auth`
3. Cliquez sur **"Se connecter avec Google"**
4. Vous devriez être redirigé vers Google pour autoriser
5. Après autorisation, vous devriez être redirigé vers `/complete-profile`
6. Remplissez nom, prénom, statut
7. Vous devriez être redirigé vers `/dashboard`

### Test Apple OAuth

1. Lancez l'application : `npm run dev`
2. Allez sur `/auth`
3. Cliquez sur **"Se connecter avec Apple"**
4. Vous devriez être redirigé vers Apple pour autoriser
5. Après autorisation, vous devriez être redirigé vers `/complete-profile`
6. Remplissez nom, prénom, statut
7. Vous devriez être redirigé vers `/dashboard`

---

## ❓ Problèmes Courants

### "redirect_uri_mismatch" (Google)

**Solution** : Vérifiez que l'URL de redirection dans Google Cloud Console correspond exactement à :
```
https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
```

### "Invalid client" (Apple)

**Solution** : Vérifiez que :
- Le Service ID est correct
- Le fichier `.p8` est bien collé (sans espaces)
- Le Key ID et Team ID sont corrects

### Redirection vers `/complete-profile` ne fonctionne pas

**Solution** : Vérifiez que :
- L'URL de redirection est bien configurée dans `handleGoogleSignIn` et `handleAppleSignIn`
- La route `/complete-profile` existe dans `App.tsx`

---

## 📝 Résumé

### ✅ Code Frontend : TERMINÉ
- Tous les boutons et fonctions sont implémentés
- La page `CompleteProfile` est fonctionnelle
- La redirection est configurée

### ⚠️ Configuration Backend : À FAIRE
- Configurer Google OAuth dans Supabase Dashboard
- Configurer Apple OAuth dans Supabase Dashboard
- Configurer les URLs de redirection

**Une fois la configuration Supabase terminée, tout fonctionnera !** 🚀

