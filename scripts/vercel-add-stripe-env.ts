/**
 * Pousse les variables Stripe vers Vercel (Price IDs + clé publique).
 * Lit les valeurs depuis .env.local / .env (mêmes que Supabase Secrets).
 *
 * Usage: npx tsx scripts/vercel-add-stripe-env.ts
 * Prérequis: vercel link (projet lié) et .env.local avec les Price IDs Stripe
 * Optionnel: VITE_STRIPE_PUBLISHABLE_KEY (pk_test_... ou pk_live_...) pour le formulaire carte sur la page Abonnement
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

function loadEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf-8");
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[m[1]] = val;
    }
  }
  return out;
}

const root = resolve(import.meta.dirname, "..");
const envLocal = loadEnv(resolve(root, ".env.local"));
const env = loadEnv(resolve(root, ".env"));
const vars = { ...env, ...envLocal };

let annuel = vars.VITE_STRIPE_PRICE_ID_ANNUEL?.trim();
let mensuel = vars.VITE_STRIPE_PRICE_ID_MENSUEL?.trim();
const def = vars.VITE_STRIPE_PRICE_ID?.trim();

if ((!annuel || !mensuel) && def) {
  annuel = annuel || def;
  mensuel = mensuel || def;
}

if (!annuel || !mensuel) {
  console.error("❌ Erreur: VITE_STRIPE_PRICE_ID_ANNUEL et VITE_STRIPE_PRICE_ID_MENSUEL (ou VITE_STRIPE_PRICE_ID) doivent être dans .env ou .env.local");
  console.error("");
  console.error("Copie les valeurs depuis Stripe Dashboard puis ajoute-les dans .env.local :");
  console.error("  VITE_STRIPE_PRICE_ID_ANNUEL=price_xxx          # Pro annuel");
  console.error("  VITE_STRIPE_PRICE_ID_MENSUEL=price_xxx         # Pro mensuel");
  console.error("  VITE_STRIPE_PRICE_ID_STARTER_ANNUEL=price_xxx  # Starter annuel");
  console.error("  VITE_STRIPE_PRICE_ID_STARTER_MENSUEL=price_xxx # Starter mensuel");
  console.error("  VITE_STRIPE_PRICE_ID_ELITE_ANNUEL=price_xxx    # Elite annuel");
  console.error("  VITE_STRIPE_PRICE_ID_ELITE_MENSUEL=price_xxx   # Elite mensuel");
  process.exit(1);
}

const starterAnnuel  = vars.VITE_STRIPE_PRICE_ID_STARTER_ANNUEL?.trim();
const starterMensuel = vars.VITE_STRIPE_PRICE_ID_STARTER_MENSUEL?.trim();
const eliteAnnuel    = vars.VITE_STRIPE_PRICE_ID_ELITE_ANNUEL?.trim();
const eliteMensuel   = vars.VITE_STRIPE_PRICE_ID_ELITE_MENSUEL?.trim();

function run(name: string, value: string) {
  // Supprimer d'abord si elle existe (évite "already exists"), puis ajouter
  try {
    execSync(`npx vercel env rm ${name} production --yes`, {
      encoding: "utf-8",
      stdio: "pipe",
      cwd: root,
    });
  } catch {
    // La variable n'existait pas, on continue
  }
  try {
    execSync(`npx vercel env add ${name} production`, {
      input: value,
      encoding: "utf-8",
      stdio: ["pipe", "inherit", "inherit"],
      cwd: root,
    });
    console.log(`✅ ${name} ajouté ou mis à jour`);
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? "");
    if (msg.includes("isn't linked") || msg.includes("Run `vercel link`")) {
      console.error("❌ Projet non lié. Lance: npx vercel link (puis réessaie)");
    } else {
      console.error(`❌ Échec pour ${name}. Vérifie Vercel Dashboard.`);
    }
    throw e;
  }
}

try {
  execSync("npx vercel whoami", { encoding: "utf-8", stdio: "pipe", cwd: root });
} catch {
  console.error("❌ Vercel CLI non connecté. Lance d'abord: npx vercel login");
  process.exit(1);
}

const linked = existsSync(resolve(root, ".vercel", "project.json"));
if (!linked) {
  console.error("❌ Projet non lié à Vercel. Lance d'abord: npx vercel link");
  console.error("   (Sélectionne ton projet BTP Smart Pro dans la liste)");
  process.exit(1);
}

const publishable = vars.VITE_STRIPE_PUBLISHABLE_KEY?.trim();

console.log("📤 Ajout des variables Stripe vers Vercel (production)...\n");

// Plan Pro (existant — ne pas modifier les valeurs si elles sont déjà bonnes)
run("VITE_STRIPE_PRICE_ID_ANNUEL", annuel);
run("VITE_STRIPE_PRICE_ID_MENSUEL", mensuel);

// Plan Starter (nouveau)
if (starterAnnuel)  run("VITE_STRIPE_PRICE_ID_STARTER_ANNUEL",  starterAnnuel);
else console.log("⚠️  VITE_STRIPE_PRICE_ID_STARTER_ANNUEL non défini — le bouton Starter Annuel sera désactivé.");

if (starterMensuel) run("VITE_STRIPE_PRICE_ID_STARTER_MENSUEL", starterMensuel);
else console.log("⚠️  VITE_STRIPE_PRICE_ID_STARTER_MENSUEL non défini — le bouton Starter Mensuel sera désactivé.");

// Plan Elite (nouveau)
if (eliteAnnuel)    run("VITE_STRIPE_PRICE_ID_ELITE_ANNUEL",    eliteAnnuel);
else console.log("⚠️  VITE_STRIPE_PRICE_ID_ELITE_ANNUEL non défini — le bouton Elite Annuel sera désactivé.");

if (eliteMensuel)   run("VITE_STRIPE_PRICE_ID_ELITE_MENSUEL",   eliteMensuel);
else console.log("⚠️  VITE_STRIPE_PRICE_ID_ELITE_MENSUEL non défini — le bouton Elite Mensuel sera désactivé.");

if (publishable) {
  run("VITE_STRIPE_PUBLISHABLE_KEY", publishable);
} else {
  console.log("ℹ️  VITE_STRIPE_PUBLISHABLE_KEY non défini : ajoute-la dans .env.local pour activer le formulaire carte.");
}
console.log("\n✅ Terminé. Redéploie avec: git push origin main");
console.log("   ou: npx vercel --prod");
