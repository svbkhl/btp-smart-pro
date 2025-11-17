# 🍎 Configuration Apple Sign In - Guide Complet Automatisé

## ✅ Ce qui a été créé

1. ✅ **Fonction `handleSignInWithApple`** dans `src/pages/Auth.tsx`
2. ✅ **Boutons "Continuer avec Apple"** (connexion + inscription)
3. ✅ **Script de génération** : `scripts/generate-apple-secret.js`
4. ✅ **Guide complet** : `CONFIGURER-APPLE-OAUTH.md`

---

## 🚀 Configuration en 4 Étapes

### 📋 Étape 1 : Installer les Dépendances (1 minute)

```bash
cd /Users/sabrikhalfallah/Downloads/edifice-opus-one-main
npm install jsonwebtoken
```

---

### 📋 Étape 2 : Créer les Identifiants Apple Developer (10 minutes)

#### A. Créer un App ID

1. **Allez sur** : https://developer.apple.com/account
2. **Connectez-vous** avec votre compte Apple Developer
3. **Allez dans** : Certificates, Identifiers & Profiles → Identifiers
4. **Cliquez sur** : "+" (créer un nouvel identifiant)
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
   - **Placez le fichier .p8** dans le dossier du projet

#### D. Trouver votre Team ID

1. **Dans Apple Developer**, allez dans : Membership
2. **Copiez votre Team ID** (ex: `ABC123DEF4`)

---

### 📋 Étape 3 : Générer le Client Secret (2 minutes)

#### Option A : Via le Script Automatique (Recommandé)

1. **Placez votre clé .p8** dans le dossier du projet (ex: `apple-key.p8`)

2. **Configurez les variables** dans `scripts/generate-apple-secret.js` :
   ```javascript
   const CONFIG = {
     teamId: 'VOTRE_TEAM_ID',        // Ex: ABC123DEF4
     keyId: 'VOTRE_KEY_ID',          // Ex: XYZ789GHI1
     serviceId: 'com.btpsmartpro.web', // Votre Service ID
     privateKeyPath: './apple-key.p8', // Chemin vers votre clé .p8
   };
   ```

3. **Exécutez le script** :
   ```bash
   node scripts/generate-apple-secret.js
   ```

4. **Copiez le Client Secret** généré

#### Option B : Via Variables d'Environnement

```bash
APPLE_TEAM_ID="ABC123DEF4" \
APPLE_KEY_ID="XYZ789GHI1" \
APPLE_SERVICE_ID="com.btpsmartpro.web" \
APPLE_KEY_PATH="./apple-key.p8" \
node scripts/generate-apple-secret.js
```

#### Option C : Manuellement (Si vous préférez)

Utilisez un outil en ligne ou créez votre propre script avec `jsonwebtoken`.

---

### 📋 Étape 4 : Configurer dans Supabase (2 minutes)

1. **Ouvrez Supabase Dashboard** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans** : Authentication → Providers → Apple
4. **Activez le toggle** "Enable Apple provider"
5. **Remplissez les champs** :
   - **Services ID** : Votre Service ID (ex: `com.btpsmartpro.web`)
   - **Secret Key** : Le Client Secret généré (JWT)
   - **Team ID** : Votre Team ID Apple Developer
   - **Key ID** : Le Key ID de votre clé
6. **Cliquez sur** : "Save"

---

## 🧪 Tester la Connexion Apple

1. **Ouvrez** : http://localhost:5173/auth
2. **Cliquez sur** : "Continuer avec Apple"
3. **Sélectionnez votre compte Apple**
4. **Autorisez l'application**
5. **Vous serez redirigé** vers l'application

---

## 🔧 Script de Génération Automatique

Le script `scripts/generate-apple-secret.js` :
- ✅ Génère automatiquement le Client Secret (JWT)
- ✅ Calcule la date d'expiration (6 mois)
- ✅ Affiche toutes les informations nécessaires
- ✅ Sauvegarde le secret dans un fichier
- ✅ Donne des instructions claires

**Pour l'utiliser** :
```bash
# 1. Installer jsonwebtoken
npm install jsonwebtoken

# 2. Configurer les variables dans le script
# 3. Placer votre clé .p8 dans le projet
# 4. Exécuter
node scripts/generate-apple-secret.js
```

---

## 🐛 Dépannage

### Erreur : "jsonwebtoken not found"

**Solution** :
```bash
npm install jsonwebtoken
```

### Erreur : "Fichier de clé introuvable"

**Solution** :
1. Vérifiez que le fichier .p8 est dans le bon dossier
2. Vérifiez le chemin dans `CONFIG.privateKeyPath`

### Erreur : "Invalid client" dans Supabase

**Solution** :
1. Vérifiez que le Service ID correspond exactement
2. Vérifiez que le Client Secret n'a pas expiré
3. Régénérez le Client Secret si nécessaire

---

## ✅ Checklist Complète

- [ ] Compte Apple Developer actif ($99/an)
- [ ] App ID créé avec "Sign In with Apple"
- [ ] Service ID créé et configuré
- [ ] Clé (Key) créée et téléchargée (.p8)
- [ ] Team ID noté
- [ ] Key ID noté
- [ ] Script de génération configuré
- [ ] Client Secret généré
- [ ] Apple OAuth activé dans Supabase
- [ ] Tous les champs remplis dans Supabase
- [ ] Connexion Apple testée

---

## 🎉 C'est Prêt !

Une fois toutes ces étapes terminées, vos utilisateurs pourront se connecter avec leur compte Apple. Le rôle "dirigeant" sera assigné automatiquement grâce au trigger SQL.

---

## 📝 Notes Importantes

- **Coût** : Un compte Apple Developer coûte $99/an (obligatoire)
- **Client Secret** : Doit être régénéré tous les 6 mois (utilisez le script)
- **Sécurité** : Ne partagez jamais votre clé privée (.p8)
- **Test** : Testez toujours après chaque modification

---

## 🔄 Régénérer le Client Secret (Dans 6 mois)

Quand le Client Secret expire (après 6 mois) :

1. **Exécutez à nouveau le script** :
   ```bash
   node scripts/generate-apple-secret.js
   ```

2. **Mettez à jour dans Supabase** :
   - Authentication → Providers → Apple
   - Remplacez l'ancien Secret Key par le nouveau
   - Cliquez sur "Save"

C'est tout ! Le nouveau secret est valable pour 6 mois supplémentaires.

