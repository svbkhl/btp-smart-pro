/**
 * Formatage centralisé du bloc client pour PDF / preview / emails.
 *
 * Ce module corrige le bug "M. Ks M. Ks Plomberie" en :
 *  1. Distinguant explicitement particulier vs professionnel
 *  2. Détectant les civilités déjà incluses dans les champs nom
 *  3. Dédupliquant en sortie toute civilité répétée sur 2 lignes consécutives.
 *
 * Tous les rendus client (PDF facture, PDF devis, in-app, email) doivent
 * passer par formatClientBlock(). Aucune concaténation ad-hoc tolérée.
 */

export type Civility = "M." | "Mme" | "Mlle" | "Dr." | "Me" | null | undefined;

export type ClientType = "PARTICULIER" | "PROFESSIONNEL" | undefined;

export interface ClientBlockInput {
  type?: ClientType;
  company_name?: string | null;
  contact_civility?: Civility;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  /**
   * Champ legacy : texte libre. Peut contenir une civilité ("M. Dupont"),
   * un prénom + nom, ou la raison sociale d'un pro. À normaliser.
   */
  legacy_name?: string | null;
}

const CIVILITY_PATTERN = /^\s*(M\.|Mme|Mlle|Dr\.|Me)\s+/i;

/**
 * Retire un préfixe de civilité ("M.", "Mme", ...) d'une chaîne et renvoie
 * { civility, rest } — civility=null si rien détecté.
 */
export function extractCivilityPrefix(raw: string | null | undefined): {
  civility: Civility;
  rest: string;
} {
  if (!raw) return { civility: null, rest: "" };
  const trimmed = raw.trim();
  const match = trimmed.match(CIVILITY_PATTERN);
  if (!match) return { civility: null, rest: trimmed };
  const civ = match[1];
  const normalized: Civility =
    civ === "M." || civ === "Mme" || civ === "Mlle" || civ === "Dr." || civ === "Me"
      ? civ
      : (civ.charAt(0).toUpperCase() + civ.slice(1).toLowerCase()) as Civility;
  return {
    civility: normalized,
    rest: trimmed.slice(match[0].length).trim(),
  };
}

/**
 * Normalise les champs d'un client : si `last_name` ou `legacy_name` commence
 * par une civilité, on la remonte vers `contact_civility` et on retire le préfixe.
 * Idempotent.
 */
export function normalizeClientFields(c: ClientBlockInput): ClientBlockInput {
  let civility: Civility = c.contact_civility ?? null;
  let firstName = (c.contact_first_name ?? "").trim();
  let lastName = (c.contact_last_name ?? "").trim();
  let legacyName = (c.legacy_name ?? "").trim();

  if (!civility && lastName) {
    const e = extractCivilityPrefix(lastName);
    if (e.civility) {
      civility = e.civility;
      lastName = e.rest;
    }
  }
  if (!civility && firstName) {
    const e = extractCivilityPrefix(firstName);
    if (e.civility) {
      civility = e.civility;
      firstName = e.rest;
    }
  }
  if (!civility && legacyName) {
    const e = extractCivilityPrefix(legacyName);
    if (e.civility) {
      civility = e.civility;
      legacyName = e.rest;
    }
  } else if (civility && legacyName) {
    // Si legacy_name contient déjà la même civilité, la retirer pour éviter dup.
    const e = extractCivilityPrefix(legacyName);
    if (e.civility === civility) {
      legacyName = e.rest;
    }
  }

  return {
    ...c,
    contact_civility: civility,
    contact_first_name: firstName || undefined,
    contact_last_name: lastName || undefined,
    legacy_name: legacyName || undefined,
  };
}

/**
 * Retire toute ligne qui répète, en deuxième position, la civilité
 * déjà présente sur la ligne précédente (ceinture + bretelles).
 *
 * Exemple :
 *   ["M. Ks", "M. Ks Plomberie"] → ["M. Ks", "Ks Plomberie"]
 */
export function dedupCivilityLines(lines: string[]): string[] {
  if (lines.length < 2) return lines.slice();
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i] ?? "";
    if (i === 0) {
      out.push(cur);
      continue;
    }
    const prev = out[out.length - 1] ?? "";
    const prevCiv = extractCivilityPrefix(prev).civility;
    const curCiv = extractCivilityPrefix(cur).civility;
    if (prevCiv && curCiv && prevCiv === curCiv) {
      out.push(extractCivilityPrefix(cur).rest);
    } else {
      out.push(cur);
    }
  }
  return out;
}

/**
 * Format de référence du bloc client.
 * Renvoie un tableau de lignes prêtes à imprimer.
 *
 * - Particulier : `[civilité prénom nom]`
 * - Professionnel : `[raison sociale, "À l'attention de civilité prénom nom"]`
 *
 * Si le `type` n'est pas fourni : on infère (présence de company_name → pro).
 */
export function formatClientBlock(rawInput: ClientBlockInput): string[] {
  const c = normalizeClientFields(rawInput);
  const inferredType: ClientType =
    c.type ?? (c.company_name && c.company_name.trim() ? "PROFESSIONNEL" : "PARTICULIER");

  const civility = c.contact_civility ? c.contact_civility.trim() : "";
  const firstName = c.contact_first_name ? c.contact_first_name.trim() : "";
  const lastName = c.contact_last_name ? c.contact_last_name.trim() : "";

  const fullContact = [civility, firstName, lastName].filter(Boolean).join(" ").trim();
  const legacy = (c.legacy_name ?? "").trim();

  const lines: string[] = [];

  if (inferredType === "PROFESSIONNEL") {
    const company = (c.company_name ?? "").trim() || legacy;
    if (company) lines.push(company);
    if (fullContact) {
      lines.push(`À l'attention de ${fullContact}`);
    } else if (!company && legacy) {
      lines.push(legacy);
    }
  } else {
    if (fullContact) {
      lines.push(fullContact);
    } else if (legacy) {
      lines.push(legacy);
    }
  }

  // Filet de sécurité final : aucune ligne vide, dédup civilité.
  return dedupCivilityLines(lines.map((l) => l.trim()).filter(Boolean));
}

/**
 * Helper pratique pour mapper depuis l'ancien schéma `clients` (Supabase) :
 *  { name, titre, prenom }  →  ClientBlockInput
 *
 * Détecte si `name` ressemble à une raison sociale (présence de mots
 * indicateurs de pro : SARL/SAS/SA/EURL/SCI/etc., ou présence d'un
 * mot type "Plomberie", "Électricité"…) — heuristique conservatrice.
 */
const COMPANY_HINTS = [
  "SARL",
  "SAS",
  "SASU",
  "EURL",
  "SCI",
  "SA",
  "SNC",
  "SCEA",
  "SELARL",
  "EI",
  "EIRL",
];

const TRADE_HINTS = [
  "plomberie",
  "électricité",
  "electricite",
  "maçonnerie",
  "maconnerie",
  "menuiserie",
  "peinture",
  "carrelage",
  "couverture",
  "toiture",
  "btp",
  "bâtiment",
  "batiment",
  "construction",
  "rénovation",
  "renovation",
  "isolation",
  "chauffage",
  "sanitaire",
];

export function looksLikeCompany(rawName: string | null | undefined): boolean {
  if (!rawName) return false;
  const upper = rawName.trim().toUpperCase();
  if (COMPANY_HINTS.some((h) => new RegExp(`(^|\\s)${h}(\\s|$|\\.)`, "i").test(upper))) {
    return true;
  }
  const lower = rawName.trim().toLowerCase();
  return TRADE_HINTS.some((h) => lower.includes(h));
}

export interface LegacyClientRow {
  name?: string | null;
  titre?: string | null;
  prenom?: string | null;
  type?: ClientType;
  company_name?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
}

/**
 * Convertit une ligne `clients` héritée vers ClientBlockInput.
 * Si `type` n'est pas explicitement renseigné, on infère via heuristique.
 */
export function clientRowToBlockInput(row: LegacyClientRow): ClientBlockInput {
  const explicitType = row.type;
  const companyName = row.company_name ?? null;
  const lastName = row.contact_last_name ?? null;
  const firstName = row.contact_first_name ?? row.prenom ?? null;
  const civility = (row.titre as Civility) ?? null;
  const legacy = row.name ?? null;

  // Si on a déjà des champs structurés, type peut être déduit
  let type: ClientType = explicitType;
  if (!type) {
    if (companyName && companyName.trim()) type = "PROFESSIONNEL";
    else if (looksLikeCompany(legacy)) type = "PROFESSIONNEL";
    else type = "PARTICULIER";
  }

  // Si pas de company_name explicite mais nom legacy ressemble à une boîte,
  // on bascule legacy en company_name et on retire de legacy_name.
  let resolvedCompany = companyName;
  let resolvedLegacy: string | null = legacy;
  if (type === "PROFESSIONNEL" && !resolvedCompany && legacy) {
    resolvedCompany = legacy;
    resolvedLegacy = null;
  }

  return {
    type,
    company_name: resolvedCompany ?? undefined,
    contact_civility: civility,
    contact_first_name: firstName ?? undefined,
    contact_last_name: lastName ?? undefined,
    legacy_name: resolvedLegacy ?? undefined,
  };
}
