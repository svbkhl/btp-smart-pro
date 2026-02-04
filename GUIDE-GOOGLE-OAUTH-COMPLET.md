# Guide Complet : Configuration Google OAuth pour Supabase

## 🎯 Objectif
Permettre aux utilisateurs de se connecter avec leur compte Google sur votre application BTP Smart Pro.

## ⚠️ IMPORTANT
Cette configuration est **100% manuelle**. Vous devez suivre chaque étape dans Google Cloud Console.

---

## 📋 PARTIE 1 : Créer un projet Google Cloud (si pas déjà fait)

### Étape 1.1 : Accéder à Google Cloud Console
1. Ouvrez un navigateur
2. Allez sur : https://console.cloud.google.com
3. Connectez-vous avec votre compte Google

### Étape 1.2 : Créer ou sélectionner un projet
**Si vous avez déjà un projet :**
1. En haut de la page, cliquez sur le nom du projet actuel
2. Une fenêtre s'ouvre avec la liste de vos projets
3. Cliquez sur le projet que vous voulez utiliser pour BTP Smart Pro

**Si vous n'avez pas de projet :**
1. En haut de la page, cliquez sur "Select a project"
2. Cliquez sur "NEW PROJECT"
3. Project name : Tapez "BTP Smart Pro"
4. Cliquez sur "CREATE"
5. Attendez quelques secondes
6. Une notification apparaît : "Project created"
7. Cliquez sur "SELECT PROJECT"

---

## 📋 PARTIE 2 : Configurer l'écran de consentement OAuth

### Étape 2.1 : Accéder à l'écran de consentement
1. Dans le menu de gauche, cliquez sur "APIs & Services"
2. Cliquez sur "OAuth consent screen"

### Étape 2.2 : Choisir le type d'utilisateur
Vous verrez 2 options :
- **Internal** : Seulement pour les utilisateurs de votre organisation Google Workspace
- **External** : Pour tous les utilisateurs Google

**Choisissez "External"** puis cliquez sur "CREATE"

### Étape 2.3 : Configurer les informations de l'app
**Page 1 : App information**
1. App name : `BTP Smart Pro`
2. User support email : Sélectionnez votre email
3. App logo : (optionnel, vous pouvez skip)
4. Application home page : (optionnel)
5. Developer contact email : Tapez votre email
6. Cliquez sur "SAVE AND CONTINUE"

**Page 2 : Scopes**
1. Ne touchez à rien
2. Cliquez sur "SAVE AND CONTINUE"

**Page 3 : Test users** (si vous êtes en mode External et pas encore publié)
1. Cliquez sur "+ ADD USERS"
2. Ajoutez votre email Google
3. Cliquez sur "ADD"
4. Cliquez sur "SAVE AND CONTINUE"

**Page 4 : Summary**
1. Vérifiez que tout est correct
2. Cliquez sur "BACK TO DASHBOARD"

---

## 📋 PARTIE 3 : Créer les credentials OAuth

### Étape 3.1 : Accéder aux Credentials
1. Dans le menu de gauche : "APIs & Services" → "Credentials"
2. Vous êtes maintenant sur la page des credentials

### Étape 3.2 : Créer un nouveau OAuth Client ID
1. En haut de la page, cliquez sur "+ CREATE CREDENTIALS"
2. Dans le menu déroulant, sélectionnez "OAuth client ID"

### Étape 3.3 : Configurer le OAuth Client
**Application type**
1. Sélectionnez "Web application"

**Name**
1. Tapez : `BTP Smart Pro - Supabase`

**Authorized JavaScript origins** (IGNOREZ cette section)
1. Ne touchez PAS à cette section
2. Laissez-la vide

**Authorized redirect URIs** (CRUCIAL !)
1. Cliquez sur "+ Add URI"
2. Un champ de texte apparaît
3. Copiez-collez EXACTEMENT cette URI :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
4. **ATTENTION :**
   - Vérifiez qu'il n'y a PAS d'espace avant ou après
   - Vérifiez que ça commence bien par `https://`
   - Vérifiez qu'il n'y a PAS de `/` à la fin
   - Vérifiez que c'est bien `.supabase.co` (pas `.com`)

5. Cliquez sur "CREATE"

### Étape 3.4 : Copier les credentials
Une popup s'ouvre avec vos credentials :

**Vous verrez :**
- **Your Client ID** : `123456789-abcdefg...xyz.apps.googleusercontent.com`
- **Your Client Secret** : `GOCSPX-Abc123...XYZ`

**IMPORTANT : COPIEZ CES 2 VALEURS MAINTENANT**

**Comment copier :**
1. Cliquez sur l'icône de copie (📋) à côté de "Client ID"
2. Collez dans un fichier texte temporaire (Notepad, Notes, etc.)
3. Cliquez sur l'icône de copie (📋) à côté de "Client Secret"
4. Collez dans le même fichier texte

**Exemple de ce que vous devriez avoir :**
```
Client ID: 212153492100-abc123xyz.apps.googleusercontent.com
Client Secret: GOCSPX-XYZ789ABC
```

5. Cliquez sur "OK" pour fermer la popup

---

## 📋 PARTIE 4 : Configurer Supabase

### Étape 4.1 : Accéder au Dashboard Supabase
1. Ouvrez un nouvel onglet
2. Allez sur : https://supabase.com/dashboard
3. Connectez-vous si nécessaire
4. Cliquez sur votre projet : **renmjmqlmafqjzldmsgs**

### Étape 4.2 : Activer le provider Google
1. Dans le menu de gauche, cliquez sur **Authentication**
2. Cliquez sur **Providers**
3. Scrollez jusqu'à trouver **Google** dans la liste

### Étape 4.3 : Configurer Google provider
1. Cliquez sur **Google** (toute la ligne)
2. Une section s'ouvre avec des champs

**Enabled**
1. Activez le toggle "Enable Sign in with Google"
2. Il devient vert/bleu

**Client ID (for OAuth)**
1. Cliquez dans le champ "Client ID"
2. Collez le Client ID que vous avez copié de Google Cloud Console
3. Format attendu : `xxx-yyy.apps.googleusercontent.com`

**Client Secret (for OAuth)**
1. Cliquez dans le champ "Client Secret"
2. Collez le Client Secret que vous avez copié de Google Cloud Console
3. Format attendu : `GOCSPX-xyz...`

**Redirect URL (for OAuth)**
1. NE TOUCHEZ PAS à ce champ
2. Il doit afficher automatiquement :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
3. Si ce n'est pas le cas, contactez le support Supabase

**Skip nonce check**
1. Laissez DÉCOCHÉ (désactivé)

**Authorized Client IDs**
1. Laissez VIDE

### Étape 4.4 : Sauvegarder
1. En bas de la section Google, cliquez sur **Save**
2. Une notification apparaît : "Successfully updated settings"
3. Attendez 5 secondes

---

## 📋 PARTIE 5 : Tester la connexion

### Étape 5.1 : Vider le cache
1. Fermez TOUS les onglets de votre navigateur
2. Fermez COMPLÈTEMENT le navigateur (Cmd+Q sur Mac, Alt+F4 sur Windows)
3. Attendez 2 secondes
4. Rouvrez le navigateur

### Étape 5.2 : Tester
1. Allez sur : http://localhost:4000
2. Vous voyez la page de connexion
3. Cliquez sur le bouton "Se connecter avec Google"

**Que se passe-t-il ?**

**Scénario 1 : ✅ Succès**
- Une popup Google s'ouvre
- Vous voyez la liste de vos comptes Google
- Vous sélectionnez un compte
- Google demande les permissions
- Vous cliquez sur "Autoriser" ou "Allow"
- La popup se ferme
- Vous êtes redirigé vers l'application
- Vous êtes connecté !

**Scénario 2 : ❌ Erreur "invalid_client"**
- Une page d'erreur Google s'affiche
- Message : "The OAuth client was not found"

**CAUSE :** Le Client ID dans Supabase ne correspond PAS à celui de Google Cloud Console

**SOLUTION :**
1. Retournez dans Google Cloud Console
2. APIs & Services → Credentials
3. Trouvez votre OAuth Client
4. Cliquez dessus
5. Vérifiez le Client ID affiché en haut
6. COPIEZ ce Client ID
7. Retournez dans Supabase Dashboard
8. Authentication → Providers → Google
9. REMPLACEZ le Client ID par celui que vous venez de copier
10. Save
11. Testez à nouveau

**Scénario 3 : ❌ Erreur "redirect_uri_mismatch"**
- Une page d'erreur Google s'affiche
- Message : "Error 400: redirect_uri_mismatch"

**CAUSE :** L'URI de redirection n'est pas configurée dans Google Cloud Console

**SOLUTION :**
1. Retournez dans Google Cloud Console
2. APIs & Services → Credentials
3. Trouvez votre OAuth Client
4. Cliquez dessus
5. Section "Authorized redirect URIs"
6. Vérifiez que cette URI existe :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
7. Si elle n'existe pas, cliquez sur "+ Add URI"
8. Collez l'URI ci-dessus
9. Cliquez sur "SAVE"
10. Attendez 30 secondes
11. Testez à nouveau

**Scénario 4 : ❌ Erreur "access_denied"**
- Google demande les permissions
- Vous cliquez sur "Refuser" ou "Cancel"

**SOLUTION :**
1. Recommencez le test
2. Cette fois, cliquez sur "Autoriser" ou "Allow"

---

## 🔍 Vérification finale

Après avoir suivi TOUTES les étapes, vérifiez :

### Dans Google Cloud Console
- [ ] OAuth Client créé
- [ ] Type : Web application
- [ ] Redirect URI : `https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback`
- [ ] Client ID copié
- [ ] Client Secret copié

### Dans Supabase Dashboard
- [ ] Authentication → Providers → Google
- [ ] Toggle "Enable Sign in with Google" : ACTIVÉ
- [ ] Client ID : Collé (même que Google Cloud Console)
- [ ] Client Secret : Collé (même que Google Cloud Console)
- [ ] Bouton "Save" : CLIQUÉ

### Test
- [ ] Navigateur fermé complètement
- [ ] Page http://localhost:4000 ouverte
- [ ] Bouton "Se connecter avec Google" cliqué
- [ ] Résultat : Connexion réussie ✅

---

## 📞 Support

Si après avoir suivi TOUTES les étapes le problème persiste :

**Informations à fournir :**
1. Votre Client ID (format : `xxx.apps.googleusercontent.com`)
2. L'erreur exacte affichée par Google
3. Une capture d'écran de la section "Authorized redirect URIs" dans Google Cloud Console
4. Une capture d'écran de la section Google dans Supabase Dashboard (masquez le Secret)

---

**Créé le :** 2026-02-04  
**Projet Supabase :** renmjmqlmafqjzldmsgs  
**Version :** 1.0
