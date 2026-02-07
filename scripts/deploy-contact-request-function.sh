#!/bin/bash
# Déploie l'Edge Function create-contact-request pour le formulaire de contact
set -e
echo "Déploiement de create-contact-request..."
supabase functions deploy create-contact-request --no-verify-jwt
echo "✅ create-contact-request déployée"
echo ""
echo "Note: --no-verify-jwt permet aux visiteurs non connectés d'appeler la fonction."
