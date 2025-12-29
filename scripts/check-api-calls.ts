#!/usr/bin/env tsx
/**
 * Script de vérification des appels API
 * 
 * Vérifie que:
 * - Les Edge Functions sont correctement appelées
 * - Aucune clé service_role dans le frontend
 * - Les erreurs sont gérées
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const SRC_DIR = join(PROJECT_ROOT, 'src');

interface ApiIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

const issues: ApiIssue[] = [];

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
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // 1. Vérifier les clés service_role
    if (/service_role|SERVICE_ROLE|serviceRole/i.test(line)) {
      issues.push({
        file: relativePath,
        line: lineNum,
        issue: 'Utilisation de service_role dans le frontend - À déplacer vers Edge Function',
        severity: 'error',
      });
    }
    
    // 2. Vérifier les appels Edge Functions
    if (/supabase\.functions\.invoke/.test(line)) {
      // Vérifier si l'erreur est gérée
      const context = lines.slice(Math.max(0, index - 10), Math.min(lines.length, index + 10)).join('\n');
      if (!/\.catch\(|try\s*\{|error/.test(context)) {
        issues.push({
          file: relativePath,
          line: lineNum,
          issue: 'Appel Edge Function sans gestion d\'erreur explicite',
          severity: 'warning',
        });
      }
    }
    
    // 3. Vérifier les appels Supabase directs
    if (/supabase\.(from|auth|storage)\./.test(line)) {
      const context = lines.slice(Math.max(0, index - 10), Math.min(lines.length, index + 10)).join('\n');
      if (!/\.catch\(|try\s*\{|error/.test(context)) {
        issues.push({
          file: relativePath,
          line: lineNum,
          issue: 'Appel Supabase sans gestion d\'erreur explicite',
          severity: 'warning',
        });
      }
    }
    
    // 4. Vérifier les fetch() sans gestion d'erreur
    if (/fetch\(/.test(line) && !/supabase/.test(line)) {
      const context = lines.slice(Math.max(0, index - 10), Math.min(lines.length, index + 10)).join('\n');
      if (!/\.catch\(|try\s*\{|error/.test(context)) {
        issues.push({
          file: relativePath,
          line: lineNum,
          issue: 'Appel fetch() sans gestion d\'erreur',
          severity: 'warning',
        });
      }
    }
  });
}

function main() {
  console.log('🔍 Vérification des appels API...\n');
  
  const files = getAllFiles(SRC_DIR);
  console.log(`📁 Analyse de ${files.length} fichiers\n`);
  
  files.forEach(file => {
    checkFile(file);
  });
  
  // Afficher les résultats
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');
  
  console.log('='.repeat(60));
  console.log(`\n📊 RÉSULTATS\n`);
  console.log(`❌ Erreurs: ${errors.length}`);
  console.log(`⚠️  Avertissements: ${warnings.length}`);
  console.log(`ℹ️  Infos: ${infos.length}\n`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERREURS (à corriger immédiatement):\n');
    errors.forEach(({ file, line, issue }) => {
      console.log(`  ${file}:${line}`);
      console.log(`    ${issue}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS (à améliorer):\n');
    warnings.slice(0, 20).forEach(({ file, line, issue }) => {
      console.log(`  ${file}:${line}`);
      console.log(`    ${issue}\n`);
    });
    
    if (warnings.length > 20) {
      console.log(`  ... et ${warnings.length - 20} autres avertissements\n`);
    }
  }
  
  console.log('='.repeat(60));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ Aucun problème détecté !\n');
  } else {
    console.log(`\n💡 Total: ${issues.length} problèmes détectés\n`);
    process.exit(errors.length > 0 ? 1 : 0);
  }
}

main();






