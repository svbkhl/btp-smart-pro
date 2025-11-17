#!/usr/bin/env node

/**
 * Script pour générer le Client Secret Apple (JWT)
 * 
 * Usage:
 *   node scripts/generate-apple-secret.js
 * 
 * Prérequis:
 *   - npm install jsonwebtoken
 *   - Avoir la clé .p8 téléchargée depuis Apple Developer
 *   - Connaître votre Team ID, Key ID, et Service ID
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// ⚠️ CONFIGUREZ CES VARIABLES AVANT D'EXÉCUTER LE SCRIPT
const CONFIG = {
  // Votre Team ID Apple Developer (trouvable dans Membership)
  teamId: process.env.APPLE_TEAM_ID || 'YOUR_TEAM_ID',
  
  // Le Key ID de la clé créée dans Apple Developer
  keyId: process.env.APPLE_KEY_ID || 'YOUR_KEY_ID',
  
  // Votre Service ID (ex: com.btpsmartpro.web)
  serviceId: process.env.APPLE_SERVICE_ID || 'YOUR_SERVICE_ID',
  
  // Chemin vers votre clé .p8 téléchargée depuis Apple Developer
  privateKeyPath: process.env.APPLE_KEY_PATH || './apple-key.p8',
};

function generateAppleClientSecret() {
  try {
    // Vérifier que la clé existe
    if (!fs.existsSync(CONFIG.privateKeyPath)) {
      console.error('❌ Erreur : Fichier de clé introuvable');
      console.error(`   Chemin attendu : ${CONFIG.privateKeyPath}`);
      console.error('');
      console.error('📝 Instructions :');
      console.error('   1. Téléchargez votre clé .p8 depuis Apple Developer');
      console.error('   2. Placez-la dans le dossier du projet');
      console.error('   3. Mettez à jour APPLE_KEY_PATH dans le script');
      process.exit(1);
    }

    // Lire la clé privée
    const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8');

    // Vérifier les variables
    if (CONFIG.teamId === 'YOUR_TEAM_ID' || 
        CONFIG.keyId === 'YOUR_KEY_ID' || 
        CONFIG.serviceId === 'YOUR_SERVICE_ID') {
      console.error('❌ Erreur : Variables non configurées');
      console.error('');
      console.error('📝 Configurez ces variables dans le script :');
      console.error('   - teamId : Votre Team ID Apple Developer');
      console.error('   - keyId : Le Key ID de votre clé');
      console.error('   - serviceId : Votre Service ID');
      console.error('');
      console.error('💡 Ou utilisez les variables d\'environnement :');
      console.error('   APPLE_TEAM_ID=xxx APPLE_KEY_ID=xxx APPLE_SERVICE_ID=xxx APPLE_KEY_PATH=./key.p8 node scripts/generate-apple-secret.js');
      process.exit(1);
    }

    // Calculer la date d'expiration (6 mois)
    const now = Math.floor(Date.now() / 1000);
    const expiration = now + (6 * 30 * 24 * 60 * 60); // 6 mois en secondes

    // Créer le JWT (Client Secret)
    const clientSecret = jwt.sign(
      {
        iss: CONFIG.teamId,
        iat: now,
        exp: expiration,
        aud: 'https://appleid.apple.com',
        sub: CONFIG.serviceId,
      },
      privateKey,
      {
        algorithm: 'ES256',
        keyid: CONFIG.keyId,
      }
    );

    console.log('');
    console.log('✅ Client Secret Apple généré avec succès !');
    console.log('');
    console.log('📋 Informations :');
    console.log(`   Team ID : ${CONFIG.teamId}`);
    console.log(`   Key ID : ${CONFIG.keyId}`);
    console.log(`   Service ID : ${CONFIG.serviceId}`);
    console.log(`   Expiration : ${new Date(expiration * 1000).toLocaleDateString('fr-FR')} (6 mois)`);
    console.log('');
    console.log('🔑 CLIENT SECRET (à copier dans Supabase) :');
    console.log('');
    console.log(clientSecret);
    console.log('');
    console.log('📝 Instructions :');
    console.log('   1. Copiez le Client Secret ci-dessus');
    console.log('   2. Allez dans Supabase Dashboard → Authentication → Providers → Apple');
    console.log('   3. Collez le Client Secret dans le champ "Secret Key"');
    console.log('   4. Remplissez aussi :');
    console.log('      - Service ID : ' + CONFIG.serviceId);
    console.log('      - Team ID : ' + CONFIG.teamId);
    console.log('      - Key ID : ' + CONFIG.keyId);
    console.log('');
    console.log('⚠️  IMPORTANT :');
    console.log('   - Ce secret expire dans 6 mois');
    console.log('   - Régénérez-le avant expiration avec ce script');
    console.log('   - Ne partagez jamais votre clé privée (.p8)');
    console.log('');

    // Sauvegarder dans un fichier (optionnel)
    const outputFile = './apple-client-secret.txt';
    fs.writeFileSync(outputFile, clientSecret);
    console.log(`💾 Secret sauvegardé dans : ${outputFile}`);
    console.log('');

    return clientSecret;
  } catch (error) {
    console.error('❌ Erreur lors de la génération du Client Secret :');
    console.error(error.message);
    console.error('');
    
    if (error.message.includes('jsonwebtoken')) {
      console.error('💡 Solution : Installez jsonwebtoken');
      console.error('   npm install jsonwebtoken');
    }
    
    if (error.message.includes('PEM')) {
      console.error('💡 Solution : Vérifiez que votre fichier .p8 est valide');
    }
    
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  generateAppleClientSecret();
}

module.exports = { generateAppleClientSecret };

