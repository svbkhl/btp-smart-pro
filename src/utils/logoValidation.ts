/**
 * Validation logo — au-delà du simple check mime/taille.
 *
 * Bug #3 du ticket : un client a uploadé une capture d'écran avec fond noir.
 * On ne peut pas garantir 100 % qu'on rejettera tout, mais on lève des
 * warnings explicites sur :
 *   - Format non recommandé (JPG opaque préféré : PNG transparent / SVG)
 *   - Dimensions trop petites (< 200 × 200 px)
 *   - Ratio anormal (logo trop large/haut)
 *   - Bordure uniforme (heuristique capture d'écran)
 *
 * L'utilisateur peut toujours forcer (sauf erreurs hard : mauvais mime, > 5 Mo).
 */

export type LogoValidationSeverity = "error" | "warning";

export interface LogoValidationIssue {
  severity: LogoValidationSeverity;
  code: string;
  message: string;
}

export interface LogoValidationResult {
  valid: boolean; // false uniquement si au moins un "error"
  issues: LogoValidationIssue[];
  /** Dimensions détectées si chargées avec succès. */
  width?: number;
  height?: number;
}

const ACCEPTED_MIMES = ["image/png", "image/svg+xml", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_DIMENSION = 200;
const RATIO_LIMIT_HIGH = 4; // largeur > 4 × hauteur → warning
const RATIO_LIMIT_LOW = 1 / 4; // hauteur > 4 × largeur → warning

const SCREENSHOT_BORDER_THRESHOLD = 0.8; // % de pixels uniformes pour suspecter une capture
const COLOR_DELTA_EPSILON = 12; // tolérance par canal RGB

/**
 * Étape 1 — validation synchrone basique (mime + taille). Bloquante.
 */
export function validateLogoFileSync(file: File): LogoValidationResult {
  const issues: LogoValidationIssue[] = [];

  if (!ACCEPTED_MIMES.includes(file.type)) {
    issues.push({
      severity: "error",
      code: "MIME_INVALID",
      message: "Le fichier doit être une image PNG, SVG, JPEG ou WebP.",
    });
  }

  if (file.size > MAX_BYTES) {
    issues.push({
      severity: "error",
      code: "TOO_LARGE",
      message: "Le fichier ne doit pas dépasser 5 Mo.",
    });
  }

  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    issues.push({
      severity: "warning",
      code: "JPEG_NOT_RECOMMENDED",
      message:
        "Pour un logo, nous recommandons un PNG transparent ou un SVG. Un JPEG aura un fond opaque sur le PDF.",
    });
  }

  return {
    valid: !issues.some((i) => i.severity === "error"),
    issues,
  };
}

/**
 * Charge l'image en mémoire pour mesurer dimensions + sampler les bordures.
 * Renvoie un ImageBitmap + un canvas-like pour pixel sampling.
 */
async function loadImageData(file: File): Promise<{
  width: number;
  height: number;
  getPixel: (x: number, y: number) => [number, number, number, number];
} | null> {
  // SVG : pas de pixel data, on skip la heuristique screenshot.
  if (file.type === "image/svg+xml") return null;

  // createImageBitmap est dispo dans tous les navigateurs modernes + Node 21+.
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas === "undefined") {
    return null;
  }

  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const data = imageData.data;
  const w = bitmap.width;
  const h = bitmap.height;
  bitmap.close?.();

  return {
    width: w,
    height: h,
    getPixel: (x, y) => {
      const i = (y * w + x) * 4;
      return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, data[i + 3] ?? 0];
    },
  };
}

function pixelsClose(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  return (
    Math.abs(a[0] - b[0]) <= COLOR_DELTA_EPSILON &&
    Math.abs(a[1] - b[1]) <= COLOR_DELTA_EPSILON &&
    Math.abs(a[2] - b[2]) <= COLOR_DELTA_EPSILON
  );
}

/**
 * Heuristique capture d'écran : on échantillonne ~32 points sur la bordure
 * de l'image et on regarde si plus de 80 % d'entre eux ont (à epsilon près)
 * la même couleur opaque. Si oui → probablement un fond uniforme = capture
 * d'écran avec fond bureau ou aplat.
 *
 * Pure function exposée pour tests.
 */
export function detectUniformBorder(
  width: number,
  height: number,
  getPixel: (x: number, y: number) => [number, number, number, number]
): { ratio: number; suspected: boolean } {
  if (width < 4 || height < 4) return { ratio: 0, suspected: false };

  const samples: Array<[number, number, number, number]> = [];
  const N = 8; // 8 points par côté
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    samples.push(getPixel(Math.floor(t * (width - 1)), 0)); // top
    samples.push(getPixel(Math.floor(t * (width - 1)), height - 1)); // bottom
    samples.push(getPixel(0, Math.floor(t * (height - 1)))); // left
    samples.push(getPixel(width - 1, Math.floor(t * (height - 1)))); // right
  }

  // Regrouper les pixels qui ressemblent au pixel coin haut-gauche
  const ref = samples[0];
  if (!ref) return { ratio: 0, suspected: false };
  // Si pixel de référence est totalement transparent → image avec alpha,
  // pas une capture d'écran. On ne déclenche pas.
  if (ref[3] < 200) return { ratio: 0, suspected: false };

  const matching = samples.filter((p) => pixelsClose(p, ref)).length;
  const ratio = matching / samples.length;
  return { ratio, suspected: ratio >= SCREENSHOT_BORDER_THRESHOLD };
}

/**
 * Étape 2 — validation async complète : décode l'image, ajoute warnings sur
 * dimensions / ratio / capture d'écran probable.
 *
 * En environnement Node sans OffscreenCanvas (tests), elle reste fiable :
 * elle renvoie le résultat sync sans warnings dimensions/screenshot.
 */
export async function validateLogoFile(file: File): Promise<LogoValidationResult> {
  const sync = validateLogoFileSync(file);
  if (!sync.valid) return sync;

  const issues: LogoValidationIssue[] = [...sync.issues];

  let width: number | undefined;
  let height: number | undefined;

  try {
    const data = await loadImageData(file);
    if (data) {
      width = data.width;
      height = data.height;

      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        issues.push({
          severity: "warning",
          code: "DIMENSIONS_LOW",
          message: `Le logo est petit (${width}×${height} px). Pour un PDF net, privilégiez au moins ${MIN_DIMENSION}×${MIN_DIMENSION} px.`,
        });
      }

      const ratio = width / height;
      if (ratio > RATIO_LIMIT_HIGH || ratio < RATIO_LIMIT_LOW) {
        issues.push({
          severity: "warning",
          code: "RATIO_EXTREME",
          message: `Le logo a un ratio inhabituel (${ratio.toFixed(2)}). Il risque d'être déformé sur le PDF.`,
        });
      }

      const border = detectUniformBorder(width, height, data.getPixel);
      if (border.suspected) {
        issues.push({
          severity: "warning",
          code: "SCREENSHOT_SUSPECTED",
          message:
            "Votre logo semble être une capture d'écran (fond uniforme détecté). Pour un rendu professionnel, nous recommandons un PNG transparent ou un SVG.",
        });
      }
    }
  } catch {
    // Décodage impossible — on n'ajoute pas d'erreur bloquante, juste un warning.
    issues.push({
      severity: "warning",
      code: "DECODE_FAILED",
      message: "Impossible d'analyser l'image pour vérifier ses dimensions. Le logo sera utilisé tel quel.",
    });
  }

  return {
    valid: !issues.some((i) => i.severity === "error"),
    issues,
    width,
    height,
  };
}
