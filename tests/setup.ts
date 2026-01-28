/**
 * Setup file for Vitest
 * Charge les variables d'environnement avant l'exécution des tests
 */

import { loadEnv } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CHARGEMENT DES VARIABLES D'ENVIRONNEMENT
// ============================================================================

/**
 * Fonction pour parser manuellement un fichier .env
 * Plus fiable que loadEnv dans certains contextes
 */
function loadEnvFile(filePath: string): Record<string, string> {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const env: Record<string, string> = {};

    content.split('\n').forEach((line) => {
      // Ignorer les commentaires et lignes vides
      if (!line || line.trim().startsWith('#')) {
        return;
      }

      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';

        // Retirer les guillemets
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        env[key] = value;
      }
    });

    return env;
  } catch (error) {
    console.error('Erreur lors du chargement de', filePath, ':', error);
    return {};
  }
}

// Charger les variables depuis .env (plusieurs tentatives)
const cwd = process.cwd();
let env: Record<string, string> = {};

// Essayer différentes méthodes
const envFiles = [
  path.join(cwd, '.env'),
  path.join(cwd, '.env.local'),
  path.join(cwd, '.env.test'),
];

for (const file of envFiles) {
  const loaded = loadEnvFile(file);
  env = { ...env, ...loaded };
}

// Fallback: utiliser loadEnv de Vite
if (Object.keys(env).length === 0) {
  env = loadEnv('test', cwd, '');
}

// Injecter dans process.env
Object.keys(env).forEach((key) => {
  if (key.startsWith('VITE_') && !process.env[key]) {
    process.env[key] = env[key];
  }
});

// Log de diagnostic
console.log('\n🔧 Setup des tests - Variables d\'environnement:');
console.log('  📂 Répertoire de travail:', cwd);
console.log('  📄 Fichiers .env trouvés:', envFiles.filter(f => fs.existsSync(f)));
console.log('  ✅ VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✓ Chargée' : '✗ Manquante');
console.log('  ✅ VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✓ Chargée' : '✗ Manquante');
console.log('');
