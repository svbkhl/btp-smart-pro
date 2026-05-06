import { describe, it, expect } from "vitest";
import {
  resolveVatLegalMention,
  isZeroVatRegime,
  effectiveVatRate,
  detectVatRegimeMismatch,
  computeVatTotals,
} from "../vatRegime";

describe("resolveVatLegalMention", () => {
  it("standard → null", () => {
    expect(resolveVatLegalMention("STANDARD")).toBeNull();
  });
  it("293 B → mention exacte CGI", () => {
    expect(resolveVatLegalMention("FRANCHISE_293B")).toBe("TVA non applicable, art. 293 B du CGI.");
  });
  it("autoliquidation BTP → mention exacte CGI", () => {
    expect(resolveVatLegalMention("AUTOLIQUIDATION_BTP")).toBe(
      "Autoliquidation — TVA due par le preneur (art. 283-2 nonies CGI)."
    );
  });
  it("null/undefined → null", () => {
    expect(resolveVatLegalMention(null)).toBeNull();
    expect(resolveVatLegalMention(undefined)).toBeNull();
  });
});

describe("isZeroVatRegime / effectiveVatRate", () => {
  it("STANDARD garde le taux saisi", () => {
    expect(isZeroVatRegime("STANDARD")).toBe(false);
    expect(effectiveVatRate("STANDARD", 0.20)).toBe(0.20);
  });
  it("FRANCHISE_293B force à 0", () => {
    expect(isZeroVatRegime("FRANCHISE_293B")).toBe(true);
    expect(effectiveVatRate("FRANCHISE_293B", 0.20)).toBe(0);
  });
  it("AUTOLIQUIDATION_BTP force à 0", () => {
    expect(isZeroVatRegime("AUTOLIQUIDATION_BTP")).toBe(true);
    expect(effectiveVatRate("AUTOLIQUIDATION_BTP", 0.10)).toBe(0);
  });
});

describe("detectVatRegimeMismatch — Bug #1 ticket FACTURE-2026-002", () => {
  it("devis standard 20% + entreprise bascule en 293B → mismatch détecté", () => {
    const r = detectVatRegimeMismatch(
      { tva_non_applicable_293b: false, tva_rate: 0.20 },
      { vat_regime: "FRANCHISE_293B" }
    );
    expect(r.hasMismatch).toBe(true);
    expect(r.quoteRegime).toBe("STANDARD");
    expect(r.companyRegime).toBe("FRANCHISE_293B");
    expect(r.message?.toLowerCase()).toContain("franchise");
    expect(r.message).toContain("Continuer");
  });
  it("régimes alignés → pas de mismatch", () => {
    const r = detectVatRegimeMismatch(
      { tva_non_applicable_293b: false, tva_rate: 0.20 },
      { vat_regime: "STANDARD" }
    );
    expect(r.hasMismatch).toBe(false);
    expect(r.message).toBeNull();
  });
  it("entreprise sans régime explicite → STANDARD par défaut", () => {
    const r = detectVatRegimeMismatch(
      { tva_non_applicable_293b: true, tva_rate: 0 },
      { vat_regime: null }
    );
    expect(r.companyRegime).toBe("STANDARD");
    expect(r.hasMismatch).toBe(true);
  });
});

describe("computeVatTotals", () => {
  it("STANDARD 20% — exemple ticket : 640 HT → 128 TVA → 768 TTC", () => {
    const r = computeVatTotals({ totalHt: 640, requestedRate: 0.20, regime: "STANDARD" });
    expect(r.totalHt).toBe(640);
    expect(r.vatAmount).toBe(128);
    expect(r.totalTtc).toBe(768);
    expect(r.vatRate).toBe(0.20);
    expect(r.legalMention).toBeNull();
  });
  it("FRANCHISE_293B — TVA forcée à 0, mention présente", () => {
    const r = computeVatTotals({ totalHt: 640, requestedRate: 0.20, regime: "FRANCHISE_293B" });
    expect(r.totalHt).toBe(640);
    expect(r.vatAmount).toBe(0);
    expect(r.totalTtc).toBe(640); // HT = TTC
    expect(r.vatRate).toBe(0);
    expect(r.legalMention).toBe("TVA non applicable, art. 293 B du CGI.");
  });
  it("AUTOLIQUIDATION_BTP — TVA 0 + mention 283-2 nonies", () => {
    const r = computeVatTotals({ totalHt: 1000, requestedRate: 0.20, regime: "AUTOLIQUIDATION_BTP" });
    expect(r.vatAmount).toBe(0);
    expect(r.totalTtc).toBe(1000);
    expect(r.legalMention).toContain("283-2 nonies");
  });
  it("arrondit correctement à 2 décimales", () => {
    const r = computeVatTotals({ totalHt: 333.33, requestedRate: 0.20, regime: "STANDARD" });
    expect(r.vatAmount).toBe(66.67); // 333.33 * 0.20 = 66.666 → 66.67
    expect(r.totalTtc).toBe(400);
  });
});
