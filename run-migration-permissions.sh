#!/bin/bash

echo "🚀 Installation du système de permissions personnalisées"
echo "========================================================="
echo ""
echo "Ce script va créer la table 'user_permissions' dans votre base Supabase"
echo ""

# Vérifier si supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo ""
    echo "📋 Deux options :"
    echo ""
    echo "OPTION A - Installer Supabase CLI (recommandé) :"
    echo "  brew install supabase/tap/supabase"
    echo "  Puis relancez ce script"
    echo ""
    echo "OPTION B - Via Supabase Dashboard (manuel) :"
    echo "  1. Allez sur https://supabase.com/dashboard"
    echo "  2. Sélectionnez votre projet"
    echo "  3. Cliquez sur 'SQL Editor'"
    echo "  4. Cliquez sur '+ New query'"
    echo "  5. Ouvrez le fichier : MIGRATION-COMPLETE-USER-PERMISSIONS.sql"
    echo "  6. Copiez TOUT le contenu (Cmd+A puis Cmd+C)"
    echo "  7. Collez dans l'éditeur SQL"
    echo "  8. Cliquez sur 'RUN' ou appuyez sur Cmd+Enter"
    echo "  9. Attendez le message : ✅ Table user_permissions créée avec succès"
    echo ""
    exit 1
fi

# Vérifier si le projet est lié
if [ ! -f ".git/config" ] && [ ! -f "supabase/config.toml" ]; then
    echo "⚠️  Projet Supabase non configuré"
    echo ""
    echo "Exécutez d'abord :"
    echo "  supabase link --project-ref VOTRE_PROJECT_REF"
    echo ""
    echo "Pour trouver votre PROJECT_REF :"
    echo "  1. Allez sur https://supabase.com/dashboard"
    echo "  2. Sélectionnez votre projet"
    echo "  3. Settings > General > Reference ID"
    echo ""
    exit 1
fi

echo "📦 Application de la migration..."
echo ""

# Appliquer la migration
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration appliquée avec succès !"
    echo ""
    echo "🎉 Le système de permissions est maintenant actif !"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "  1. Rafraîchissez votre application (F5)"
    echo "  2. Allez sur Paramètres > Employés"
    echo "  3. Cliquez sur 'Permissions' pour un employé"
    echo "  4. Sélectionnez les permissions et enregistrez"
    echo ""
else
    echo ""
    echo "❌ Erreur lors de l'application de la migration"
    echo ""
    echo "Utilisez plutôt la méthode manuelle via Supabase Dashboard"
    echo "Consultez : GUIDE-INSTALLATION-PERMISSIONS-SIMPLE.md"
    echo ""
    exit 1
fi
