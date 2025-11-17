# 🍎 Script de Génération du Client Secret Apple

## 📋 Utilisation Rapide

### 1. Installer les Dépendances

```bash
npm install jsonwebtoken
```

### 2. Télécharger votre Clé Apple

1. Allez sur https://developer.apple.com/account
2. Keys → Téléchargez votre clé .p8
3. Placez-la dans le projet : `apple-key.p8`

### 3. Configurer le Script

Ouvrez `scripts/generate-apple-secret.js` et modifiez :

```javascript
const CONFIG = {
  teamId: 'VOTRE_TEAM_ID',           // Ex: ABC123DEF4
  keyId: 'VOTRE_KEY_ID',             // Ex: XYZ789GHI1
  serviceId: 'com.btpsmartpro.web',  // Votre Service ID
  privateKeyPath: './apple-key.p8',  // Chemin vers votre clé
};
```

### 4. Exécuter le Script

```bash
node scripts/generate-apple-secret.js
```

### 5. Copier le Client Secret

Le script affichera le Client Secret à copier dans Supabase.

---

## 🔧 Utilisation avec Variables d'Environnement

```bash
APPLE_TEAM_ID="ABC123DEF4" \
APPLE_KEY_ID="XYZ789GHI1" \
APPLE_SERVICE_ID="com.btpsmartpro.web" \
APPLE_KEY_PATH="./apple-key.p8" \
node scripts/generate-apple-secret.js
```

---

## 📝 Où Trouver les Informations

- **Team ID** : Apple Developer → Membership
- **Key ID** : Apple Developer → Keys → Votre clé
- **Service ID** : Apple Developer → Identifiers → Services IDs
- **Clé .p8** : Apple Developer → Keys → Download (une seule fois !)

---

## ⚠️ Important

- Le Client Secret expire après 6 mois
- Régénérez-le avant expiration avec ce script
- Ne partagez jamais votre clé .p8

