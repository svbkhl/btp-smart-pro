#!/bin/bash
# Script principal de nettoyage complet du codebase

set -e

echo "🧹 NETTOYAGE COMPLET DU CODEBASE"
echo "================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier les dépendances
echo -e "${YELLOW}📦 Vérification des dépendances...${NC}"
if ! command -v tsx &> /dev/null; then
    echo -e "${RED}❌ tsx n'est pas installé. Installez-le avec: npm install -g tsx${NC}"
    exit 1
fi

# 2. Linter
echo -e "\n${YELLOW}🔍 Exécution du linter...${NC}"
npm run lint -- --fix || true

# 3. Vérification des appels API
echo -e "\n${YELLOW}🔍 Vérification des appels API...${NC}"
tsx scripts/check-api-calls.ts

# 4. Nettoyage du code
echo -e "\n${YELLOW}🧹 Nettoyage du code...${NC}"
tsx scripts/cleanup-codebase.ts --fix

# 5. Organisation des fichiers (optionnel)
read -p "Voulez-vous réorganiser les fichiers ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}🗂️  Organisation des fichiers...${NC}"
    tsx scripts/organize-files.ts --fix
fi

# 6. Formatage avec Prettier
echo -e "\n${YELLOW}💅 Formatage du code...${NC}"
if command -v prettier &> /dev/null; then
    npx prettier --write "src/**/*.{ts,tsx}" || true
else
    echo -e "${YELLOW}⚠️  Prettier n'est pas installé. Installez-le avec: npm install -D prettier${NC}"
fi

# 7. Vérification TypeScript
echo -e "\n${YELLOW}🔍 Vérification TypeScript...${NC}"
npx tsc --noEmit || true

echo -e "\n${GREEN}✅ Nettoyage terminé !${NC}"
echo ""
echo "📊 Résumé:"
echo "  - Code nettoyé"
echo "  - Imports organisés"
echo "  - Types vérifiés"
echo "  - Appels API vérifiés"
echo ""






