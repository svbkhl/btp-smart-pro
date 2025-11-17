# 🔐 Configuration Google OAuth - Guide Étape par Étape

## 📋 Vue d'Ensemble

Ce guide vous accompagne pas à pas pour configurer la connexion Google dans votre application BTP Smart Pro.

**Temps estimé** : 15-20 minutes

---

## 🚀 ÉTAPE 1 : Activer Google OAuth dans Supabase (3 minutes)

### 1.1 Ouvrir Supabase Dashboard

1. Allez sur : **https://supabase.com/dashboard**
2. **Connectez-vous** à votre compte
3. **Sélectionnez votre projet** : `renmjmqlmafqjzldmsgs` (ou votre projet)

### 1.2 Activer le Provider Google

1. Dans le menu de gauche, cliquez sur **"Authentication"**
2. Cliquez sur **"Providers"** (sous Authentication)
3. Dans la liste des providers, trouvez **"Google"**
4. **Cliquez sur "Google"** pour ouvrir les paramètres
5. **Activez le toggle** "Enable Google provider" (en haut à droite)

**✅ Vous devriez voir** : Un formulaire avec deux champs :
- Client ID (for OAuth)
- Client Secret (for OAuth)

**⚠️ Laissez ces champs vides pour l'instant** - nous les remplirons après avoir créé les identifiants Google.

---

## 🚀 ÉTAPE 2 : Créer un Projet Google Cloud (5 minutes)

### 2.1 Accéder à Google Cloud Console

1. Allez sur : **https://console.cloud.google.com**
2. **Connectez-vous** avec votre compte Google
3. Si c'est votre première fois, acceptez les conditions d'utilisation

### 2.2 Créer un Nouveau Projet

1. En haut de la page, à côté de "Google Cloud", cliquez sur le **sélecteur de projet**
2. Cliquez sur **"New Project"**
3. **Nom du projet** : `BTP Smart Pro` (ou le nom de votre choix)
4. Cliquez sur **"Create"**
5. **Attendez quelques secondes** que le projet soit créé
6. **Sélectionnez le projet** dans le sélecteur en haut

### 2.3 Activer l'API Google+

1. Dans le menu de gauche, allez dans **"APIs & Services"** → **"Library"**
2. Dans la barre de recherche, tapez : **"Google+ API"**
3. Cliquez sur **"Google+ API"** dans les résultats
4. Cliquez sur le bouton **"Enable"** (Activer)
5. Attendez quelques secondes que l'API soit activée

---

## 🚀 ÉTAPE 3 : Créer les Identifiants OAuth (5 minutes)

### 3.1 Créer un OAuth Client ID

1. Dans le menu de gauche, allez dans **"APIs & Services"** → **"Credentials"**
2. En haut de la page, cliquez sur **"+ CREATE CREDENTIALS"**
3. Sélectionnez **"OAuth client ID"**

### 3.2 Configurer le Consent Screen (si demandé)

Si c'est la première fois que vous créez des identifiants OAuth, Google vous demandera de configurer le "OAuth consent screen" :

1. **User Type** : Sélectionnez **"External"** (pour un usage personnel/test)
2. Cliquez sur **"Create"**
3. **App name** : `BTP Smart Pro`
4. **User support email** : Votre email
5. **Developer contact information** : Votre email
6. Cliquez sur **"Save and Continue"**
7. **Scopes** : Laissez par défaut, cliquez sur **"Save and Continue"**
8. **Test users** : Vous pouvez ajouter votre email si vous voulez, sinon cliquez sur **"Save and Continue"**
9. **Summary** : Cliquez sur **"Back to Dashboard"**

### 3.3 Créer l'OAuth Client ID

1. Retournez dans **"APIs & Services"** → **"Credentials"**
2. Cliquez sur **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. **Application type** : Sélectionnez **"Web application"**
4. **Name** : `BTP Smart Pro Web Client`
5. **Authorized JavaScript origins** : Cliquez sur **"+ ADD URI"** et ajoutez :
   ```
   http://localhost:5173
   http://localhost:8080
   ```
   (Ajoutez votre domaine de production plus tard si nécessaire)
6. **Authorized redirect URIs** : Cliquez sur **"+ ADD URI"** et ajoutez :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
   ⚠️ **IMPORTANT** : Remplacez `renmjmqlmafqjzldmsgs` par votre **Project Reference** Supabase
   
   **Pour trouver votre Project Reference** :
   - Allez dans Supabase Dashboard → Settings → General
   - Copiez la valeur de "Reference ID"
7. Cliquez sur **"Create"**

### 3.4 Copier les Identifiants

1. **Une popup s'affiche** avec vos identifiants :
   - **Your Client ID** : `123456789-abcdefg.apps.googleusercontent.com`
   - **Your Client Secret** : `GOCSPX-abcdefghijklmnopqrstuvwxyz`
2. **Copiez les deux valeurs** (vous pouvez les fermer, elles sont aussi visibles dans la liste des credentials)

---

## 🚀 ÉTAPE 4 : Configurer dans Supabase (2 minutes)

### 4.1 Coller les Identifiants

1. **Retournez dans Supabase Dashboard** → Authentication → Providers → Google
2. **Collez les identifiants** :
   - **Client ID (for OAuth)** : Collez votre Client ID Google
   - **Client Secret (for OAuth)** : Collez votre Client Secret Google
3. Cliquez sur **"Save"** en bas

**✅ Vous devriez voir** : Un message de confirmation "Settings saved"

### 4.2 Configurer les URLs de Redirection

1. Dans Supabase Dashboard, allez dans **Authentication** → **URL Configuration**
2. Dans **"Redirect URLs"**, vérifiez que vous avez :
   ```
   http://localhost:5173/**
   http://localhost:8080/**
   ```
3. Si elles ne sont pas là, **ajoutez-les** et cliquez sur **"Save"**

---

## 🚀 ÉTAPE 5 : Configurer l'Assignation Automatique de Rôle (2 minutes)

### 5.1 Exécuter le Script SQL

1. Dans Supabase Dashboard, allez dans **SQL Editor** (menu de gauche)
2. Cliquez sur **"New query"**
3. **Ouvrez le fichier** : `supabase/CONFIGURE-GOOGLE-OAUTH.sql`
4. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
5. **Collez dans SQL Editor** (Cmd+V)
6. Cliquez sur **"Run"** (ou Cmd+Enter)

**✅ Vous devriez voir** : 
- `✅ Trigger créé avec succès !`
- `Les nouveaux utilisateurs (y compris OAuth) recevront automatiquement le rôle "dirigeant"`

---

## 🧪 ÉTAPE 6 : Tester la Connexion Google (2 minutes)

### 6.1 Tester dans l'Application

1. **Ouvrez** : http://localhost:5173/auth
2. **Vous devriez voir** : Le bouton "Continuer avec Google" sous le formulaire
3. **Cliquez sur** : "Continuer avec Google"
4. **Sélectionnez votre compte Google**
5. **Autorisez l'application** (si demandé)
6. **Vous serez redirigé** vers l'application

### 6.2 Vérifier le Rôle

1. **Allez dans** Supabase Dashboard → Table Editor → `user_roles`
2. **Vous devriez voir** : Une nouvelle entrée avec votre `user_id` et `role: "dirigeant"`

---

## 🐛 Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection dans Google Cloud Console ne correspond pas exactement à celle de Supabase

**Solution** :
1. Vérifiez que l'URL dans Google Cloud Console est exactement :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
2. Remplacez `renmjmqlmafqjzldmsgs` par votre Project Reference Supabase
3. Vérifiez qu'il n'y a pas d'espaces ou de caractères supplémentaires

### Erreur : "invalid_client"

**Cause** : Le Client ID ou Client Secret est incorrect

**Solution** :
1. Vérifiez que vous avez copié correctement les identifiants
2. Vérifiez qu'ils sont bien collés dans Supabase (sans espaces)
3. Vérifiez que le provider Google est bien activé dans Supabase

### Le bouton ne fait rien

**Cause** : Google OAuth n'est pas activé ou mal configuré

**Solution** :
1. Vérifiez que Google provider est activé dans Supabase
2. Vérifiez que Client ID et Client Secret sont configurés
3. Ouvrez la console du navigateur (F12) pour voir les erreurs

### L'utilisateur n'a pas de rôle après connexion

**Cause** : Le trigger SQL n'a pas été exécuté

**Solution** :
1. Exécutez le script `supabase/CONFIGURE-GOOGLE-OAUTH.sql`
2. Vérifiez que le trigger existe : 
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

---

## ✅ Checklist de Vérification

- [ ] Google OAuth activé dans Supabase Dashboard
- [ ] Projet Google Cloud créé
- [ ] API Google+ activée
- [ ] OAuth Client ID créé dans Google Cloud
- [ ] URLs de redirection configurées dans Google Cloud Console
- [ ] Client ID et Client Secret collés dans Supabase
- [ ] URLs de redirection configurées dans Supabase (URL Configuration)
- [ ] Script SQL exécuté (trigger pour assigner le rôle)
- [ ] Bouton "Continuer avec Google" visible sur /auth
- [ ] Connexion Google fonctionne
- [ ] Redirection après connexion fonctionne
- [ ] Rôle "dirigeant" assigné automatiquement

---

## 🎉 C'est Prêt !

Une fois toutes ces étapes terminées, vos utilisateurs pourront se connecter avec leur compte Google. Le rôle "dirigeant" sera assigné automatiquement aux nouveaux utilisateurs.

---

## 📝 Notes Importantes

- **Pour la production** : Ajoutez votre domaine de production dans les "Authorized JavaScript origins" et "Authorized redirect URIs" de Google Cloud Console
- **Sécurité** : Ne partagez jamais votre Client Secret publiquement
- **Test** : Testez toujours la connexion Google après chaque modification de configuration

