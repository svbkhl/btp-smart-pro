#!/usr/bin/env tsx
/**
 * Script de nettoyage automatisé du codebase
 * 
 * Usage: tsx scripts/cleanup-codebase.ts [--dry-run] [--fix]
 * 
 * Options:
 *   --dry-run: Affiche ce qui sera fait sans modifier les fichiers
 *   --fix: Applique automatiquement les corrections
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const SRC_DIR = join(PROJECT_ROOT, 'src');

interface CleanupResult {
  file: string;
  changes: string[];
  errors: string[];
}

const results: CleanupResult[] = [];
const DRY_RUN = process.argv.includes('--dry-run');
const FIX = process.argv.includes('--fix');

// ============================================
// UTILITAIRES
// ============================================

function getAllFiles(dir: string, extensions: string[] = ['.ts', '.tsx']): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Ignorer node_modules, .git, etc.
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...getAllFiles(fullPath, extensions));
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${dir}:`, error);
  }
  
  return files;
}

function readFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${filePath}:`, error);
    return '';
  }
}

function writeFile(filePath: string, content: string): void {
  if (DRY_RUN) {
    console.log(`[DRY-RUN] Écriture: ${relative(PROJECT_ROOT, filePath)}`);
    return;
  }
  
  try {
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Erreur lors de l'écriture de ${filePath}:`, error);
  }
}

// ============================================
// DÉTECTION CODE MORT
// ============================================

function findUnusedImports(content: string, filePath: string): string[] {
  const issues: string[] = [];
  const lines = content.split('\n');
  const imports: Map<string, number> = new Map();
  
  // Extraire tous les imports
  lines.forEach((line, index) => {
    const importMatch = line.match(/^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*)\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const importPath = importMatch[1];
      const importContent = importMatch[0];
      
      // Extraire les noms importés
      const namedImports = importContent.match(/\{([^}]+)\}/);
      if (namedImports) {
        const names = namedImports[1].split(',').map(n => n.trim().split(' as ')[0].trim());
        names.forEach(name => {
          imports.set(name, index);
        });
      }
    }
  });
  
  // Vérifier si les imports sont utilisés
  imports.forEach((lineNum, importName) => {
    const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
    const matches = content.match(usageRegex);
    const count = matches ? matches.length : 0;
    
    // Si l'import n'apparaît qu'une fois, c'est probablement juste dans la déclaration
    if (count <= 1) {
      issues.push(`Import non utilisé: ${importName} (ligne ${lineNum + 1})`);
    }
  });
  
  return issues;
}

function findUnusedExports(content: string, filePath: string): string[] {
  const issues: string[] = [];
  const exportRegex = /^export\s+(?:const|function|class|interface|type)\s+(\w+)/gm;
  const exports: string[] = [];
  
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Pour chaque export, vérifier s'il est utilisé ailleurs
  // (simplifié - en production, utiliser un AST parser)
  exports.forEach(exportName => {
    // Chercher dans tous les fichiers
    const allFiles = getAllFiles(SRC_DIR);
    let found = false;
    
    for (const file of allFiles) {
      if (file === filePath) continue;
      
      const fileContent = readFile(file);
      if (fileContent.includes(exportName)) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      issues.push(`Export non utilisé: ${exportName}`);
    }
  });
  
  return issues;
}

// ============================================
// NETTOYAGE CODE
// ============================================

function removeUnusedImports(content: string): { content: string; removed: string[] } {
  const removed: string[] = [];
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  // TODO: Implémenter la suppression réelle avec un AST parser
  // Pour l'instant, on détecte seulement
  
  return { content, removed };
}

function replaceAnyTypes(content: string, filePath: string): { content: string; replaced: number } {
  let replaced = 0;
  
  // Remplacer les `any` par des types plus spécifiques
  const patterns = [
    // any dans les paramètres de fonction
    {
      regex: /:\s*any(\s*[,)])/g,
      replacement: ': unknown$1',
      description: 'any → unknown dans paramètres',
    },
    // any dans les types de retour
    {
      regex: /:\s*any(\s*[;=])/g,
      replacement: ': unknown$1',
      description: 'any → unknown dans types',
    },
  ];
  
  let newContent = content;
  patterns.forEach(({ regex, replacement, description }) => {
    const matches = newContent.match(regex);
    if (matches) {
      newContent = newContent.replace(regex, replacement);
      replaced += matches.length;
      console.log(`  ✓ ${description}: ${matches.length} remplacements`);
    }
  });
  
  return { content: newContent, replaced };
}

function addErrorHandling(content: string, filePath: string): { content: string; added: number } {
  let added = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  // Détecter les appels API sans try/catch
  lines.forEach((line, index) => {
    const hasApiCall = /(supabase\.|fetch\(|\.invoke\()/.test(line);
    const hasTryCatch = /try\s*\{/.test(lines.slice(Math.max(0, index - 5), index + 1).join('\n'));
    
    if (hasApiCall && !hasTryCatch && index < lines.length - 10) {
      // TODO: Ajouter automatiquement try/catch
      // Pour l'instant, on détecte seulement
    }
    
    newLines.push(line);
  });
  
  return { content: newLines.join('\n'), added };
}

function standardizeImports(content: string): string {
  // Organiser les imports: React, puis librairies externes, puis imports locaux
  const lines = content.split('\n');
  const reactImports: string[] = [];
  const externalImports: string[] = [];
  const localImports: string[] = [];
  const otherLines: string[] = [];
  
  let inImports = true;
  
  lines.forEach(line => {
    if (line.trim().startsWith('import ')) {
      if (line.includes('react') || line.includes('React')) {
        reactImports.push(line);
      } else if (line.includes('@/') || line.includes('./') || line.includes('../')) {
        localImports.push(line);
      } else {
        externalImports.push(line);
      }
    } else if (line.trim() === '' && inImports) {
      // Ligne vide dans les imports
    } else {
      inImports = false;
      otherLines.push(line);
    }
  });
  
  // Réorganiser
  const organized = [
    ...reactImports,
    ...(reactImports.length > 0 && externalImports.length > 0 ? [''] : []),
    ...externalImports,
    ...(externalImports.length > 0 && localImports.length > 0 ? [''] : []),
    ...localImports,
    ...(localImports.length > 0 && otherLines.length > 0 ? [''] : []),
    ...otherLines,
  ];
  
  return organized.join('\n');
}

// ============================================
// VÉRIFICATIONS SÉCURITÉ
// ============================================

function checkServiceRoleUsage(content: string, filePath: string): string[] {
  const issues: string[] = [];
  
  const patterns = [
    /service_role/i,
    /SERVICE_ROLE/i,
    /serviceRole/i,
    /createClient.*service/i,
  ];
  
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      issues.push(`⚠️  Utilisation de service_role détectée (ligne probable) - À déplacer vers Edge Function`);
    }
  });
  
  return issues;
}

function checkErrorHandling(content: string, filePath: string): string[] {
  const issues: string[] = [];
  
  // Vérifier les appels API sans gestion d'erreur
  const apiCallRegex = /(supabase\.|fetch\(|\.invoke\()/g;
  const hasApiCalls = apiCallRegex.test(content);
  
  if (hasApiCalls) {
    const hasErrorHandling = /(try\s*\{|catch\s*\(|\.catch\()/.test(content);
    if (!hasErrorHandling) {
      issues.push(`⚠️  Appels API sans gestion d'erreur explicite`);
    }
  }
  
  return issues;
}

// ============================================
// MAIN
// ============================================

function processFile(filePath: string): CleanupResult {
  const result: CleanupResult = {
    file: relative(PROJECT_ROOT, filePath),
    changes: [],
    errors: [],
  };
  
  try {
    let content = readFile(filePath);
    const originalContent = content;
    
    // 1. Détecter les imports non utilisés
    const unusedImports = findUnusedImports(content, filePath);
    if (unusedImports.length > 0) {
      result.changes.push(`Imports non utilisés: ${unusedImports.length}`);
      if (FIX) {
        const { removed } = removeUnusedImports(content);
        if (removed.length > 0) {
          result.changes.push(`Supprimé: ${removed.join(', ')}`);
        }
      }
    }
    
    // 2. Détecter les exports non utilisés
    const unusedExports = findUnusedExports(content, filePath);
    if (unusedExports.length > 0) {
      result.changes.push(`Exports non utilisés: ${unusedExports.length}`);
    }
    
    // 3. Remplacer les `any`
    if (FIX) {
      const { content: newContent, replaced } = replaceAnyTypes(content, filePath);
      if (replaced > 0) {
        content = newContent;
        result.changes.push(`Types 'any' remplacés: ${replaced}`);
      }
    }
    
    // 4. Organiser les imports
    if (FIX) {
      content = standardizeImports(content);
      result.changes.push('Imports réorganisés');
    }
    
    // 5. Vérifications de sécurité
    const serviceRoleIssues = checkServiceRoleUsage(content, filePath);
    if (serviceRoleIssues.length > 0) {
      result.errors.push(...serviceRoleIssues);
    }
    
    const errorHandlingIssues = checkErrorHandling(content, filePath);
    if (errorHandlingIssues.length > 0) {
      result.errors.push(...errorHandlingIssues);
    }
    
    // Écrire les modifications
    if (FIX && content !== originalContent) {
      writeFile(filePath, content);
    }
    
  } catch (error) {
    result.errors.push(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return result;
}

function main() {
  console.log('🧹 Nettoyage du codebase...\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (simulation)' : FIX ? 'FIX (modification)' : 'ANALYSE (détection seulement)'}\n`);
  
  const files = getAllFiles(SRC_DIR);
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  files.forEach(file => {
    const result = processFile(file);
    if (result.changes.length > 0 || result.errors.length > 0) {
      results.push(result);
    }
  });
  
  // Afficher les résultats
  console.log('\n📊 RÉSULTATS\n');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    if (result.changes.length > 0 || result.errors.length > 0) {
      console.log(`\n📄 ${result.file}`);
      
      if (result.changes.length > 0) {
        result.changes.forEach(change => {
          console.log(`  ✓ ${change}`);
        });
      }
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`  ${error}`);
        });
      }
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Analyse terminée: ${results.length} fichiers avec des problèmes détectés`);
  
  if (DRY_RUN) {
    console.log('\n💡 Pour appliquer les corrections, exécutez: tsx scripts/cleanup-codebase.ts --fix');
  }
}

main();






