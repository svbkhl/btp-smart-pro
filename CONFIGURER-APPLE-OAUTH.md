# 🍎 Guide : Configuration Apple Sign In (Sign in with Apple)

## ✅ Ce qui a été créé

Une fonctionnalité de connexion avec Apple a été ajoutée à la page d'authentification, en complément de Google.

### Fonctionnalités
- ✅ Bouton "Continuer avec Apple" sur la page de connexion
- ✅ Bouton "Continuer avec Apple" sur la page d'inscription
- ✅ Redirection automatique après connexion Apple réussie
- ✅ Gestion des rôles après connexion OAuth

---

## 🚀 Configuration dans Supabase (OBLIGATOIRE)

### Étape 1 : Activer Apple OAuth dans Supabase

1. **Ouvrez Supabase Dashboard** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans** : Authentication → Providers (menu de gauche)
4. **Trouvez "Apple"** dans la liste des providers
5. **Cliquez sur "Apple"** pour l'activer
6. **Activez le toggle** "Enable Apple provider"

### Étape 2 : Configurer Apple OAuth

#### A. Créer un App ID dans Apple Developer (si vous n'en avez pas)

1. **Allez sur** : https://developer.apple.com/account
2. **Connectez-vous** avec votre compte Apple Developer
   - ⚠️ **Important** : Un compte Apple Developer payant ($99/an) est requis
3. **Allez dans** : Certificates, Identifiers & Profiles
4. **Cliquez sur** : Identifiers → "+" (créer un nouvel identifiant)
5. **Sélectionnez** : "App IDs" → Continue
6. **Remplissez** :
   - **Description** : `BTP Smart Pro`
   - **Bundle ID** : `com.btpsmartpro.app` (ou votre identifiant unique)
   - **Capabilities** : Cochez "Sign In with Apple"
7. **Cliquez sur** : Continue → Register

#### B. Créer un Service ID

1. **Dans Apple Developer**, allez dans : Identifiers
2. **Cliquez sur** : "+" → "Services IDs" → Continue
3. **Remplissez** :
   - **Description** : `BTP Smart Pro Web`
   - **Identifier** : `com.btpsmartpro.web` (ou votre identifiant unique)
4. **Cliquez sur** : Continue → Register
5. **Configurez le Service ID** :
   - Cochez "Sign In with Apple"
   - Cliquez sur "Configure"
   - **Primary App ID** : Sélectionnez l'App ID créé précédemment
   - **Website URLs** :
     - **Domains** : `renmjmqlmafqjzldmsgs.supabase.co`
     - **Return URLs** : `https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback`
     - ⚠️ Remplacez `renmjmqlmafqjzldmsgs` par votre Project Reference Supabase
   - Cliquez sur "Save" → "Continue" → "Register"

#### C. Créer une Clé (Key)

1. **Dans Apple Developer**, allez dans : Keys
2. **Cliquez sur** : "+" (créer une nouvelle clé)
3. **Remplissez** :
   - **Key Name** : `BTP Smart Pro Sign In Key`
   - **Enable** : "Sign In with Apple"
4. **Cliquez sur** : Continue → Register
5. **Téléchargez la clé** :
   - ⚠️ **IMPORTANT** : Vous ne pourrez la télécharger qu'une seule fois
   - Cliquez sur "Download" et sauvegardez le fichier `.p8`
   - **Notez le Key ID** affiché (ex: `ABC123DEF4`)

#### D. Créer un Client Secret

1. **Générez un Client Secret** en utilisant la clé téléchargée :
   - Vous pouvez utiliser un outil en ligne ou un script Node.js
   - Ou utilisez cette commande (si vous avez Node.js) :
   ```bash
   npm install -g @supabase/auth-helpers
   # Puis suivez les instructions pour générer le secret
   ```

2. **Alternative** : Utilisez un générateur en ligne :
   - https://appleid.apple.com/signinwithapple/button
   - Ou créez un script simple avec la bibliothèque `jsonwebtoken`

3. **Le Client Secret** est un JWT qui doit être régénéré tous les 6 mois

#### E. Configurer dans Supabase

1. **Retournez dans Supabase Dashboard** → Authentication → Providers → Apple
2. **Collez les identifiants** :
   - **Services ID** : Votre Service ID (ex: `com.btpsmartpro.web`)
   - **Secret Key** : Votre Client Secret (JWT généré)
   - **Team ID** : Votre Team ID Apple Developer (trouvable dans Membership)
   - **Key ID** : Le Key ID de la clé créée (ex: `ABC123DEF4`)
3. **Cliquez sur** : "Save"

### Étape 3 : Configurer l'URL de redirection

1. **Dans Supabase Dashboard** → Authentication → URL Configuration
2. **Vérifiez que "Redirect URLs" contient** :
   ```
   http://localhost:5173/**
   http://localhost:8080/**
   https://votre-domaine.com/**
   ```
3. **Ajoutez les URLs si nécessaire** et cliquez sur "Save"

---

## 🧪 Tester la Connexion Apple

### 1. Vérifier la configuration

1. **Ouvrez** : http://localhost:5173/auth
2. **Vous devriez voir** : Le bouton "Continuer avec Apple" sous le bouton Google

### 2. Tester la connexion

1. **Cliquez sur** : "Continuer avec Apple"
2. **Sélectionnez votre compte Apple**
3. **Autorisez l'application** (si demandé)
4. **Vous serez redirigé** vers l'application

### 3. Vérifier le rôle

Après la première connexion Apple :
- L'utilisateur sera créé automatiquement dans Supabase Auth
- **Par défaut**, il n'aura pas de rôle dans `user_roles`
- **Il sera redirigé vers** `/dashboard` (comme dirigeant par défaut)

**Pour assigner un rôle** :
1. Allez dans Supabase Dashboard → Table Editor → `user_roles`
2. Trouvez l'utilisateur (par email)
3. Ajoutez une entrée avec `role: "dirigeant"` ou `role: "salarie"`

---

## 🔧 Générer le Client Secret Apple

Le Client Secret Apple est un JWT qui doit être généré avec votre clé privée. Voici comment le faire :

### Option 1 : Utiliser un script Node.js

Créez un fichier `generate-apple-secret.js` :

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const teamId = 'YOUR_TEAM_ID'; // Votre Team ID Apple
const keyId = 'YOUR_KEY_ID'; // Le Key ID de votre clé
const privateKey = fs.readFileSync('path/to/your/key.p8', 'utf8');

const clientSecret = jwt.sign(
  {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000, // 6 mois
    aud: 'https://appleid.apple.com',
    sub: 'YOUR_SERVICE_ID', // Votre Service ID
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: keyId,
  }
);

console.log('Client Secret:', clientSecret);
```

Exécutez :
```bash
node generate-apple-secret.js
```

### Option 2 : Utiliser un outil en ligne

- Recherchez "Apple Sign In Client Secret Generator" sur Google
- Utilisez un outil fiable qui génère le JWT

---

## 🐛 Dépannage

### Erreur : "Invalid client"

**Cause** : Le Service ID ou le Client Secret est incorrect

**Solution** :
1. Vérifiez que le Service ID correspond exactement
2. Vérifiez que le Client Secret n'a pas expiré (valable 6 mois)
3. Régénérez le Client Secret si nécessaire

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection n'est pas configurée correctement dans Apple Developer

**Solution** :
1. Vérifiez que l'URL dans Apple Developer est exactement :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
2. Remplacez `renmjmqlmafqjzldmsgs` par votre project reference Supabase

### Le bouton ne fait rien

**Cause** : Apple OAuth n'est pas activé dans Supabase

**Solution** :
1. Vérifiez que Apple provider est activé dans Supabase
2. Vérifiez que tous les champs sont remplis (Service ID, Secret Key, Team ID, Key ID)

### Le Client Secret expire

**Cause** : Le Client Secret Apple expire après 6 mois

**Solution** :
1. Régénérez le Client Secret avec votre clé privée
2. Mettez à jour le secret dans Supabase Dashboard

---

## ✅ Checklist de Vérification

- [ ] Compte Apple Developer actif ($99/an)
- [ ] App ID créé avec "Sign In with Apple" activé
- [ ] Service ID créé et configuré
- [ ] Clé (Key) créée et téléchargée (.p8)
- [ ] Client Secret généré (JWT)
- [ ] Apple OAuth activé dans Supabase Dashboard
- [ ] Service ID, Secret Key, Team ID, Key ID configurés dans Supabase
- [ ] URL de redirection configurée dans Apple Developer
- [ ] URLs de redirection configurées dans Supabase (URL Configuration)
- [ ] Bouton "Continuer avec Apple" visible sur la page /auth
- [ ] Connexion Apple fonctionne
- [ ] Redirection après connexion fonctionne
- [ ] Rôle assigné à l'utilisateur (optionnel : via trigger)

---

## 📝 Notes Importantes

- **Coût** : Un compte Apple Developer coûte $99/an (obligatoire)
- **Client Secret** : Doit être régénéré tous les 6 mois
- **Sécurité** : Ne partagez jamais votre clé privée (.p8) ou votre Client Secret
- **Test** : Testez toujours la connexion Apple après chaque modification de configuration

---

## 🎉 C'est Prêt !

La connexion avec Apple est maintenant disponible. Les utilisateurs peuvent se connecter avec leur compte Apple au lieu de créer un compte avec email/mot de passe.

**Note** : Apple Sign In est particulièrement utile pour les utilisateurs iOS/Mac qui préfèrent utiliser leur identifiant Apple.

