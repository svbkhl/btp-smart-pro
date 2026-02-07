/**
 * Pousse VITE_STRIPE_PRICE_ID_ANNUEL et VITE_STRIPE_PRICE_ID_MENSUEL vers Vercel.
 * Lit les valeurs depuis .env.local / .env (mêmes que Supabase Secrets).
 *
 * Usage: npx tsx scripts/vercel-add-stripe-env.ts
 * Prérequis: vercel link (projet lié) et .env.local avec les Price IDs Stripe
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
  console.error("Copie les valeurs depuis Supabase Dashboard → Edge Functions → Secrets,");
  console.error("puis ajoute-les dans .env.local :");
  console.error("  VITE_STRIPE_PRICE_ID_ANNUEL=price_xxx");
  console.error("  VITE_STRIPE_PRICE_ID_MENSUEL=price_yyy");
  process.exit(1);
}

function run(name: string, value: string) {
  try {
    execSync(`npx vercel env add ${name} production`, {
      input: value,
      encoding: "utf-8",
      stdio: ["pipe", "inherit", "inherit"],
      cwd: root,
    });
    console.log(`✅ ${name} ajouté`);
  } catch (e: unknown) {
    const msg = (e as { stderr?: string; message?: string })?.stderr ?? (e as Error)?.message ?? "";
    if (msg.includes("isn't linked") || msg.includes("Run `vercel link`")) {
      console.error("❌ Projet non lié. Lance: npx vercel link (puis réessaie)");
    } else {
      console.error(`❌ Échec pour ${name}. Si la variable existe déjà, modifie-la dans Vercel Dashboard.`);
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

console.log("📤 Ajout des variables Stripe vers Vercel (production)...\n");
run("VITE_STRIPE_PRICE_ID_ANNUEL", annuel);
run("VITE_STRIPE_PRICE_ID_MENSUEL", mensuel);
console.log("\n✅ Terminé. Redéploie avec: npx vercel --prod");
console.log("   Ou push sur main pour déclencher un déploiement automatique.");
