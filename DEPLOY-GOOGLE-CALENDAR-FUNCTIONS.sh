#!/bin/bash

# ============================================================================
# 🚀 Script de Déploiement - Google Calendar Functions
# ============================================================================
# Déploie les 3 fonctions Google Calendar sur Supabase
# ============================================================================

set -e

echo "🚀 Déploiement des fonctions Google Calendar..."
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

# Vérifier que l'utilisateur est connecté
echo -e "${YELLOW}📋 Vérification de la connexion Supabase...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Vous n'êtes pas connecté à Supabase${NC}"
    echo "Connectez-vous avec: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Connecté à Supabase${NC}"
echo ""

# Fonction 1: google-calendar-callback
echo -e "${YELLOW}1️⃣ Déploiement de google-calendar-callback...${NC}"
if supabase functions deploy google-calendar-callback --no-verify-jwt; then
    echo -e "${GREEN}✅ google-calendar-callback déployée${NC}"
else
    echo -e "${RED}❌ Erreur lors du déploiement de google-calendar-callback${NC}"
    exit 1
fi
echo ""

# Fonction 2: google-calendar-oauth-entreprise-pkce
echo -e "${YELLOW}2️⃣ Déploiement de google-calendar-oauth-entreprise-pkce...${NC}"
if supabase functions deploy google-calendar-oauth-entreprise-pkce --no-verify-jwt; then
    echo -e "${GREEN}✅ google-calendar-oauth-entreprise-pkce déployée${NC}"
else
    echo -e "${RED}❌ Erreur lors du déploiement de google-calendar-oauth-entreprise-pkce${NC}"
    exit 1
fi
echo ""

# Fonction 3: google-calendar-sync-entreprise
echo -e "${YELLOW}3️⃣ Déploiement de google-calendar-sync-entreprise...${NC}"
if supabase functions deploy google-calendar-sync-entreprise --no-verify-jwt; then
    echo -e "${GREEN}✅ google-calendar-sync-entreprise déployée${NC}"
else
    echo -e "${RED}❌ Erreur lors du déploiement de google-calendar-sync-entreprise${NC}"
    exit 1
fi
echo ""

# Résumé
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Toutes les fonctions Google Calendar ont été déployées !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "📋 Fonctions déployées :"
echo "   ✅ google-calendar-callback"
echo "   ✅ google-calendar-oauth-entreprise-pkce"
echo "   ✅ google-calendar-sync-entreprise"
echo ""
echo "🔗 Vérifiez dans Supabase Dashboard :"
echo "   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions"
echo ""
