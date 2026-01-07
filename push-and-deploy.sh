#!/bin/bash

# ============================================================================
# 🚀 Push Git + Déploiement Vercel Automatique
# ============================================================================
# Pousse les changements vers GitHub, ce qui déclenche un déploiement Vercel
# ============================================================================

set -e

echo "🚀 Push Git + Déploiement Vercel"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier que git est installé
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git n'est pas installé${NC}"
    exit 1
fi

# Vérifier que nous sommes dans un dépôt git
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Ce n'est pas un dépôt git${NC}"
    exit 1
fi

# Vérifier le remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REMOTE_URL" ]; then
    echo -e "${YELLOW}⚠️ Aucun remote 'origin' configuré${NC}"
    echo ""
    echo "Pour configurer le remote :"
    echo "  git remote add origin https://github.com/svbkhl/btp_smart_pro.git"
    exit 1
fi

echo -e "${GREEN}✅ Remote configuré : ${REMOTE_URL}${NC}"
echo ""

# Vérifier la branche actuelle
BRANCH=$(git branch --show-current)
echo -e "${BLUE}📋 Branche actuelle : ${BRANCH}${NC}"
echo ""

# Afficher les fichiers modifiés
echo -e "${BLUE}📝 Fichiers modifiés :${NC}"
git status --short | head -10
echo ""

# Demander confirmation
read -p "Voulez-vous continuer ? (o/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
    echo "Annulé."
    exit 0
fi

# Ajouter tous les fichiers
echo -e "${BLUE}📦 Ajout des fichiers...${NC}"
git add .

# Créer un commit
echo -e "${BLUE}💾 Création du commit...${NC}"
git commit -m "fix: correction 404 Google Calendar - redirection vers /settings?tab=integrations

- Callback redirige vers /settings?tab=integrations au lieu de /settings/integrations/google
- Gestion du callback OAuth dans Settings.tsx
- Correction du problème 404 après OAuth Google Calendar"

# Pousser vers GitHub
echo -e "${BLUE}🚀 Push vers GitHub...${NC}"
git push origin "$BRANCH"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Push réussi !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "🔄 Si Vercel est connecté à GitHub, le déploiement va démarrer automatiquement"
echo ""
echo "📋 Vérifiez le déploiement sur :"
echo "   https://vercel.com/dashboard"
echo ""
echo "⏱️  Le déploiement prend généralement 2-3 minutes"
echo ""
