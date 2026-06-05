/**
 * Renderer PDF thème Eau'pération Sanitaire.
 *
 * Bannière navy + liseré rouge + logo + cyan.
 * Polices Archivo (titres) + Manrope (corps).
 * Gère devis (sections + lignes) ET factures (service_lines).
 *
 * Ne jamais appeler directement — passer par pdfService / invoicePdfService
 * qui appellent après avoir résolu le thème via getTheme(companyId).
 */

import jsPDF from "jspdf";
import type { UserSettings } from "@/hooks/useUserSettings";
import type { Invoice } from "@/hooks/useInvoices";
import { formatClientBlock, clientRowToBlockInput } from "@/utils/formatClientBlock";
import {
  EAUPERATION_LOGO_URL,
  EAUPERATION_HEADER,
  eauperationTheme,
} from "./themes/eauperation";
import type { RGB } from "./themes/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EauperationLine {
  label: string;
  unit?: string;
  quantity?: number;
  unit_price_ht?: number | null;
  total_ht: number;
  tva_rate: number;
  total_tva: number;
  total_ttc: number;
  section_id?: string | null;
}

export interface EauperationSection {
  id: string;
  title: string;
  position: number;
}

export interface EauperationClientInfo {
  name: string;
  civility?: string;
  firstName?: string;
  phone?: string;
  email?: string;
  location?: string;
  address?: string;
}

interface EauperationDevisParams {
  mode: "devis";
  companyInfo: UserSettings;
  clientInfo: EauperationClientInfo;
  quoteNumber: string;
  quoteDate: Date;
  sections: EauperationSection[];
  lines: EauperationLine[];
  subtotalHT: number;
  totalTVA: number;
  totalTTC: number;
  tva293b: boolean;
  signatureData?: string;
  signedBy?: string;
  signedAt?: string;
}

interface EauperationFactureParams {
  mode: "facture";
  invoice: Invoice;
  companyInfo?: UserSettings;
  clientRow?: {
    name?: string | null;
    titre?: string | null;
    prenom?: string | null;
    phone?: string | null;
    location?: string | null;
  };
}

export type EauperationRenderParams = EauperationDevisParams | EauperationFactureParams;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const A4 = { w: 210, h: 297, mx: 15, my: 10 } as const;

function fx(doc: jsPDF, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
}
function tx(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2]);
}
function dx(doc: jsPDF, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function euro(amount: number | undefined): string {
  if (!amount && amount !== 0) return "0,00 €";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "0,00 €";
  const [int, dec] = n.toFixed(2).split(".");
  return `${(int ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec ?? "00"} €`;
}

function fdate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(() => reject(new Error("logo timeout")), 8000);
    img.onload = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); reject(new Error("logo load error")); };
    img.src = src;
  });
}

// ─── Font loader ──────────────────────────────────────────────────────────────

interface FontSpec { family: string; weight: "normal" | "bold"; url: string; file: string; }
const EAUP_FONTS: FontSpec[] = [
  { family: "Archivo",        weight: "bold",   url: "/fonts/Archivo-Bold.ttf",      file: "Archivo-Bold.ttf" },
  { family: "Manrope",        weight: "normal", url: "/fonts/Manrope-Regular.ttf",   file: "Manrope-Regular.ttf" },
  { family: "Manrope",        weight: "bold",   url: "/fonts/Manrope-SemiBold.ttf",  file: "Manrope-SemiBold.ttf" },
];

const fontCache = new Map<string, string>();
let fontLoadPromise: Promise<boolean> | null = null;

async function ensureEauperationFonts(doc: jsPDF): Promise<boolean> {
  if (!fontLoadPromise) {
    fontLoadPromise = (async () => {
      try {
        for (const spec of EAUP_FONTS) {
          if (!fontCache.has(spec.url)) {
            const res = await fetch(spec.url);
            if (!res.ok) throw new Error(`Font ${spec.url}: ${res.status}`);
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let bin = "";
            const chunk = 0x8000;
            for (let i = 0; i < bytes.length; i += chunk)
              bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
            fontCache.set(spec.url, btoa(bin));
          }
          (doc as any).addFileToVFS(spec.file, fontCache.get(spec.url)!);
        }
        return true;
      } catch (e) {
        console.warn("[renderEauperation] fonts unavailable, fallback helvetica:", e);
        fontLoadPromise = null;
        return false;
      }
    })();
  }

  const ok = await fontLoadPromise;
  if (ok) {
    for (const spec of EAUP_FONTS) {
      doc.addFont(spec.file, spec.family, spec.weight);
    }
    // addFont swallows parse errors via PubSub — verify fonts actually registered
    const registered = (doc as any).getFontList?.() ?? {};
    if (!registered['Archivo'] || !registered['Manrope']) {
      fontLoadPromise = Promise.resolve(false); // permanently use helvetica
      return false;
    }
  }
  return ok;
}

// ─── Banner ───────────────────────────────────────────────────────────────────

const BANNER_H    = 44;   // mm
const RED_STRIP_W = 5;    // mm
const LOGO_MAX    = 32;   // mm (height)

async function drawBanner(
  doc: jsPDF,
  fontsOk: boolean,
  docLabel: "DEVIS" | "FACTURE",
  yStart: number
): Promise<number> {
  const C = eauperationTheme.colors;
  const rightX = A4.w - A4.mx;
  const contentW = A4.w - 2 * A4.mx;

  // Navy background
  fx(doc, C.primary);
  doc.rect(A4.mx, yStart, contentW, BANNER_H, "F");

  // Red vertical stripe (right edge)
  fx(doc, C.accent);
  doc.rect(rightX - RED_STRIP_W, yStart, RED_STRIP_W, BANNER_H, "F");

  // Logo
  let logoW = 0;
  try {
    const logoImg = await loadImg(EAUPERATION_LOGO_URL);
    const ratio = logoImg.width / Math.max(logoImg.height, 1);
    const lh = LOGO_MAX;
    const lw = Math.min(40, lh * ratio);
    doc.addImage(logoImg, "PNG", A4.mx + 3, yStart + (BANNER_H - lh) / 2, lw, lh);
    logoW = lw + 5;
  } catch {
    // Pas de logo → on commence directement
  }

  const centerX = A4.mx + logoW + 3;
  const devisAreaRight = rightX - RED_STRIP_W - 4;

  tx(doc, C.onPrimary);

  // Company name
  const titleFont = fontsOk ? "Archivo" : "helvetica";
  const bodyFont  = fontsOk ? "Manrope" : "helvetica";

  doc.setFont(titleFont, "bold");
  doc.setFontSize(18);
  const companyNameY = yStart + 12;
  doc.text("Eau'pération Sanitaire", centerX, companyNameY);

  // Red underline under company name
  const companyW = doc.getTextWidth("Eau'pération Sanitaire");
  fx(doc, C.accent);
  doc.rect(centerX, companyNameY + 1.5, companyW, 1, "F");

  tx(doc, C.onPrimary);

  // Sub-lines (city, phone, tagline)
  doc.setFont(bodyFont, "normal");
  doc.setFontSize(8.5);
  doc.text(EAUPERATION_HEADER.city, centerX, yStart + 20);

  // Star + phone: parts in red (separators)
  const starLine = `${EAUPERATION_HEADER.stars}  ${EAUPERATION_HEADER.phone1}  ·  ${EAUPERATION_HEADER.phone2}`;
  doc.text(starLine, centerX, yStart + 27);

  // Tagline with colored separators — render as plain text (jsPDF has no inline spans)
  doc.text(EAUPERATION_HEADER.tagline, centerX, yStart + 33.5);

  // DEVIS / FACTURE label (right side, before red strip)
  doc.setFont(titleFont, "bold");
  doc.setFontSize(22);
  const devisW = doc.getTextWidth(docLabel);
  const devisX = devisAreaRight;
  const devisY = yStart + 22;
  doc.text(docLabel, devisX, devisY, { align: "right" });

  // Cyan underline under DEVIS/FACTURE
  fx(doc, C.accent2);
  doc.rect(devisX - devisW, devisY + 1.5, devisW, 1.2, "F");

  // Cyan line full width below banner
  fx(doc, C.accent2);
  doc.rect(A4.mx, yStart + BANNER_H, contentW, 0.8, "F");

  return yStart + BANNER_H + 0.8 + 5; // next y (with breathing room)
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function drawTableHeader(
  doc: jsPDF,
  fontsOk: boolean,
  y: number,
  COL: ReturnType<typeof buildCOL>,
  tva293b: boolean
): number {
  const C = eauperationTheme.colors;
  const rightX = A4.w - A4.mx;
  const contentW = A4.w - 2 * A4.mx;

  if (y + 8 > A4.h - A4.my - 20) {
    doc.addPage();
    y = A4.my;
  }

  fx(doc, C.primary);
  doc.rect(A4.mx, y, contentW, 8, "F");
  tx(doc, C.onPrimary);
  doc.setFontSize(7.5);
  doc.setFont(fontsOk ? "Archivo" : "helvetica", "bold");

  doc.text("RÉF",        COL.ref,   y + 5.5);
  doc.text("DÉSIGNATION",COL.desig, y + 5.5);
  doc.text("UNITÉ",      COL.unite, y + 5.5);
  doc.text("PRIX HT",    COL.pu,    y + 5.5);
  doc.text("QTÉ",        COL.qty,   y + 5.5);
  doc.text("TOTAL HT",   COL.ht,    y + 5.5, tva293b ? { align: "right" } : undefined);
  if (!tva293b) doc.text("TVA", COL.tva, y + 5.5);
  doc.text("TOTAL TTC",  rightX,    y + 5.5, { align: "right" });

  return y + 8;
}

function buildCOL(tva293b: boolean) {
  const mx = A4.mx;
  if (tva293b) {
    return {
      ref:    mx + 2,  desig:  mx + 12, desigW: 78,
      unite:  mx + 93, pu:     mx + 116, qty:    mx + 138,
      ht:     mx + 158, tva:   0,
    };
  }
  return {
    ref:    mx + 2,  desig:  mx + 12, desigW: 67,
    unite:  mx + 80, pu:     mx + 99,  qty:    mx + 124,
    ht:     mx + 135, tva:   mx + 158,
  };
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export async function renderEauperation(
  doc: jsPDF,
  params: EauperationRenderParams
): Promise<void> {
  const fontsOk = false; // custom fonts disabled — jsPDF cannot parse these TTF files
  const C = eauperationTheme.colors;
  const titleFont = fontsOk ? "Archivo" : "helvetica";
  const bodyFont  = fontsOk ? "Manrope" : "helvetica";
  const rightX    = A4.w - A4.mx;
  const contentW  = A4.w - 2 * A4.mx;

  // ── Banner ─────────────────────────────────────────────────────────────────
  const docLabel = params.mode === "devis" ? "DEVIS" : "FACTURE";
  let y = await drawBanner(doc, fontsOk, docLabel, A4.my);

  // ── Émetteur (coordonnées entreprise) ─────────────────────────────────────
  const ci = params.mode === "devis" ? params.companyInfo : params.companyInfo;
  doc.setFont(bodyFont, "normal");
  doc.setFontSize(8.5);
  tx(doc, C.ink);

  const emetteurLines: string[] = [];
  if (ci?.address)     emetteurLines.push(ci.address.trim());
  if (ci?.postal_code || ci?.city) {
    emetteurLines.push(`${ci?.postal_code ?? ""} ${ci?.city ?? ""}`.trim());
  }
  if (ci?.phone)  emetteurLines.push(`Tél. ${EAUPERATION_HEADER.phone1}  ·  ${EAUPERATION_HEADER.phone2}`);
  if (ci?.email)  emetteurLines.push(ci.email);

  let emetteurY = y;
  emetteurLines.forEach((l) => {
    doc.text(l, A4.mx, emetteurY);
    emetteurY += 4.5;
  });

  // ── N° et date (droite) ───────────────────────────────────────────────────
  let docNumber = "";
  let docDate: Date = new Date();
  if (params.mode === "devis") {
    docNumber = params.quoteNumber;
    docDate   = params.quoteDate;
  } else {
    docNumber = params.invoice.invoice_number || "";
    docDate   = new Date(params.invoice.created_at || Date.now());
  }

  doc.setFont(titleFont, "bold");
  doc.setFontSize(9);
  tx(doc, C.ink);
  doc.text(`N° ${docNumber}`, rightX, y, { align: "right" });
  doc.setFont(bodyFont, "normal");
  doc.setFontSize(8.5);
  tx(doc, C.muted);
  doc.text(`Date : ${fdate(docDate)}`, rightX, y + 5.5, { align: "right" });

  y = Math.max(emetteurY, y + 14) + 4;

  // ── Bloc client ────────────────────────────────────────────────────────────
  let clientLines: string[] = [];
  let clientPhone = "";
  let clientAddr  = "";

  if (params.mode === "devis") {
    const inf = params.clientInfo;
    clientLines = formatClientBlock(
      clientRowToBlockInput({
        name:   inf.name,
        titre:  inf.civility as any ?? null,
        prenom: inf.firstName ?? null,
      })
    );
    clientPhone = inf.phone || "";
    clientAddr  = inf.address || inf.location || "";
  } else {
    const cr = params.clientRow;
    clientLines = formatClientBlock(
      clientRowToBlockInput({
        name:   cr?.name ?? params.invoice.client_name ?? null,
        titre:  cr?.titre ?? null,
        prenom: cr?.prenom ?? null,
      })
    );
    clientPhone = cr?.phone || "";
    clientAddr  = params.invoice.client_address || cr?.location || "";
  }

  const clientBlockH = 28;
  // Fond soft + bordure cyan à gauche
  fx(doc, C.soft);
  doc.roundedRect(A4.mx, y, contentW, clientBlockH, 2, 2, "F");
  dx(doc, C.accent2);
  doc.setLineWidth(0.8);
  doc.rect(A4.mx, y, 2.5, clientBlockH, "F");
  doc.setLineWidth(0.2);
  dx(doc, C.line);
  doc.roundedRect(A4.mx, y, contentW, clientBlockH, 2, 2, "D");

  doc.setFont(bodyFont, "bold");
  doc.setFontSize(7.5);
  tx(doc, C.muted);
  doc.text("CLIENT", A4.mx + 6, y + 6);

  doc.setFont(bodyFont, "bold");
  doc.setFontSize(10);
  tx(doc, C.ink);
  let cy = y + 12;
  (clientLines.slice(0, 2)).forEach((l) => {
    doc.text(l, A4.mx + 6, cy);
    cy += 5;
  });
  doc.setFont(bodyFont, "normal");
  doc.setFontSize(8.5);
  tx(doc, C.muted);
  if (clientAddr)  { doc.text(clientAddr,  A4.mx + 6, cy); cy += 4.5; }
  if (clientPhone) { doc.text(`Tél. ${clientPhone}`, A4.mx + 6, cy); }

  y += clientBlockH + 6;

  // ── Tableau des prestations ────────────────────────────────────────────────
  if (params.mode === "devis") {
    y = await renderDevisTable(doc, params, y, fontsOk);
  } else {
    y = renderFactureTable(doc, params, y, fontsOk);
  }

  // ── Conditions de règlement ────────────────────────────────────────────────
  y = renderConditions(doc, y, fontsOk);

  // ── Signature (devis seulement) ────────────────────────────────────────────
  if (params.mode === "devis" && (params.signatureData || params.signedBy)) {
    y = await renderSignature(doc, params, y, fontsOk);
  }

  // ── Pied de page ───────────────────────────────────────────────────────────
  renderFooter(doc, ci, fontsOk);
}

// ─── Devis table ──────────────────────────────────────────────────────────────

async function renderDevisTable(
  doc: jsPDF,
  params: EauperationDevisParams,
  yStart: number,
  fontsOk: boolean
): Promise<number> {
  const C       = eauperationTheme.colors;
  const rightX  = A4.w - A4.mx;
  const bodyFont = fontsOk ? "Manrope" : "helvetica";
  const refFont  = fontsOk ? "Archivo" : "helvetica";
  const COL      = buildCOL(params.tva293b);
  let y          = yStart;

  const { sections, tva293b, materialClauseInFooter: _ } = {
    ...params,
    materialClauseInFooter: eauperationTheme.materialClauseInFooter,
  };

  // Filter lines to display (exclude material clause if theme says so)
  const displayLines = eauperationTheme.materialClauseInFooter
    ? params.lines.filter((l) => !(l.unit_price_ht == null && l.total_ht === 0))
    : params.lines;

  // Group by section
  type SectionGroup = { section: EauperationSection | null; lines: typeof displayLines };
  const groups: SectionGroup[] = [];

  if (sections.length > 0) {
    sections
      .slice()
      .sort((a, b) => a.position - b.position)
      .forEach((sec) => {
        const sl = displayLines.filter((l) => l.section_id === sec.id);
        if (sl.length > 0) groups.push({ section: sec, lines: sl });
      });
  }
  const noSec = displayLines.filter((l) => !l.section_id);
  if (noSec.length > 0) groups.push({ section: null, lines: noSec });
  if (groups.length === 0) groups.push({ section: null, lines: displayLines });

  let totalHT = 0, totalTTC = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const { section, lines: sLines } = groups[gi]!;

    // Section title
    if (section) {
      const rawTitle = `${gi + 1}. ${section.title}`;
      doc.setFont(fontsOk ? "Archivo" : "helvetica", "bold");
      doc.setFontSize(10);
      const titleWrapped: string[] = rawTitle
        .split("\n")
        .flatMap((l) => doc.splitTextToSize(l, contentW()) as string[]);
      const titleBlockH = titleWrapped.length * 5 + 4;

      if (y + titleBlockH + 20 > A4.h - A4.my) { doc.addPage(); y = A4.my; }
      tx(doc, C.primary);
      doc.text(titleWrapped[0]!, A4.mx, y);
      y += 5.5;

      if (titleWrapped.length > 1) {
        doc.setFont(bodyFont, "normal");
        doc.setFontSize(8.5);
        tx(doc, C.ink);
        titleWrapped.slice(1).forEach((tl) => {
          doc.text(tl, A4.mx, y);
          y += 4.5;
        });
      }
      y += 2;
    }

    // Table header
    y = drawTableHeader(doc, fontsOk, y, COL, tva293b);

    // Rows
    sLines.forEach((line, li) => {
      const lineNum = section ? `${gi + 1}.${li + 1}` : `${li + 1}`;
      const labelLines = doc.splitTextToSize(line.label || "", COL.desigW) as string[];
      const lineH = Math.max(7, labelLines.length * 4 + 3);

      if (y + lineH > A4.h - A4.my - 20) {
        doc.addPage();
        y = A4.my;
        y = drawTableHeader(doc, fontsOk, y, COL, tva293b);
      }

      // Alternate row background
      if (li % 2 === 0) {
        fx(doc, C.soft);
        doc.rect(A4.mx, y, contentW(), lineH, "F");
      }

      doc.setFontSize(8);
      const midY = y + lineH / 2 + 1.5;

      // Ref — cyan + bold
      doc.setFont(refFont, "bold");
      tx(doc, C.accent2);
      doc.text(lineNum, COL.ref, midY);

      // Label — all wrapped lines
      doc.setFont(bodyFont, "normal");
      tx(doc, C.ink);
      labelLines.forEach((lbl, i) => {
        doc.text(lbl, COL.desig, y + 4 + i * 4);
      });

      // Numeric columns (centered vertically)
      tx(doc, C.ink);
      doc.text(line.unit || "-",                                            COL.unite, midY);
      doc.text(line.unit_price_ht != null ? euro(line.unit_price_ht) : "-", COL.pu,    midY);
      doc.text(String(line.quantity ?? 1),                                   COL.qty,   midY);
      doc.text(euro(line.total_ht),                                          COL.ht,    midY, tva293b ? { align: "right" } : undefined);
      if (!tva293b) {
        doc.text(`${(line.tva_rate * 100).toFixed(0)}%`, COL.tva, midY);
      }
      doc.text(euro(line.total_ttc), rightX, midY, { align: "right" });

      totalHT  += line.total_ht;
      totalTTC += line.total_ttc;
      y += lineH;
    });

    y += 4;
  }

  // ── Totals block ────────────────────────────────────────────────────────────
  if (y > A4.h - A4.my - 55) { doc.addPage(); y = A4.my; }

  const fHT  = params.subtotalHT  ?? totalHT;
  const fTTC = params.totalTTC    ?? totalTTC;

  y = renderTotalsBlock(doc, { ht: fHT, ttc: fTTC, tva293b: params.tva293b }, y, fontsOk);

  return y;
}

// ─── Facture table ────────────────────────────────────────────────────────────

function renderFactureTable(
  doc: jsPDF,
  params: EauperationFactureParams,
  yStart: number,
  fontsOk: boolean
): number {
  const C      = eauperationTheme.colors;
  const rightX = A4.w - A4.mx;
  const bodyFont = fontsOk ? "Manrope" : "helvetica";
  const { invoice } = params;
  let y = yStart;

  const sLines = invoice.service_lines ?? [];
  const fallbackDesc = invoice.description || "Prestation";

  if (sLines.length > 0) {
    // Header
    if (y + 10 > A4.h - A4.my - 80) { doc.addPage(); y = A4.my; }

    fx(doc, C.primary);
    doc.rect(A4.mx, y, contentW(), 8, "F");
    tx(doc, C.onPrimary);
    doc.setFontSize(7.5);
    doc.setFont(fontsOk ? "Archivo" : "helvetica", "bold");
    doc.text("DÉSIGNATION",              A4.mx + 2,         y + 5.5);
    doc.text("QTÉ",                      A4.mx + contentW() * 0.62, y + 5.5, { align: "right" });
    doc.text("PRIX HT",                  A4.mx + contentW() * 0.79, y + 5.5, { align: "right" });
    doc.text("TOTAL HT",                 rightX,            y + 5.5, { align: "right" });
    y += 8;

    let calcHT = 0;
    sLines.forEach((l, i) => {
      if (y > A4.h - A4.my - 30) { doc.addPage(); y = A4.my; }
      const qty  = l.quantity  || 1;
      const unit = l.unit_price || 0;
      const tot  = l.total ?? qty * unit;
      calcHT += tot;

      if (i % 2 === 0) { fx(doc, C.soft); doc.rect(A4.mx, y, contentW(), 6, "F"); }

      doc.setFontSize(8.5);
      doc.setFont(bodyFont, "normal");
      tx(doc, C.ink);
      const wrapped = doc.splitTextToSize(l.description || fallbackDesc, contentW() * 0.58) as string[];
      wrapped.forEach((t, idx) => doc.text(t, A4.mx + 2, y + 4 + idx * 4));
      const rowH = Math.max(6, wrapped.length * 4);
      doc.text(String(qty), A4.mx + contentW() * 0.62, y + 4, { align: "right" });
      doc.text(euro(unit),  A4.mx + contentW() * 0.79, y + 4, { align: "right" });
      doc.text(euro(tot),   rightX,                    y + 4, { align: "right" });
      y += rowH;
    });

    const totalTTC = invoice.total_ttc ?? invoice.amount ?? 0;
    const totalHT  = invoice.total_ht  ?? calcHT;
    const hasVAT   = (invoice.tva ?? 0) > 0;
    const tva293b  = !hasVAT;

    y = renderTotalsBlock(doc, { ht: totalHT, ttc: totalTTC, tva293b }, y, fontsOk);
  } else {
    // No service_lines — show description row + totals
    const totalTTC = invoice.total_ttc ?? invoice.amount ?? 0;
    const totalHT  = invoice.total_ht  ?? totalTTC;
    const hasVAT   = (invoice.tva ?? 0) > 0;
    const tva293b  = !hasVAT;

    if (y + 10 > A4.h - A4.my - 60) { doc.addPage(); y = A4.my; }

    fx(doc, C.primary);
    doc.rect(A4.mx, y, contentW(), 8, "F");
    tx(doc, C.onPrimary);
    doc.setFontSize(7.5);
    doc.setFont(fontsOk ? "Archivo" : "helvetica", "bold");
    doc.text("DÉSIGNATION", A4.mx + 2, y + 5.5);
    doc.text("TOTAL HT",    rightX,     y + 5.5, { align: "right" });
    y += 8;

    const desc = invoice.description || fallbackDesc;
    if (y + 8 > A4.h - A4.my - 30) { doc.addPage(); y = A4.my; }
    fx(doc, C.soft);
    const descWrapped = doc.splitTextToSize(desc.slice(0, 120), contentW() * 0.76) as string[];
    const rowH = Math.max(8, descWrapped.length * 4 + 2);
    doc.rect(A4.mx, y, contentW(), rowH, "F");
    doc.setFontSize(8.5);
    doc.setFont(bodyFont, "normal");
    tx(doc, C.ink);
    descWrapped.forEach((l, i) => doc.text(l, A4.mx + 2, y + 4 + i * 4));
    doc.text(euro(totalHT), rightX, y + rowH / 2 + 1.5, { align: "right" });
    y += rowH;

    y = renderTotalsBlock(doc, { ht: totalHT, ttc: totalTTC, tva293b }, y, fontsOk);
  }

  return y;
}

// ─── Totals block ─────────────────────────────────────────────────────────────

function renderTotalsBlock(
  doc: jsPDF,
  totals: { ht: number; ttc: number; tva293b: boolean },
  yStart: number,
  fontsOk: boolean
): number {
  const C      = eauperationTheme.colors;
  const rightX = A4.w - A4.mx;
  const bFont  = fontsOk ? "Manrope" : "helvetica";
  const tFont  = fontsOk ? "Archivo" : "helvetica";
  let y = yStart + 3;

  // Navy box
  const boxH = totals.tva293b ? 28 : 34;
  if (y + boxH > A4.h - A4.my - 20) { doc.addPage(); y = A4.my; }

  fx(doc, C.primary);
  doc.roundedRect(rightX - 75, y, 75, boxH, 2, 2, "F");

  // Red left border
  fx(doc, C.accent);
  doc.rect(rightX - 75, y, 2.5, boxH, "F");

  // Total HT
  doc.setFont(bFont, "normal");
  doc.setFontSize(8.5);
  tx(doc, [200, 210, 220] as RGB);
  doc.text("Total HT :",        rightX - 70, y + 8);
  tx(doc, C.onPrimary);
  doc.text(euro(totals.ht),     rightX - 3,  y + 8, { align: "right" });

  // TVA mention
  if (totals.tva293b) {
    doc.setFontSize(7);
    tx(doc, [200, 210, 220] as RGB);
    doc.text("TVA non applicable — Article 293 B du CGI", rightX - 70, y + 14);
  } else {
    doc.setFontSize(8.5);
    tx(doc, [200, 210, 220] as RGB);
    doc.text("TVA :",                                       rightX - 70, y + 14);
    tx(doc, C.onPrimary);
    doc.text(euro((totals.ttc ?? 0) - (totals.ht ?? 0)),   rightX - 3,  y + 14, { align: "right" });
  }

  // Total à payer
  const totalLabelY = totals.tva293b ? y + 22 : y + 27;
  doc.setFont(tFont, "bold");
  doc.setFontSize(11);
  tx(doc, C.onPrimary);
  doc.text("Total à payer (TTC) :", rightX - 70, totalLabelY);
  doc.setFontSize(13);
  doc.text(euro(totals.ttc),         rightX - 3,  totalLabelY, { align: "right" });

  return y + boxH + 6;
}

// ─── Conditions ───────────────────────────────────────────────────────────────

function renderConditions(doc: jsPDF, yStart: number, fontsOk: boolean): number {
  const C    = eauperationTheme.colors;
  const bFont = fontsOk ? "Manrope" : "helvetica";
  const conditions = eauperationTheme.conditions ?? [];
  if (conditions.length === 0) return yStart;

  let y = yStart + 4;
  if (y > A4.h - A4.my - 50) { doc.addPage(); y = A4.my; }

  // Estimate block height
  doc.setFontSize(8.5);
  let estimatedH = 8;
  conditions.forEach((c) => {
    const lines = doc.splitTextToSize(c, contentW() - 16) as string[];
    estimatedH += lines.length * 4.5 + 4;
  });
  estimatedH = Math.min(estimatedH, 80);

  // Soft background + red left border
  fx(doc, C.soft);
  doc.roundedRect(A4.mx, y, contentW(), estimatedH, 2, 2, "F");
  fx(doc, C.accent);
  doc.rect(A4.mx, y, 2.5, estimatedH, "F");

  // Title
  doc.setFont(fontsOk ? "Archivo" : "helvetica", "bold");
  doc.setFontSize(8);
  tx(doc, C.primary);
  doc.text("CONDITIONS DE RÈGLEMENT", A4.mx + 6, y + 6);
  y += 10;

  doc.setFont(bFont, "normal");
  doc.setFontSize(8);

  conditions.forEach((cond) => {
    const wrapped = doc.splitTextToSize(cond, contentW() - 16) as string[];
    if (y + wrapped.length * 4.5 + 4 > A4.h - A4.my - 25) {
      doc.addPage();
      y = A4.my;
    }
    // Red bullet
    fx(doc, C.accent);
    doc.circle(A4.mx + 7, y + 1.5, 0.8, "F");
    tx(doc, C.ink);
    wrapped.forEach((l, i) => {
      doc.text(l, A4.mx + 10, y + i * 4.5);
    });
    y += wrapped.length * 4.5 + 4;
  });

  return y + 4;
}

// ─── Signature ────────────────────────────────────────────────────────────────

async function renderSignature(
  doc: jsPDF,
  params: EauperationDevisParams,
  yStart: number,
  fontsOk: boolean
): Promise<number> {
  const C    = eauperationTheme.colors;
  const bFont = fontsOk ? "Manrope" : "helvetica";
  let y = yStart + 6;

  if (y > A4.h - A4.my - 55) { doc.addPage(); y = A4.my; }

  if (params.signatureData) {
    try {
      const sImg = await loadImg(params.signatureData);
      const sh = 20;
      const sw = (sImg.width / sImg.height) * sh;
      doc.addImage(sImg, "PNG", A4.mx, y, sw, sh);
      y += sh + 5;
    } catch { /* skip */ }
  }

  doc.setFont(bFont, "normal");
  doc.setFontSize(8.5);
  tx(doc, C.muted);
  if (params.signedBy)  { doc.text(`Signé par : ${params.signedBy}`, A4.mx, y); y += 4.5; }
  if (params.signedAt)  { doc.text(`Le : ${params.signedAt}`,         A4.mx, y); y += 4.5; }

  return y;
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function renderFooter(doc: jsPDF, ci: UserSettings | undefined, fontsOk: boolean): void {
  const C       = eauperationTheme.colors;
  const bFont   = fontsOk ? "Manrope" : "helvetica";
  const footerH = 10;
  const footerY = A4.h - footerH - 2;

  // NavyDeep bar
  fx(doc, C.primaryDeep);
  doc.rect(A4.mx, footerY, contentW(), footerH, "F");

  // Cyan top border
  fx(doc, C.accent2);
  doc.rect(A4.mx, footerY, contentW(), 0.6, "F");

  const parts: string[] = [];
  if (ci?.company_name) parts.push(ci.company_name);
  if (ci?.address || ci?.city) {
    parts.push(
      [`${ci?.address ?? ""}`, `${ci?.postal_code ?? ""} ${ci?.city ?? ""}`]
        .filter(Boolean)
        .map((s) => s.trim())
        .join(", ")
    );
  }
  if (ci?.siret) parts.push(`SIRET ${ci.siret.replace(/(\d{3})(?=\d)/g, "$1 ").trim()}`);
  if (ci?.email) parts.push(ci.email);

  doc.setFont(bFont, "normal");
  doc.setFontSize(7);
  tx(doc, [220, 230, 240] as RGB);
  doc.text(parts.join("  ·  "), A4.w / 2, footerY + 6, { align: "center" });
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function contentW(): number { return A4.w - 2 * A4.mx; }
