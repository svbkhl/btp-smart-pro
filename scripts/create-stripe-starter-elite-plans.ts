/**
 * Crée les offres Starter et Elite dans Stripe.
 * Le plan Pro (ANNUEL + MENSUEL) est déjà en place — ne PAS retoucher.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/create-stripe-starter-elite-plans.ts
 *
 * Après exécution, copier les price IDs affichés dans .env.local et Vercel :
 *   VITE_STRIPE_PRICE_ID_STARTER_ANNUEL=price_xxx
 *   VITE_STRIPE_PRICE_ID_STARTER_MENSUEL=price_xxx
 *   VITE_STRIPE_PRICE_ID_ELITE_ANNUEL=price_xxx
 *   VITE_STRIPE_PRICE_ID_ELITE_MENSUEL=price_xxx
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error(
    "❌ STRIPE_SECRET_KEY manquant.\n" +
    "   Usage: STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/create-stripe-starter-elite-plans.ts"
  );
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

async function main() {
  console.log("🚀 Création des plans Starter et Elite dans Stripe…\n");
  console.log("ℹ️  Le plan Pro (ANNUEL + MENSUEL) est conservé intact.\n");

  // ─── STARTER ANNUEL : 948 € / an (= 79 € × 12) ───────────────────────────
  const productStarterAnnuel = await stripe.products.create({
    name: "BTP Smart Pro — Starter (Annuel)",
    description:
      "14j d'essai offert · Frais d'entrée 500€ offerts · Onboarding vidéos offert · 5 chantiers actifs · Engagement 12 mois",
    metadata: { plan: "starter", interval: "annuel", trial_days: "14" },
  });

  const priceStarterAnnuel = await stripe.prices.create({
    product: productStarterAnnuel.id,
    unit_amount: 94800, // 948 € en centimes
    currency: "eur",
    recurring: { interval: "year" },
    nickname: "Starter Annuel – 948€/an (79€/mois)",
  });

  console.log("✅ Starter — Annuel créé");
  console.log(`   Produit : ${productStarterAnnuel.id}`);
  console.log(`   Prix    : ${priceStarterAnnuel.id}  (948 € / an)\n`);

  // ─── STARTER MENSUEL : 99 € / mois (engagement 12 mois) ──────────────────
  const productStarterMensuel = await stripe.products.create({
    name: "BTP Smart Pro — Starter (Mensuel)",
    description:
      "14j d'essai offert · Frais d'entrée 500€ offerts · Onboarding vidéos offert · 5 chantiers actifs · Engagement 12 mois non résiliable avant échéance",
    metadata: { plan: "starter", interval: "mensuel", trial_days: "14" },
  });

  const priceStarterMensuel = await stripe.prices.create({
    product: productStarterMensuel.id,
    unit_amount: 9900, // 99 € en centimes
    currency: "eur",
    recurring: { interval: "month" },
    nickname: "Starter Mensuel – 99€/mois",
  });

  console.log("✅ Starter — Mensuel créé");
  console.log(`   Produit : ${productStarterMensuel.id}`);
  console.log(`   Prix    : ${priceStarterMensuel.id}  (99 € / mois)\n`);

  // ─── ELITE ANNUEL : 2 748 € / an (= 229 € × 12) ─────────────────────────
  const productEliteAnnuel = await stripe.products.create({
    name: "BTP Smart Pro — Elite (Annuel)",
    description:
      "14j d'essai offert · Frais d'entrée 1000€ offerts · Onboarding expert 1h · Formation BTP Digital · Migration données · Engagement 12 mois",
    metadata: { plan: "elite", interval: "annuel", trial_days: "14" },
  });

  const priceEliteAnnuel = await stripe.prices.create({
    product: productEliteAnnuel.id,
    unit_amount: 274800, // 2 748 € en centimes
    currency: "eur",
    recurring: { interval: "year" },
    nickname: "Elite Annuel – 2748€/an (229€/mois)",
  });

  console.log("✅ Elite — Annuel créé");
  console.log(`   Produit : ${productEliteAnnuel.id}`);
  console.log(`   Prix    : ${priceEliteAnnuel.id}  (2 748 € / an)\n`);

  // ─── ELITE MENSUEL : 299 € / mois (engagement 12 mois) ───────────────────
  const productEliteMensuel = await stripe.products.create({
    name: "BTP Smart Pro — Elite (Mensuel)",
    description:
      "14j d'essai offert · Frais d'entrée 1000€ offerts · Onboarding expert 1h · Formation BTP Digital · Migration données · Engagement 12 mois non résiliable avant échéance",
    metadata: { plan: "elite", interval: "mensuel", trial_days: "14" },
  });

  const priceEliteMensuel = await stripe.prices.create({
    product: productEliteMensuel.id,
    unit_amount: 29900, // 299 € en centimes
    currency: "eur",
    recurring: { interval: "month" },
    nickname: "Elite Mensuel – 299€/mois",
  });

  console.log("✅ Elite — Mensuel créé");
  console.log(`   Produit : ${productEliteMensuel.id}`);
  console.log(`   Prix    : ${priceEliteMensuel.id}  (299 € / mois)\n`);

  // ─── Récapitulatif ────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("📋 Ajouter dans .env.local ET dans Vercel Dashboard > Settings > Env:");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`VITE_STRIPE_PRICE_ID_STARTER_ANNUEL=${priceStarterAnnuel.id}`);
  console.log(`VITE_STRIPE_PRICE_ID_STARTER_MENSUEL=${priceStarterMensuel.id}`);
  console.log(`VITE_STRIPE_PRICE_ID_ELITE_ANNUEL=${priceEliteAnnuel.id}`);
  console.log(`VITE_STRIPE_PRICE_ID_ELITE_MENSUEL=${priceEliteMensuel.id}`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n✅ Plans Starter et Elite créés avec succès !");
  console.log("   Le plan Pro (ANNUEL + MENSUEL) est inchangé.\n");
  console.log("📌 Prochaines étapes :");
  console.log("   1. Copier les price IDs ci-dessus dans .env.local");
  console.log("   2. Lancer: npx tsx scripts/vercel-add-stripe-env.ts");
  console.log("   3. Redéployer: git push origin main\n");
}

main().catch((err) => {
  console.error("❌ Erreur:", err.message);
  process.exit(1);
});
