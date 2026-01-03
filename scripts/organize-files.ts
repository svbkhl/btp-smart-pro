#!/usr/bin/env tsx
/**
 * Script d'organisation des fichiers
 * 
 * Réorganise les fichiers selon une structure standardisée
 */

import { readdirSync, statSync, renameSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const SRC_DIR = join(PROJECT_ROOT, 'src');

const DRY_RUN = process.argv.includes('--dry-run');
const FIX = process.argv.includes('--fix');

// Structure cible
const TARGET_STRUCTURE = {
  'pages': {
    pattern: /^[A-Z].*\.tsx?$/,
    description: 'Pages (composants de route)',
  },
  'components': {
    subdirs: {
      'ui': 'Composants UI réutilisables (shadcn)',
      'layout': 'Composants de mise en page',
      'forms': 'Formulaires',
      'dialogs': 'Dialogs et modals',
      'widgets': 'Widgets pour dashboard',
      'admin': 'Composants admin',
      'billing': 'Composants facturation',
      'invoices': 'Composants factures',
      'quotes': 'Composants devis',
      'ai': 'Composants IA',
      'settings': 'Composants paramètres',
      'notifications': 'Composants notifications',
    },
  },
  'hooks': {
    description: 'Hooks React personnalisés',
  },
  'services': {
    description: 'Services et logique métier',
  },
  'utils': {
    description: 'Utilitaires et helpers',
  },
  'types': {
    description: 'Types TypeScript',
  },
  'lib': {
    description: 'Bibliothèques et helpers',
  },
};

interface FileMove {
  from: string;
  to: string;
  reason: string;
}

const moves: FileMove[] = [];

function analyzeStructure() {
  console.log('📁 Analyse de la structure actuelle...\n');
  
  const componentsDir = join(SRC_DIR, 'components');
  if (!existsSync(componentsDir)) {
    console.log('⚠️  Dossier components introuvable');
    return;
  }
  
  // Analyser les fichiers à la racine de components
  const rootFiles = readdirSync(componentsDir).filter(file => {
    const fullPath = join(componentsDir, file);
    return statSync(fullPath).isFile() && file.endsWith('.tsx');
  });
  
  console.log(`📄 ${rootFiles.length} fichiers à la racine de components/`);
  
  rootFiles.forEach(file => {
    const filePath = join(componentsDir, file);
    const content = require('fs').readFileSync(filePath, 'utf-8');
    
    // Déterminer la catégorie
    let targetDir = 'components';
    
    if (file.includes('Form')) {
      targetDir = 'components/forms';
    } else if (file.includes('Dialog') || file.includes('Modal')) {
      targetDir = 'components/dialogs';
    } else if (file.includes('Card') || file.includes('Button') || file.includes('Input')) {
      targetDir = 'components/ui';
    } else if (file.includes('Layout') || file.includes('Page')) {
      targetDir = 'components/layout';
    }
    
    if (targetDir !== 'components') {
      moves.push({
        from: filePath,
        to: join(SRC_DIR, targetDir, file),
        reason: `Déplacer vers ${targetDir}`,
      });
    }
  });
  
  console.log(`\n📦 ${moves.length} fichiers à réorganiser\n`);
}

function executeMoves() {
  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN - Aucune modification ne sera effectuée\n');
  }
  
  moves.forEach(({ from, to, reason }) => {
    console.log(`📦 ${relative(SRC_DIR, from)}`);
    console.log(`   → ${relative(SRC_DIR, to)}`);
    console.log(`   Raison: ${reason}\n`);
    
    if (FIX && !DRY_RUN) {
      try {
        // Créer le dossier de destination si nécessaire
        const targetDir = dirname(to);
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }
        
        renameSync(from, to);
        console.log(`   ✅ Déplacé\n`);
      } catch (error) {
        console.error(`   ❌ Erreur: ${error}\n`);
      }
    }
  });
}

function main() {
  console.log('🗂️  Organisation des fichiers\n');
  console.log('='.repeat(60) + '\n');
  
  analyzeStructure();
  
  if (moves.length > 0) {
    executeMoves();
    
    if (DRY_RUN) {
      console.log('\n💡 Pour appliquer les changements, exécutez:');
      console.log('   tsx scripts/organize-files.ts --fix\n');
    }
  } else {
    console.log('✅ Aucune réorganisation nécessaire\n');
  }
}

main();







