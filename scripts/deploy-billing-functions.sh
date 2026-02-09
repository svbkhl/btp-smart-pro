#!/usr/bin/env bash
# Déploie les Edge Functions Stripe Billing sur Supabase.
# À lancer depuis la racine du projet : ./scripts/deploy-billing-functions.sh
# Prérequis : supabase login, supabase link

set -e
cd "$(dirname "$0")/.."

echo "Déploiement des fonctions Stripe Billing..."
supabase functions deploy stripe-billing-resiliate-annual
supabase functions deploy stripe-billing-resiliate-monthly
supabase functions deploy stripe-billing-details
supabase functions deploy stripe-billing-create-setup-intent
supabase functions deploy stripe-billing-set-default-payment-method
supabase functions deploy stripe-billing-webhook
echo "Terminé."
