#!/bin/bash
# Script pour exécuter automatiquement le fix Google OAuth

echo "🚀 EXÉCUTION DU FIX GOOGLE OAUTH"
echo "================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📍 ÉTAPE 1 : Vérification des prérequis${NC}"
echo ""

# Vérifier que le fichier SQL existe
if [ ! -f "supabase/CONFIGURE-GOOGLE-OAUTH.sql" ]; then
    echo -e "${RED}❌ ERREUR : Le fichier supabase/CONFIGURE-GOOGLE-OAUTH.sql n'existe pas${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Fichier SQL trouvé${NC}"
echo ""

echo -e "${YELLOW}⚠️  ATTENTION : Ce script va vous guider pour exécuter le fix OAuth${NC}"
echo ""
echo "Pour corriger l'erreur 'OAuth client was not found', vous devez :"
echo ""
echo -e "${BLUE}1️⃣  CRÉER LES IDENTIFIANTS GOOGLE${NC}"
echo "   👉 Ouvrez : https://console.cloud.google.com/apis/credentials"
echo "   👉 Créez un OAuth Client ID (Web application)"
echo "   👉 Ajoutez l'URI : https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback"
echo ""
echo -e "${BLUE}2️⃣  CONFIGURER SUPABASE${NC}"
echo "   👉 Ouvrez : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/auth/providers"
echo "   👉 Activez Google Provider"
echo "   👉 Collez Client ID et Client Secret"
echo ""
echo -e "${BLUE}3️⃣  EXÉCUTER LE SCRIPT SQL${NC}"
echo "   👉 Ouvrez : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new"
echo "   👉 Copiez le contenu ci-dessous et collez-le dans SQL Editor"
echo "   👉 Cliquez sur 'Run'"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}SCRIPT SQL À EXÉCUTER DANS SUPABASE :${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Afficher le contenu du script SQL
cat supabase/CONFIGURE-GOOGLE-OAUTH.sql

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 GUIDE COMPLET :${NC} Consultez FIX-GOOGLE-OAUTH-MAINTENANT.md"
echo ""
echo -e "${GREEN}✅ Le script SQL est prêt à être exécuté !${NC}"
echo ""
echo "Après avoir exécuté ces 3 étapes :"
echo "1. Rechargez votre application"
echo "2. Cliquez sur 'Continuer avec Google'"
echo "3. L'erreur 'OAuth client was not found' devrait disparaître !"
echo ""
