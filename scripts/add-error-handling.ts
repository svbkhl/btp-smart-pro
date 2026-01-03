#!/usr/bin/env tsx
/**
 * Script pour ajouter automatiquement la gestion d'erreurs
 * 
 * Ajoute des try/catch et des toasts pour les appels API
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const SRC_DIR = join(PROJECT_ROOT, 'src');

const DRY_RUN = process.argv.includes('--dry-run');
const FIX = process.argv.includes('--fix');

interface Fix {
  file: string;
  line: number;
  original: string;
  fixed: string;
}

const fixes: Fix[] = [];

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...getAllFiles(fullPath));
    } else if (entry.isFile() && ['.ts', '.tsx'].includes(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function addErrorHandling(content: string, filePath: string): string {
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Détecter les fonctions async sans try/catch
    if (/async\s+(?:const|function|\().*=/.test(line) || /const\s+\w+\s*=\s*async\s*\(/.test(line)) {
      // Chercher le début de la fonction
      let funcStart = i;
      let braceCount = 0;
      let hasTryCatch = false;
      
      // Vérifier si la fonction a déjà un try/catch
      const funcContent = lines.slice(i, Math.min(i + 50, lines.length)).join('\n');
      if (/try\s*\{/.test(funcContent)) {
        hasTryCatch = true;
      }
      
      if (!hasTryCatch) {
        // Chercher les appels API dans la fonction
        const hasApiCall = /(supabase\.|fetch\(|\.invoke\()/.test(funcContent);
        
        if (hasApiCall) {
          // TODO: Ajouter automatiquement try/catch
          // Pour l'instant, on détecte seulement
        }
      }
    }
    
    newLines.push(line);
    i++;
  }
  
  return newLines.join('\n');
}

function main() {
  console.log('🛠️  Ajout de la gestion d'erreurs...\n');
  
  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN - Aucune modification ne sera effectuée\n');
  }
  
  const files = getAllFiles(SRC_DIR);
  console.log(`📁 Analyse de ${files.length} fichiers\n`);
  
  files.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const fixed = addErrorHandling(content, file);
    
    if (fixed !== content && FIX && !DRY_RUN) {
      writeFileSync(file, fixed, 'utf-8');
      console.log(`✅ ${file.replace(SRC_DIR + '/', '')}`);
    }
  });
  
  console.log('\n✅ Analyse terminée\n');
}

main();







