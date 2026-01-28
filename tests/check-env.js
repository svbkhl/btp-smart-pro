#!/usr/bin/env node

/**
 * Script de diagnostic pour vérifier les variables d'environnement
 * Usage: node tests/check-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 DIAGNOSTIC DES VARIABLES D\'ENVIRONNEMENT\n');
console.log('📂 Répertoire:', process.cwd());
console.log('');

// Vérifier les fichiers .env
const envFiles = [
  '.env',
  '.env.local',
  '.env.test',
];

console.log('📄 Fichiers .env détectés:');
envFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`  ${exists ? '✅' : '❌'} ${file} ${exists ? '(trouvé)' : '(absent)'}`);
});

console.log('');

// Parser un fichier .env
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  
  content.split('\n').forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      env[key] = value;
    }
  });
  
  return env;
}

// Charger toutes les variables
let allVars = {};
envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const vars = parseEnvFile(filePath);
  allVars = { ...allVars, ...vars };
});

// Vérifier les variables Supabase
console.log('🔑 Variables Supabase:');

const supabaseUrl = allVars.VITE_SUPABASE_URL;
const supabaseKey = allVars.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl) {
  console.log(`  ✅ VITE_SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
} else {
  console.log('  ❌ VITE_SUPABASE_URL: MANQUANTE');
}

if (supabaseKey) {
  console.log(`  ✅ VITE_SUPABASE_ANON_KEY: ${supabaseKey.substring(0, 30)}...`);
} else {
  console.log('  ❌ VITE_SUPABASE_ANON_KEY: MANQUANTE');
}

console.log('');

// Conclusion
if (supabaseUrl && supabaseKey) {
  console.log('✅ TOUT EST BON ! Les tests devraient fonctionner.\n');
  process.exit(0);
} else {
  console.log('❌ ERREUR: Variables manquantes dans .env\n');
  console.log('💡 Solution:');
  console.log('   1. Vérifiez que le fichier .env existe');
  console.log('   2. Ajoutez ces lignes à .env:');
  console.log('');
  console.log('      VITE_SUPABASE_URL=votre_url_supabase');
  console.log('      VITE_SUPABASE_ANON_KEY=votre_clé_anon');
  console.log('');
  process.exit(1);
}
