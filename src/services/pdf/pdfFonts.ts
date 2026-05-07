/**
 * Chargement et enregistrement des polices custom dans jsPDF.
 *
 * jsPDF n'a pas de support natif pour les polices web — il faut :
 *  1. Récupérer le binaire TTF
 *  2. Le convertir en base64
 *  3. L'injecter dans le VFS interne de jsPDF (`addFileToVFS`)
 *  4. L'enregistrer (`addFont`) en associant fichier + family + style
 *
 * Les fichiers TTF sont servis depuis `/public/fonts/` par Vite.
 * On cache les buffers en mémoire pour ne pas re-fetch à chaque génération.
 */

import type jsPDF from "jspdf";

interface FontSpec {
  family: string;
  weight: "normal" | "bold";
  url: string;
  filename: string;
}

const FONT_SPECS: FontSpec[] = [
  { family: "Inter", weight: "normal", url: "/fonts/Inter-Regular.ttf", filename: "Inter-Regular.ttf" },
  { family: "Inter", weight: "bold", url: "/fonts/Inter-SemiBold.ttf", filename: "Inter-SemiBold.ttf" },
  { family: "InterMedium", weight: "normal", url: "/fonts/Inter-Medium.ttf", filename: "Inter-Medium.ttf" },
  { family: "JetBrainsMono", weight: "normal", url: "/fonts/JetBrainsMono-Regular.ttf", filename: "JetBrainsMono-Regular.ttf" },
  { family: "JetBrainsMono", weight: "bold", url: "/fonts/JetBrainsMono-Medium.ttf", filename: "JetBrainsMono-Medium.ttf" },
];

const cache = new Map<string, string>();

async function fetchAsBase64(url: string): Promise<string> {
  if (cache.has(url)) return cache.get(url)!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} (${res.status})`);
  const buf = await res.arrayBuffer();
  // btoa nécessite des chunks pour ne pas exploser sur des gros buffers
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  const b64 = btoa(binary);
  cache.set(url, b64);
  return b64;
}

let registrationPromise: Promise<void> | null = null;

/**
 * Charge et enregistre toutes les polices custom dans le doc jsPDF.
 *
 * IMPORTANT : à appeler avant le premier `doc.setFont('Inter', ...)`.
 * En cas d'échec réseau (CDN down, dev offline, etc.) on retombe
 * silencieusement sur les polices Helvetica par défaut sans casser
 * la génération.
 */
export async function ensurePdfFonts(doc: jsPDF): Promise<{ available: boolean }> {
  // jsPDF stocke le VFS au niveau du module — pas de la doc instance.
  // Mais il faut quand même appeler addFont sur chaque doc qui veut s'en servir.
  try {
    if (!registrationPromise) {
      registrationPromise = (async () => {
        for (const spec of FONT_SPECS) {
          const b64 = await fetchAsBase64(spec.url);
          (doc as unknown as { addFileToVFS: (n: string, b: string) => void }).addFileToVFS(
            spec.filename,
            b64
          );
        }
      })();
    }
    await registrationPromise;
    // addFont doit être appelé sur le doc (chaque doc a son propre registry)
    for (const spec of FONT_SPECS) {
      doc.addFont(spec.filename, spec.family, spec.weight);
    }
    return { available: true };
  } catch (err) {
    console.warn("[pdfFonts] Impossible de charger les polices custom, fallback helvetica:", err);
    registrationPromise = null; // permettre un retry plus tard
    return { available: false };
  }
}

/**
 * Renvoie le nom de la police à utiliser selon que les fontes custom
 * sont chargées ou non. Permet aux renderers d'écrire :
 *   doc.setFont(font.sans, 'normal')
 * sans se soucier du fallback.
 */
export interface PdfFontFamily {
  sans: string;
  sansMedium: string;
  mono: string;
}

export function pdfFontFamily(available: boolean): PdfFontFamily {
  return available
    ? { sans: "Inter", sansMedium: "InterMedium", mono: "JetBrainsMono" }
    : { sans: "helvetica", sansMedium: "helvetica", mono: "courier" };
}
