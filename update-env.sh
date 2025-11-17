#!/bin/bash

echo "🔧 Mise à jour du fichier .env..."

# Créer le nouveau fichier .env avec les bonnes valeurs
cat > .env << 'ENVFILE'
# Configuration Supabase - Projet renmjmqlmafqjzldmsgs
VITE_SUPABASE_URL=https://renmjmqlmafqjzldmsgs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbWFmcWp6bGRtc2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTA0OTksImV4cCI6MjA3ODE4NjQ5OX0.aJoeIcBb9FiSL2n90vfGevlQQJApym8AVlMktSYOwss
VITE_SUPABASE_PROJECT_ID=renmjmqlmafqjzldmsgs
ENVFILE

echo "✅ Fichier .env mis à jour !"
echo ""
echo "📋 Nouvelles valeurs :"
cat .env
echo ""
echo "⚠️  IMPORTANT : Redémarrez le serveur avec 'npm run dev'"
