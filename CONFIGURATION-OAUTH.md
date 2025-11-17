# 🔐 Configuration OAuth (Google & Apple)

Ce guide vous explique comment configurer les connexions OAuth avec Google et Apple dans Supabase.

## 📋 Prérequis

- Un projet Supabase créé et configuré
- Accès au dashboard Supabase
- Comptes développeur Google et Apple (si nécessaire)

---

## 🔵 Configuration Google OAuth

### Étape 1 : Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Allez dans **APIs & Services** > **Credentials**

### Étape 2 : Créer les identifiants OAuth

1. Cliquez sur **Create Credentials** > **OAuth client ID**
2. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - Type d'application : **External**
   - Nom de l'application : **BTP Smart Pro** (ou votre nom)
   - Email de support : votre email
   - Domaines autorisés : votre domaine (ex: `votredomaine.com`)
   - Cliquez sur **Save and Continue** jusqu'à la fin

3. Créez l'OAuth client ID :
   - Type d'application : **Web application**
   - Nom : **BTP Smart Pro Web Client**
   - **Authorized JavaScript origins** :
     ```
     http://localhost:5000
     http://localhost:5173
     https://votredomaine.com
     ```
   - **Authorized redirect URIs** :
     ```
     https://votre-projet.supabase.co/auth/v1/callback
     http://localhost:5000/auth/v1/callback
     ```
   - Cliquez sur **Create**

4. **Copiez** :
   - **Client ID** (ex: `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret** (ex: `GOCSPX-abcdefghijklmnop`)

### Étape 3 : Configurer dans Supabase

1. Dans votre projet Supabase, allez dans **Authentication** > **Providers**
2. Trouvez **Google** dans la liste
3. Activez le toggle **Enable Google provider**
4. Entrez :
   - **Client ID (for OAuth)** : votre Client ID Google
   - **Client Secret (for OAuth)** : votre Client Secret Google
5. Cliquez sur **Save**

---

## 🍎 Configuration Apple OAuth

### Étape 1 : Créer un identifiant de service Apple

1. Allez sur [Apple Developer Portal](https://developer.apple.com/)
2. Connectez-vous avec votre compte développeur
3. Allez dans **Certificates, Identifiers & Profiles**
4. Cliquez sur **Identifiers** > **+** (en haut à gauche)
5. Sélectionnez **Services IDs** > **Continue**
6. Entrez :
   - **Description** : BTP Smart Pro
   - **Identifier** : `com.votredomaine.btpsmartpro` (format reverse domain)
7. Cochez **Sign in with Apple** > **Continue** > **Register**

### Étape 2 : Configurer Sign in with Apple

1. Cliquez sur l'identifiant que vous venez de créer
2. Cochez **Sign in with Apple** > **Configure**
3. **Primary App ID** : sélectionnez votre App ID principal
4. **Website URLs** :
   - **Domains and Subdomains** : `votredomaine.com`
   - **Return URLs** :
     ```
     https://votre-projet.supabase.co/auth/v1/callback
     ```
5. Cliquez sur **Save** puis **Continue** > **Register**

### Étape 3 : Créer une clé pour Sign in with Apple

1. Allez dans **Keys** > **+** (en haut à gauche)
2. Entrez un **Key Name** : `BTP Smart Pro Sign in with Apple`
3. Cochez **Sign in with Apple** > **Configure**
4. Sélectionnez votre **Primary App ID** > **Save** > **Continue** > **Register**
5. **Téléchargez la clé** (fichier `.p8`) - **IMPORTANT** : vous ne pourrez la télécharger qu'une seule fois
6. **Copiez** le **Key ID** affiché

### Étape 4 : Obtenir votre Team ID

1. Dans Apple Developer Portal, allez dans **Membership**
2. **Copiez** votre **Team ID** (ex: `ABC123DEF4`)

### Étape 5 : Configurer dans Supabase

1. Dans votre projet Supabase, allez dans **Authentication** > **Providers**
2. Trouvez **Apple** dans la liste
3. Activez le toggle **Enable Apple provider**
4. Entrez :
   - **Services ID** : votre Services ID (ex: `com.votredomaine.btpsmartpro`)
   - **Secret Key** : le contenu du fichier `.p8` téléchargé (ouvrez-le dans un éditeur de texte)
   - **Key ID** : votre Key ID
   - **Team ID** : votre Team ID
5. Cliquez sur **Save**

---

## ✅ Vérification

### Tester Google OAuth

1. Redémarrez votre application : `npm run dev`
2. Allez sur la page d'authentification
3. Cliquez sur **Se connecter avec Google**
4. Vous devriez être redirigé vers Google pour vous connecter
5. Après connexion, vous serez redirigé vers `/dashboard`

### Tester Apple OAuth

1. Allez sur la page d'authentification
2. Cliquez sur **Se connecter avec Apple**
3. Vous devriez être redirigé vers Apple pour vous connecter
4. Après connexion, vous serez redirigé vers `/dashboard`

---

## ⚠️ Notes importantes

### Pour le développement local

- Les URLs de redirection doivent inclure `http://localhost:5000` ou `http://localhost:5173`
- Assurez-vous que le port correspond à celui de votre serveur de développement

### Pour la production

- Remplacez les URLs `localhost` par votre domaine de production
- Utilisez `https://` pour tous les URLs de production
- Mettez à jour les **Authorized redirect URIs** dans Google Cloud Console

### Sécurité

- **Ne commitez JAMAIS** vos clés secrètes dans Git
- Utilisez des variables d'environnement pour les secrets en production
- Les clés OAuth sont stockées de manière sécurisée dans Supabase

---

## 🆘 Problèmes courants

### Erreur : "redirect_uri_mismatch"

**Solution** : Vérifiez que l'URL de redirection dans Google Cloud Console correspond exactement à celle configurée dans Supabase.

### Erreur : "Invalid client"

**Solution** : Vérifiez que le Client ID et le Client Secret sont corrects dans Supabase.

### Apple OAuth ne fonctionne pas

**Solution** : 
- Vérifiez que votre compte Apple Developer est actif
- Assurez-vous que le fichier `.p8` est correctement copié (sans espaces supplémentaires)
- Vérifiez que le Services ID, Key ID et Team ID sont corrects

---

## 📚 Ressources

- [Documentation Supabase OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Documentation Google OAuth](https://developers.google.com/identity/protocols/oauth2)
- [Documentation Apple Sign in](https://developer.apple.com/sign-in-with-apple/)

