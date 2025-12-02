#!/bin/bash

# Script pour ouvrir les pages de configuration OAuth

echo "🔐 Ouverture des pages de configuration OAuth..."
echo ""

# Vérifier le Project Reference Supabase
PROJECT_REF="renmjmqlmafqjzldmsgs"

echo "📋 Project Reference Supabase : $PROJECT_REF"
echo ""
echo "🌐 Ouverture des pages..."
echo ""

# Google Cloud Console
echo "1. Google Cloud Console (Credentials)"
open "https://console.cloud.google.com/apis/credentials" 2>/dev/null || echo "   → https://console.cloud.google.com/apis/credentials"

# Supabase Dashboard - Providers
echo "2. Supabase Dashboard (Providers)"
open "https://supabase.com/dashboard/project/$PROJECT_REF/auth/providers" 2>/dev/null || echo "   → https://supabase.com/dashboard/project/$PROJECT_REF/auth/providers"

# Supabase Dashboard - URL Configuration
echo "3. Supabase Dashboard (URL Configuration)"
open "https://supabase.com/dashboard/project/$PROJECT_REF/auth/url-configuration" 2>/dev/null || echo "   → https://supabase.com/dashboard/project/$PROJECT_REF/auth/url-configuration"

# Apple Developer
echo "4. Apple Developer (Identifiers)"
open "https://developer.apple.com/account/resources/identifiers/list" 2>/dev/null || echo "   → https://developer.apple.com/account/resources/identifiers/list"

echo ""
echo "✅ Pages ouvertes !"
echo ""
echo "📖 Suivez le guide : CONFIGURER-OAUTH-MAINTENANT.md"
