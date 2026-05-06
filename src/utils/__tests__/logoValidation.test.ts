import { describe, it, expect } from "vitest";
import { detectUniformBorder, validateLogoFileSync } from "../logoValidation";

describe("validateLogoFileSync", () => {
  function makeFile(name: string, type: string, size: number): File {
    return new File([new Uint8Array(size)], name, { type });
  }

  it("accepte un PNG < 5 Mo sans erreur", () => {
    const r = validateLogoFileSync(makeFile("logo.png", "image/png", 100_000));
    expect(r.valid).toBe(true);
    expect(r.issues.find((i) => i.severity === "error")).toBeUndefined();
  });

  it("rejette un mime non listé", () => {
    const r = validateLogoFileSync(makeFile("logo.bmp", "image/bmp", 100_000));
    expect(r.valid).toBe(false);
    expect(r.issues[0]?.code).toBe("MIME_INVALID");
  });

  it("rejette si > 5 Mo", () => {
    const r = validateLogoFileSync(makeFile("logo.png", "image/png", 6 * 1024 * 1024));
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.code === "TOO_LARGE")).toBe(true);
  });

  it("warning JPEG non recommandé", () => {
    const r = validateLogoFileSync(makeFile("logo.jpg", "image/jpeg", 100_000));
    expect(r.valid).toBe(true); // warning n'invalide pas
    expect(r.issues.some((i) => i.code === "JPEG_NOT_RECOMMENDED")).toBe(true);
  });
});

describe("detectUniformBorder — heuristique capture d'écran", () => {
  function makePixels(borderColor: [number, number, number, number]) {
    return (_x: number, _y: number) => borderColor;
  }

  it("détecte fond uniforme (capture d'écran type bureau noir)", () => {
    const r = detectUniformBorder(400, 400, makePixels([0, 0, 0, 255]));
    expect(r.suspected).toBe(true);
    expect(r.ratio).toBeGreaterThanOrEqual(0.8);
  });

  it("ne déclenche pas si bordure totalement transparente (PNG transparent)", () => {
    const r = detectUniformBorder(400, 400, makePixels([0, 0, 0, 0]));
    expect(r.suspected).toBe(false);
  });

  it("ne déclenche pas pour image vraiment hétérogène", () => {
    const r = detectUniformBorder(400, 400, (x, y) => [
      (x * 7) % 256,
      (y * 11) % 256,
      (x + y) % 256,
      255,
    ]);
    expect(r.suspected).toBe(false);
  });

  it("ne déclenche pas sur image trop petite", () => {
    const r = detectUniformBorder(2, 2, makePixels([255, 255, 255, 255]));
    expect(r.suspected).toBe(false);
  });
});
