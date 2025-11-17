#!/usr/bin/env node
/**
 * Script pour créer une copie client sans données de démo
 * Usage: npm run create:client <client-name>
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ClientConfig {
  name: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  email?: string;
  phone?: string;
}

function createClientCopy(clientName: string, config: Partial<ClientConfig> = {}) {
  console.log(`🚀 Création de la copie client : ${clientName}\n`);

  const clientConfig: ClientConfig = {
    name: clientName,
    companyName: config.companyName || `${clientName} BTP`,
    logoUrl: config.logoUrl || '',
    primaryColor: config.primaryColor || '#3b82f6',
    email: config.email || `contact@${clientName.toLowerCase().replace(/\s+/g, '-')}.fr`,
    phone: config.phone || '+33 1 XX XX XX XX'
  };

  // 1. Créer le dossier client
  const clientDir = join(__dirname, '../clients', clientName);
  if (existsSync(clientDir)) {
    console.error(`❌ Le dossier client ${clientName} existe déjà`);
    process.exit(1);
  }

  mkdirSync(clientDir, { recursive: true });
  console.log(`✅ Dossier créé : ${clientDir}`);

  // 2. Créer le fichier .env.client
  const envTemplate = readFileSync(join(__dirname, '../.env.example'), 'utf-8');
  const envClient = envTemplate
    .replace(/VITE_SUPABASE_URL=.*/g, `VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'}`)
    .replace(/VITE_SUPABASE_PUBLISHABLE_KEY=.*/g, `VITE_SUPABASE_PUBLISHABLE_KEY=${process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'YOUR_KEY'}`)
    + `\n# Configuration client\n`
    + `VITE_CLIENT_NAME=${clientConfig.name}\n`
    + `VITE_CLIENT_COMPANY_NAME=${clientConfig.companyName}\n`
    + `VITE_CLIENT_LOGO_URL=${clientConfig.logoUrl}\n`
    + `VITE_CLIENT_PRIMARY_COLOR=${clientConfig.primaryColor}\n`
    + `VITE_APP_DEMO=false\n`;

  writeFileSync(join(clientDir, '.env'), envClient);
  console.log('✅ Fichier .env créé');

  // 3. Créer le fichier de configuration client
  const configFile = {
    client: clientConfig,
    createdAt: new Date().toISOString(),
    instructions: {
      deployment: {
        vercel: `vercel --env-file ${clientDir}/.env`,
        netlify: `netlify deploy --env-file ${clientDir}/.env`,
        supabase: 'Utilisez Supabase Dashboard pour configurer les variables d\'environnement'
      },
      database: {
        step1: 'Exécutez la migration : supabase db reset',
        step2: 'Purgez les données de démo : npm run purge:demo',
        step3: 'Optionnel : Seedez les données client spécifiques'
      }
    }
  };

  writeFileSync(
    join(clientDir, 'client-config.json'),
    JSON.stringify(configFile, null, 2)
  );
  console.log('✅ Fichier de configuration créé');

  // 4. Créer le README client
  const readme = `# Configuration Client : ${clientConfig.companyName}

## Informations

- **Nom client** : ${clientConfig.name}
- **Entreprise** : ${clientConfig.companyName}
- **Créé le** : ${new Date().toLocaleDateString('fr-FR')}

## Déploiement

### Vercel
\`\`\`bash
cd ${clientDir}
vercel --env-file .env
\`\`\`

### Netlify
\`\`\`bash
cd ${clientDir}
netlify deploy --env-file .env
\`\`\`

## Base de données

1. Connectez-vous à Supabase Dashboard
2. Créez un nouveau projet ou utilisez un projet existant
3. Exécutez les migrations : \`supabase db reset\`
4. Purgez les données de démo : \`npm run purge:demo\`

## Personnalisation

Modifiez les variables dans \`.env\` :
- \`VITE_CLIENT_COMPANY_NAME\` : Nom de l'entreprise
- \`VITE_CLIENT_LOGO_URL\` : URL du logo
- \`VITE_CLIENT_PRIMARY_COLOR\` : Couleur principale (hex)

## Support

Pour toute question, consultez \`README_DEMO.md\` à la racine du projet.
`;

  writeFileSync(join(clientDir, 'README.md'), readme);
  console.log('✅ README client créé');

  console.log(`\n✅ Copie client créée avec succès !`);
  console.log(`\n📁 Dossier : ${clientDir}`);
  console.log(`\n📋 Prochaines étapes :`);
  console.log(`   1. Configurez les variables dans ${clientDir}/.env`);
  console.log(`   2. Purgez les données de démo : npm run purge:demo`);
  console.log(`   3. Déployez selon vos besoins (Vercel/Netlify/Supabase)`);
}

// Main
const clientName = process.argv[2];

if (!clientName) {
  console.error('❌ Usage: npm run create:client <client-name>');
  console.error('   Exemple: npm run create:client acme-construction');
  process.exit(1);
}

// Lire la config optionnelle depuis un fichier JSON
const configPath = join(__dirname, `../clients/${clientName}-config.json`);
let config: Partial<ClientConfig> = {};

if (existsSync(configPath)) {
  config = JSON.parse(readFileSync(configPath, 'utf-8'));
}

createClientCopy(clientName, config);

