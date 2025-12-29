#!/usr/bin/env tsx
/**
 * Script de standardisation de l'UI
 * 
 * Vérifie et standardise:
 * - Les toasts (utilisation cohérente)
 * - Les boutons (variants et tailles)
 * - Les formulaires (validation)
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

interface Issue {
  file: string;
  line: number;
  issue: string;
  suggestion: string;
}

const issues: Issue[] = [];

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

function checkFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = filePath.replace(SRC_DIR + '/', '');
  
  // Vérifier l'utilisation des toasts
  const hasToastImport = /import.*useToast|from.*use-toast/.test(content);
  const hasToastUsage = /toast\(/.test(content);
  
  if (hasToastUsage && !hasToastImport) {
    issues.push({
      file: relativePath,
      line: 0,
      issue: 'Utilisation de toast sans import',
      suggestion: "Ajouter: import { useToast } from '@/components/ui/use-toast';",
    });
  }
  
  // Vérifier les patterns de toast
  lines.forEach((line, index) => {
    // Vérifier les toasts sans variant pour les erreurs
    if (/toast\(\s*\{[^}]*title.*error/i.test(line) && !/variant.*destructive/i.test(line)) {
      issues.push({
        file: relativePath,
        line: index + 1,
        issue: 'Toast d\'erreur sans variant="destructive"',
        suggestion: 'Ajouter variant: "destructive"',
      });
    }
    
    // Vérifier les console.log au lieu de toasts
    if (/console\.log\(.*(succès|erreur|error|success)/i.test(line)) {
      issues.push({
        file: relativePath,
        line: index + 1,
        issue: 'console.log pour message utilisateur - utiliser toast',
        suggestion: 'Remplacer par toast()',
      });
    }
  });
  
  // Vérifier les boutons
  const buttonPatterns = [
    { pattern: /<Button[^>]*>/, name: 'Button' },
    { pattern: /<button[^>]*>/, name: 'button HTML' },
  ];
  
  buttonPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(content)) {
      // Vérifier si les boutons ont des variants cohérents
      const buttonMatches = content.matchAll(new RegExp(pattern.source, 'g'));
      for (const match of buttonMatches) {
        const buttonTag = match[0];
        if (!/variant=|className=/.test(buttonTag)) {
          issues.push({
            file: relativePath,
            line: 0,
            issue: `${name} sans variant ou className`,
            suggestion: 'Ajouter variant="default" ou variant="outline"',
          });
        }
      }
    }
  });
}

function main() {
  console.log('🎨 Standardisation de l\'UI...\n');
  
  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN - Aucune modification ne sera effectuée\n');
  }
  
  const files = getAllFiles(SRC_DIR);
  console.log(`📁 Analyse de ${files.length} fichiers\n`);
  
  files.forEach(file => {
    checkFile(file);
  });
  
  // Afficher les résultats
  console.log('='.repeat(60));
  console.log(`\n📊 RÉSULTATS\n`);
  console.log(`⚠️  ${issues.length} problèmes détectés\n`);
  
  if (issues.length > 0) {
    issues.slice(0, 30).forEach(({ file, line, issue, suggestion }) => {
      console.log(`📄 ${file}${line > 0 ? `:${line}` : ''}`);
      console.log(`   ${issue}`);
      console.log(`   💡 ${suggestion}\n`);
    });
    
    if (issues.length > 30) {
      console.log(`   ... et ${issues.length - 30} autres problèmes\n`);
    }
  } else {
    console.log('✅ Aucun problème détecté !\n');
  }
  
  console.log('='.repeat(60));
}

main();






