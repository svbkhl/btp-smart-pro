import { describe, it, expect } from "vitest";
import {
  formatClientBlock,
  normalizeClientFields,
  extractCivilityPrefix,
  dedupCivilityLines,
  clientRowToBlockInput,
  looksLikeCompany,
} from "../formatClientBlock";

describe("extractCivilityPrefix", () => {
  it("retourne null si pas de préfixe", () => {
    expect(extractCivilityPrefix("Dupont")).toEqual({ civility: null, rest: "Dupont" });
  });
  it("détecte M.", () => {
    expect(extractCivilityPrefix("M. Dupont")).toEqual({ civility: "M.", rest: "Dupont" });
  });
  it("détecte Mme", () => {
    expect(extractCivilityPrefix("Mme Martin")).toEqual({ civility: "Mme", rest: "Martin" });
  });
  it("détecte avec espaces multiples", () => {
    expect(extractCivilityPrefix("  M.   Dupont  ")).toEqual({ civility: "M.", rest: "Dupont" });
  });
  it("ignore null/undefined/empty", () => {
    expect(extractCivilityPrefix(null)).toEqual({ civility: null, rest: "" });
    expect(extractCivilityPrefix(undefined)).toEqual({ civility: null, rest: "" });
    expect(extractCivilityPrefix("")).toEqual({ civility: null, rest: "" });
  });
});

describe("dedupCivilityLines", () => {
  it("retire la civilité dupliquée sur 2 lignes consécutives", () => {
    expect(dedupCivilityLines(["M. Ks", "M. Ks Plomberie"])).toEqual(["M. Ks", "Ks Plomberie"]);
  });
  it("ne touche pas si civilités différentes", () => {
    expect(dedupCivilityLines(["M. Ks", "Mme Plomberie"])).toEqual(["M. Ks", "Mme Plomberie"]);
  });
  it("ne touche pas si l'une des lignes n'a pas de civilité", () => {
    expect(dedupCivilityLines(["Ks Plomberie", "M. Ks"])).toEqual(["Ks Plomberie", "M. Ks"]);
  });
  it("preserve une seule ligne", () => {
    expect(dedupCivilityLines(["M. Ks"])).toEqual(["M. Ks"]);
  });
  it("preserve liste vide", () => {
    expect(dedupCivilityLines([])).toEqual([]);
  });
});

describe("normalizeClientFields", () => {
  it("remonte la civilité depuis last_name vers contact_civility", () => {
    const r = normalizeClientFields({
      contact_civility: null,
      contact_last_name: "M. Dupont",
    });
    expect(r.contact_civility).toBe("M.");
    expect(r.contact_last_name).toBe("Dupont");
  });
  it("remonte la civilité depuis legacy_name", () => {
    const r = normalizeClientFields({ legacy_name: "Mme Martin" });
    expect(r.contact_civility).toBe("Mme");
    expect(r.legacy_name).toBe("Martin");
  });
  it("ne re-extrait pas si civilité déjà fournie", () => {
    const r = normalizeClientFields({
      contact_civility: "M.",
      contact_last_name: "M. Dupont",
    });
    // contact_civility reste M., last_name n'est pas re-touché car déjà non vide
    expect(r.contact_civility).toBe("M.");
    expect(r.contact_last_name).toBe("M. Dupont");
  });
  it("retire civilité dupliquée dans legacy_name si même civilité", () => {
    const r = normalizeClientFields({
      contact_civility: "M.",
      legacy_name: "M. Dupont",
    });
    expect(r.legacy_name).toBe("Dupont");
  });
});

describe("formatClientBlock — cas particulier", () => {
  it("rend une seule ligne avec civilité + prénom + nom", () => {
    const lines = formatClientBlock({
      type: "PARTICULIER",
      contact_civility: "M.",
      contact_first_name: "Jean",
      contact_last_name: "Dupont",
    });
    expect(lines).toEqual(["M. Jean Dupont"]);
  });
  it("sans civilité ni prénom", () => {
    const lines = formatClientBlock({
      type: "PARTICULIER",
      contact_last_name: "Dupont",
    });
    expect(lines).toEqual(["Dupont"]);
  });
  it("auto-extrait civilité depuis last_name", () => {
    const lines = formatClientBlock({
      type: "PARTICULIER",
      contact_last_name: "M. Dupont",
    });
    expect(lines).toEqual(["M. Dupont"]);
  });
});

describe("formatClientBlock — cas professionnel", () => {
  it("scénario du ticket : Ks Plomberie + M. Ks", () => {
    const lines = formatClientBlock({
      type: "PROFESSIONNEL",
      company_name: "Ks Plomberie",
      contact_civility: "M.",
      contact_last_name: "Ks",
    });
    expect(lines).toEqual(["Ks Plomberie", "À l'attention de M. Ks"]);
  });
  it("sans contact, juste raison sociale", () => {
    const lines = formatClientBlock({
      type: "PROFESSIONNEL",
      company_name: "Ks Plomberie",
    });
    expect(lines).toEqual(["Ks Plomberie"]);
  });
  it("infère type pro si company_name présent", () => {
    const lines = formatClientBlock({
      company_name: "Ks Plomberie",
      contact_civility: "M.",
      contact_last_name: "Ks",
    });
    expect(lines).toEqual(["Ks Plomberie", "À l'attention de M. Ks"]);
  });
  it("avec prénom et nom contact", () => {
    const lines = formatClientBlock({
      type: "PROFESSIONNEL",
      company_name: "Ks Plomberie",
      contact_civility: "Mme",
      contact_first_name: "Sophie",
      contact_last_name: "Ks",
    });
    expect(lines).toEqual(["Ks Plomberie", "À l'attention de Mme Sophie Ks"]);
  });
});

describe("formatClientBlock — régression Bug #2 (ticket FACTURE-2026-002)", () => {
  it("ne produit JAMAIS \"M. Ks M. Ks Plomberie\"", () => {
    // Cas exact du ticket : ancien schéma avait name = "Ks Plomberie", titre = "M.", prenom = "Ks"
    // → on infère pro depuis hint "Plomberie".
    const input = clientRowToBlockInput({
      name: "Ks Plomberie",
      titre: "M.",
      prenom: "Ks",
    });
    const lines = formatClientBlock(input);
    const joined = lines.join(" | ");
    expect(joined).not.toMatch(/M\.\s+Ks\s+M\.\s+Ks/);
    expect(lines[0]).toBe("Ks Plomberie");
    expect(lines[1]).toContain("M.");
    expect(lines[1]).toContain("Ks");
  });

  it("client legacy avec name='M. Ks Plomberie' et titre='M.' ne duplique pas", () => {
    const input = clientRowToBlockInput({
      name: "M. Ks Plomberie",
      titre: "M.",
      prenom: "Ks",
    });
    const lines = formatClientBlock(input);
    const joined = lines.join(" ").toLowerCase();
    // M. doit apparaître AU PLUS deux fois (une dans la raison sociale s'il y figure,
    // une dans la ligne contact). Pas trois.
    const matches = joined.match(/m\./g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(2);
  });
});

describe("looksLikeCompany — heuristique pro", () => {
  it("détecte SARL/SAS/EURL", () => {
    expect(looksLikeCompany("Dupont SARL")).toBe(true);
    expect(looksLikeCompany("DUPONT SAS")).toBe(true);
    expect(looksLikeCompany("Acme EURL")).toBe(true);
  });
  it("détecte les corps de métier BTP", () => {
    expect(looksLikeCompany("Ks Plomberie")).toBe(true);
    expect(looksLikeCompany("Dupont Électricité")).toBe(true);
    expect(looksLikeCompany("Toiture Express")).toBe(true);
  });
  it("ne déclenche pas pour un nom propre seul", () => {
    expect(looksLikeCompany("Jean Dupont")).toBe(false);
    expect(looksLikeCompany("Marie Martin")).toBe(false);
  });
  it("retourne false pour empty/null", () => {
    expect(looksLikeCompany(null)).toBe(false);
    expect(looksLikeCompany(undefined)).toBe(false);
    expect(looksLikeCompany("")).toBe(false);
  });
});

describe("clientRowToBlockInput — mapping legacy", () => {
  it("infère pro si name ressemble à une raison sociale", () => {
    const r = clientRowToBlockInput({
      name: "Ks Plomberie",
      titre: "M.",
      prenom: "Ks",
    });
    expect(r.type).toBe("PROFESSIONNEL");
    expect(r.company_name).toBe("Ks Plomberie");
    expect(r.contact_civility).toBe("M.");
    expect(r.contact_first_name).toBe("Ks");
    expect(r.legacy_name).toBeUndefined();
  });
  it("particulier si name ressemble à un nom de personne", () => {
    const r = clientRowToBlockInput({
      name: "Jean Dupont",
      titre: "M.",
      prenom: "Jean",
    });
    expect(r.type).toBe("PARTICULIER");
    expect(r.company_name).toBeUndefined();
  });
});
