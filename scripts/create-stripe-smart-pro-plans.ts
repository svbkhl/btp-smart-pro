/**
 * Crée les offres SMART PRO dans Stripe.
 * Usage: STRIPE_SECRET_KEY=sk_xxx npx tsx scripts/create-stripe-smart-pro-plans.ts
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY manquant. Usage: STRIPE_SECRET_KEY=sk_xxx npx tsx scripts/create-stripe-smart-pro-plans.ts");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

async function main() {
  console.log("🚀 Création des offres SMART PRO dans Stripe...\n");

  // 1. SMART PRO – ANNUEL : 1 788 € / an
  const productAnnuel = await stripe.products.create({
    name: "SMART PRO – ANNUEL",
    description: "1 mois d'essai offert • Frais d'entrée 1 000 € offerts • Accès complet à Smart Pro • Support & accompagnement inclus",
    metadata: { plan_type: "annuel", trial_days: "30" },
  });

  const priceAnnuel = await stripe.prices.create({
    product: productAnnuel.id,
    unit_amount: 178800, // 1 788 € en centimes
    currency: "eur",
    recurring: { interval: "year" },
    nickname: "SMART PRO Annuel – 1788€/an",
  });

  console.log("✅ SMART PRO – ANNUEL créé");
  console.log(`   Produit: ${productAnnuel.id}`);
  console.log(`   Prix:    ${priceAnnuel.id} (1 788 € / an)\n`);

  // 2. SMART PRO – MENSUEL : 199 € / mois (engagement 12 mois)
  const productMensuel = await stripe.products.create({
    name: "SMART PRO – MENSUEL (Engagement 12 mois)",
    description: "1 mois d'essai offert • Frais d'entrée 1 000 € offerts • Accès complet à Smart Pro • Engagement 12 mois à partir de la fin de l'essai",
    metadata: { plan_type: "mensuel", trial_days: "30" },
  });

  const priceMensuel = await stripe.prices.create({
    product: productMensuel.id,
    unit_amount: 19900, // 199 € en centimes
    currency: "eur",
    recurring: { interval: "month" },
    nickname: "SMART PRO Mensuel – 199€/mois",
  });

  console.log("✅ SMART PRO – MENSUEL créé");
  console.log(`   Produit: ${productMensuel.id}`);
  console.log(`   Prix:    ${priceMensuel.id} (199 € / mois)\n`);

  console.log("═══════════════════════════════════════════════════════");
  console.log("📋 À ajouter dans ton .env :");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`VITE_STRIPE_PRICE_ID_ANNUEL=${priceAnnuel.id}`);
  console.log(`VITE_STRIPE_PRICE_ID_MENSUEL=${priceMensuel.id}`);
  console.log("═══════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("❌ Erreur:", err.message);
  process.exit(1);
});
