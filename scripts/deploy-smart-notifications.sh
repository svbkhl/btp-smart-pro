#!/bin/bash

# Script de déploiement automatique du système de notifications
# Usage: ./scripts/deploy-smart-notifications.sh

set -e

echo "🚀 Déploiement du système de notifications automatisé"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI détecté${NC}"

# Vérifier que l'utilisateur est connecté
echo ""
echo -e "${YELLOW}📋 Vérification de la connexion Supabase...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vous n'êtes pas connecté à Supabase${NC}"
    echo "Exécutez: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Connecté à Supabase${NC}"

# Vérifier que le projet est lié
echo ""
echo -e "${YELLOW}📋 Vérification du projet lié...${NC}"
PROJECT_REF=$(supabase status | grep "Project URL" | awk '{print $3}' | cut -d'/' -f3 | cut -d'.' -f1 || echo "")

if [ -z "$PROJECT_REF" ]; then
    echo -e "${YELLOW}⚠️  Aucun projet lié${NC}"
    echo "Exécutez: supabase link --project-ref renmjmqlmafqjzldmsgs"
    exit 1
fi

echo -e "${GREEN}✅ Projet lié: $PROJECT_REF${NC}"

# Déployer la fonction smart-notifications
echo ""
echo -e "${YELLOW}📦 Déploiement de la fonction smart-notifications...${NC}"
if supabase functions deploy smart-notifications; then
    echo -e "${GREEN}✅ Fonction smart-notifications déployée${NC}"
else
    echo -e "${RED}❌ Erreur lors du déploiement${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Déploiement terminé !${NC}"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Exécutez AUTOMATED-NOTIFICATIONS-SYSTEM.sql dans Supabase SQL Editor"
echo "   2. Configurez les variables d'environnement (RESEND_API_KEY, CRON_SECRET)"
echo "   3. Exécutez CONFIGURE-CRON-JOBS.sql dans Supabase SQL Editor"
echo ""
echo "📄 Consultez DEPLOY-TOUT-AUTOMATIQUEMENT.md pour les instructions détaillées"

