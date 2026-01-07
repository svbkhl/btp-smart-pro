#!/bin/bash

# ============================================================================
# 🚀 Script de Déploiement Vercel - Frontend
# ============================================================================
# Déploie le frontend sur Vercel avec les dernières modifications
# ============================================================================

set -e

echo "🚀 Déploiement Vercel - Frontend"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier que Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️ Vercel CLI n'est pas installé${NC}"
    echo ""
    echo "Installation de Vercel CLI..."
    npm install -g vercel
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Impossible d'installer Vercel CLI${NC}"
        echo ""
        echo "📋 Alternative : Déployez via le Dashboard Vercel"
        echo "   1. Allez sur : https://vercel.com/dashboard"
        echo "   2. Sélectionnez votre projet"
        echo "   3. Allez dans Deployments"
        echo "   4. Cliquez sur 'Redeploy'"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Vercel CLI détecté${NC}"
echo ""

# Vérifier que l'utilisateur est connecté
echo -e "${YELLOW}📋 Vérification de la connexion Vercel...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️ Vous n'êtes pas connecté à Vercel${NC}"
    echo ""
    echo "Connexion à Vercel..."
    vercel login
fi

echo -e "${GREEN}✅ Connecté à Vercel${NC}"
echo ""

# Vérifier si le projet est lié
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${YELLOW}⚠️ Projet non lié à Vercel${NC}"
    echo ""
    echo "Liaison du projet..."
    vercel link
fi

echo -e "${BLUE}📦 Build du projet...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Le build a échoué (dossier dist non créé)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build réussi${NC}"
echo ""

# Déployer en production
echo -e "${BLUE}🚀 Déploiement en production...${NC}"
vercel --prod --yes

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Déploiement Vercel réussi !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "🔗 Votre site est en ligne sur Vercel"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Vérifiez le déploiement sur : https://vercel.com/dashboard"
echo "   2. Testez la connexion Google Calendar"
echo "   3. Vérifiez que la route /settings?tab=integrations fonctionne"
echo ""
