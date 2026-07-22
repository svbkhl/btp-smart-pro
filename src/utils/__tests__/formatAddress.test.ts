import { describe, it, expect } from "vitest";
import { stripBuildingUnit } from "../formatAddress";

describe("stripBuildingUnit", () => {
  it("retourne une chaîne vide pour null/undefined/vide", () => {
    expect(stripBuildingUnit(null)).toBe("");
    expect(stripBuildingUnit(undefined)).toBe("");
    expect(stripBuildingUnit("")).toBe("");
  });

  it("laisse intacte une adresse sans mention de bâtiment/porte", () => {
    expect(stripBuildingUnit("540 Route des Vignes")).toBe("540 Route des Vignes");
    expect(stripBuildingUnit("12 bis rue de la Paix")).toBe("12 bis rue de la Paix");
  });

  it("retire un numéro de bâtiment", () => {
    expect(stripBuildingUnit("540 Route des Vignes, Bât. B")).toBe("540 Route des Vignes");
    expect(stripBuildingUnit("Bâtiment 3, 540 Route des Vignes")).toBe("540 Route des Vignes");
    expect(stripBuildingUnit("540 Route des Vignes Bat A2")).toBe("540 Route des Vignes");
  });

  it("retire un numéro d'appartement", () => {
    expect(stripBuildingUnit("540 Route des Vignes, Appt 12")).toBe("540 Route des Vignes");
    expect(stripBuildingUnit("540 Route des Vignes, Appartement 4B")).toBe("540 Route des Vignes");
    expect(stripBuildingUnit("Apt B, 540 Route des Vignes")).toBe("540 Route des Vignes");
  });

  it("retire un numéro de porte", () => {
    expect(stripBuildingUnit("540 Route des Vignes, Porte 8")).toBe("540 Route des Vignes");
    expect(stripBuildingUnit("540 Route des Vignes, porte n° 3")).toBe("540 Route des Vignes");
  });

  it("retire plusieurs mentions combinées", () => {
    expect(stripBuildingUnit("540 Route des Vignes, Bât. B, Appt 12")).toBe("540 Route des Vignes");
  });

  it("ne touche pas aux noms de rue contenant 'porte'", () => {
    expect(stripBuildingUnit("2 avenue de la Porte de Versailles")).toBe(
      "2 avenue de la Porte de Versailles"
    );
    expect(stripBuildingUnit("5 rue de la Porte Jaune")).toBe("5 rue de la Porte Jaune");
  });

  it("garde le numéro de rue", () => {
    expect(stripBuildingUnit("128 Grande Rue, Porte 2")).toBe("128 Grande Rue");
  });
});
