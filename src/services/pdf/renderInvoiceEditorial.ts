/**
 * Renderer "Éditorial" v2 — rendu PDF facture/devis premium et sobre.
 *
 * Principe :
 *  - pas de bandeau couleur plein
 *  - typographie d'abord (numéro, montants, nom client dominent)
 *  - couleur d'accent (brand_color) utilisée parcimonieusement
 *  - filets fins, marges généreuses
 *
 * Architecture :
 *  - rendInvoiceEditorial(doc, params) — mute un jsPDF déjà créé
 *  - les deux entrées publiques (download + base64) appellent cette fonction
 *    puis font doc.save / doc.output → fini les ~500 lignes dupliquées.
 */

import jsPDF from "jspdf";
import type { Invoice } from "@/hooks/useInvoices";
import type { UserSettings } from "@/hooks/useUserSettings";
import {
  PDF_PAGE,
  PDF_COLORS,
  PDF_FONT_SIZE,
  resolveAccent,
  type RGB,
} from "./pdfTokens";
import { formatClientBlock, clientRowToBlockInput } from "@/utils/formatClientBlock";
import { resolveVatLegalMention } from "@/utils/vatRegime";

type DocMode = "facture" | "devis";

export interface RenderInvoiceEditorialParams {
  invoice: Invoice;
  companyInfo?: UserSettings;
  /** Données client résolues (déjà chargées depuis Supabase). */
  clientRow?: { name?: string | null; titre?: string | null; prenom?: string | null; phone?: string | null; location?: string | null };
  mode?: DocMode;
}

function formatCurrency(amount: number | undefined): string {
  if (!amount && amount !== 0) return "0,00 €";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0,00 €";
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const formattedInt = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formattedInt},${decPart ?? "00"} €`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function setColor(doc: jsPDF, color: RGB): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setFill(doc: jsPDF, color: RGB): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDraw(doc: jsPDF, color: RGB): void {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function extractInvoiceNote(description?: string | null): string {
  if (!description) return "";
  const marker = /\n\s*Note\s*:\s*/i;
  const match = description.match(marker);
  if (!match || match.index == null) return "";
  return description.slice(match.index).replace(/^\s*Note\s*:\s*/i, "").trim();
}

function stripInvoiceNote(description?: string | null): string {
  if (!description) return "";
  return description.replace(/\n\s*Note\s*:[\s\S]*$/i, "").trim();
}

/**
 * Renderer principal.
 * Pure (sauf I/O image et le doc passé en paramètre).
 */
export async function renderInvoiceEditorial(
  doc: jsPDF,
  params: RenderInvoiceEditorialParams
): Promise<void> {
  const { invoice, companyInfo, clientRow } = params;
  const mode: DocMode = params.mode ?? "facture";

  const accent = resolveAccent(companyInfo?.brand_color);
  const pageW = PDF_PAGE.widthMm;
  const pageH = PDF_PAGE.heightMm;
  const mx = PDF_PAGE.marginXMm;
  const my = PDF_PAGE.marginYMm;
  const contentW = pageW - 2 * mx;
  const rightX = pageW - mx;

  // ======================================================================
  // EN-TÊTE — logo gauche / label droite, filet fin pleine largeur
  // ======================================================================
  let y = my;

  // Logo : 14 mm de haut max, ratio préservé
  const logoUrl = companyInfo?.company_logo_url || companyInfo?.logo_url;
  let logoOk = false;
  if (logoUrl) {
    try {
      const trimmed = logoUrl.trim();
      if (trimmed.startsWith("http") || trimmed.startsWith("data:image")) {
        const img = await loadImage(trimmed);
        const targetH = 14; // mm
        const ratio = img.width / Math.max(img.height, 1);
        const targetW = Math.min(50, Math.max(20, targetH * ratio));
        const fmt =
          trimmed.startsWith("data:image/jpeg") || /\.jpe?g(\?|$)/i.test(trimmed) ? "JPEG" : "PNG";
        doc.addImage(img, fmt, mx, y, targetW, targetH);
        logoOk = true;
      }
    } catch {
      // pas de logo → fallback typo
    }
  }

  if (!logoOk) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_FONT_SIZE.lg);
    setColor(doc, PDF_COLORS.ink);
    doc.text(companyInfo?.company_name || "Votre Entreprise", mx, y + 8);
  }

  // Label DEVIS / FACTURE — droite, xs uppercase tracked
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT_SIZE.xs);
  setColor(doc, PDF_COLORS.label);
  const label = mode === "devis" ? "DEVIS" : "FACTURE";
  // Espacement faux-tracking : on insère des espaces fines.
  const labelText = label.split("").join(" ");
  doc.text(labelText, rightX, y + 4, { align: "right" });

  // Sous-label nom entreprise (si logo présent)
  if (logoOk && companyInfo?.company_name) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FONT_SIZE.sm);
    setColor(doc, PDF_COLORS.muted);
    doc.text(companyInfo.company_name, mx, y + 18);
  }

  y += 24;

  // Filet fin pleine largeur
  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(mx, y, rightX, y);
  y += 8;

  // ======================================================================
  // BLOC ÉMETTEUR / DESTINATAIRE — 2 colonnes
  // ======================================================================
  const colWidth = (contentW - 10) / 2;
  const col1X = mx;
  const col2X = mx + colWidth + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT_SIZE.xs);
  setColor(doc, PDF_COLORS.label);
  doc.text("ÉMETTEUR", col1X, y);
  doc.text("DESTINATAIRE", col2X, y);

  // Émetteur
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT_SIZE.base);
  setColor(doc, PDF_COLORS.ink);
  let leftY = y + 6;
  doc.text(companyInfo?.company_name || "Votre Entreprise", col1X, leftY);
  leftY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT_SIZE.sm);
  setColor(doc, PDF_COLORS.ink);
  if (companyInfo?.address) {
    doc.text(companyInfo.address, col1X, leftY);
    leftY += 4;
  }
  if (companyInfo?.postal_code || companyInfo?.city) {
    const cityLine = [companyInfo?.postal_code, companyInfo?.city].filter(Boolean).join(" ");
    if (cityLine) {
      doc.text(cityLine, col1X, leftY);
      leftY += 4;
    }
  }
  if (companyInfo?.siret) {
    doc.text(`SIRET ${companyInfo.siret}`, col1X, leftY);
    leftY += 4;
  }
  if (companyInfo?.phone) {
    doc.text(companyInfo.phone, col1X, leftY);
    leftY += 4;
  }
  if (companyInfo?.email) {
    doc.text(companyInfo.email, col1X, leftY);
    leftY += 4;
  }

  // Destinataire — bloc client centralisé (Bug #2 fix)
  const clientLines = formatClientBlock(
    clientRowToBlockInput({
      name: clientRow?.name ?? invoice.client_name ?? null,
      titre: clientRow?.titre ?? null,
      prenom: clientRow?.prenom ?? null,
    })
  );
  let rightY = y + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT_SIZE.base);
  setColor(doc, PDF_COLORS.ink);
  if (clientLines[0]) {
    doc.text(clientLines[0], col2X, rightY);
    rightY += 5;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT_SIZE.sm);
  setColor(doc, PDF_COLORS.ink);
  if (clientLines[1]) {
    doc.text(clientLines[1], col2X, rightY);
    rightY += 4;
  }
  const clientAddr = invoice.client_address || clientRow?.location;
  if (clientAddr) {
    doc.text(clientAddr, col2X, rightY);
    rightY += 4;
  }
  if (clientRow?.phone) {
    doc.text(clientRow.phone, col2X, rightY);
    rightY += 4;
  }
  if (invoice.client_email) {
    doc.text(invoice.client_email, col2X, rightY);
    rightY += 4;
  }

  y = Math.max(leftY, rightY) + 6;

  // Filet
  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(mx, y, rightX, y);
  y += 8;

  // ======================================================================
  // META — N° facture / dates
  // ======================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT_SIZE.lg);
  setColor(doc, accent);
  const numberLabel = mode === "devis" ? "N° " : "N° ";
  doc.text(`${numberLabel}${invoice.invoice_number || ""}`, mx, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT_SIZE.sm);
  setColor(doc, PDF_COLORS.muted);
  const issueDate = formatDate(invoice.created_at);
  const dueDate = invoice.due_date ? formatDate(invoice.due_date) : "";
  const serviceDate = invoice.service_date ? formatDate(invoice.service_date) : "";
  const dateLabel = mode === "devis" ? "Émis le" : "Émise le";
  let metaLine = `${dateLabel} ${issueDate}`;
  if (dueDate) metaLine += ` · Échéance ${dueDate}`;
  if (serviceDate && mode === "facture") metaLine += ` · Prestation le ${serviceDate}`;
  doc.text(metaLine, mx, y);
  y += 10;

  // ======================================================================
  // TABLEAU PRESTATIONS
  // ======================================================================
  const totalHtFromInvoice = invoice.total_ht ?? invoice.amount_ht ?? 0;
  const mainDescription = stripInvoiceNote(invoice.description);
  const invoiceNote = extractInvoiceNote(invoice.description);
  const fallbackDescription =
    mainDescription || (mode === "facture" ? "Prestation" : "Prestation devis");
  const lines = (invoice.service_lines && invoice.service_lines.length > 0)
    ? invoice.service_lines
    : [
        {
          description: fallbackDescription,
          quantity: 1,
          unit_price: totalHtFromInvoice,
          total: totalHtFromInvoice,
        },
      ];

  // En-tête de tableau
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT_SIZE.xs);
  setColor(doc, PDF_COLORS.label);
  doc.text("DÉSIGNATION", mx, y);
  doc.text("QTÉ", mx + contentW * 0.6, y, { align: "right" });
  doc.text("PU HT", mx + contentW * 0.78, y, { align: "right" });
  doc.text("TOTAL HT", rightX, y, { align: "right" });
  y += 3;
  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(mx, y, rightX, y);
  y += 5;

  let calculatedHt = 0;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT_SIZE.sm);
  setColor(doc, PDF_COLORS.ink);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (y > pageH - 80) {
      doc.addPage();
      y = my;
    }
    const qty = line.quantity || 1;
    const unit = line.unit_price || 0;
    const total = line.total ?? qty * unit;
    calculatedHt += total;

    // Designation (wrap si trop long)
    const designation = line.description || fallbackDescription;
    const wrapped = doc.splitTextToSize(designation, contentW * 0.55) as string[];
    const startY = y;
    wrapped.forEach((t, idx) => {
      doc.text(t, mx, startY + idx * 4);
    });
    const rowH = Math.max(4, wrapped.length * 4);

    doc.text(String(qty), mx + contentW * 0.6, startY, { align: "right" });
    doc.text(formatCurrency(unit), mx + contentW * 0.78, startY, { align: "right" });
    doc.text(formatCurrency(total), rightX, startY, { align: "right" });
    y = startY + rowH + 2;
  }

  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(mx, y, rightX, y);
  y += 6;

  // Totaux : alignés à droite
  const totalHt = totalHtFromInvoice || calculatedHt;
  const vatRateSnapshot = invoice.vat_rate_snapshot ?? null;
  const tva = invoice.tva ?? invoice.vat_amount ?? 0;
  const totalTtc = invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? totalHt;
  const hasVat = (tva ?? 0) > 0;
  const vatPercent = vatRateSnapshot != null
    ? Math.round(vatRateSnapshot * 1000) / 10
    : invoice.vat_rate ?? (totalHt > 0 ? Math.round((tva / totalHt) * 1000) / 10 : 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT_SIZE.sm);
  setColor(doc, PDF_COLORS.muted);

  const labelX = mx + contentW * 0.6;
  if (hasVat) {
    doc.text("Sous-total HT", labelX, y, { align: "right" });
    setColor(doc, PDF_COLORS.ink);
    doc.text(formatCurrency(totalHt), rightX, y, { align: "right" });
    y += 5;
    setColor(doc, PDF_COLORS.muted);
    doc.text(`TVA (${vatPercent}%)`, labelX, y, { align: "right" });
    setColor(doc, PDF_COLORS.ink);
    doc.text(formatCurrency(tva), rightX, y, { align: "right" });
    y += 5;
  }

  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(labelX - 5, y, rightX, y);
  y += 5;

  // TOTAL TTC — gros, accent color
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT_SIZE.md);
  setColor(doc, PDF_COLORS.ink);
  doc.text(hasVat ? "TOTAL TTC" : "TOTAL", labelX, y, { align: "right" });
  doc.setFontSize(PDF_FONT_SIZE.md);
  setColor(doc, accent);
  doc.text(formatCurrency(totalTtc), rightX, y, { align: "right" });
  y += 10;

  if (invoiceNote) {
    if (y > pageH - 45) {
      doc.addPage();
      y = my;
    }
    setDraw(doc, PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(mx, y, rightX, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_FONT_SIZE.sm);
    setColor(doc, PDF_COLORS.ink);
    doc.text("Note :", mx, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FONT_SIZE.sm);
    const noteLines = doc.splitTextToSize(invoiceNote, contentW) as string[];
    noteLines.forEach((line) => {
      if (y > pageH - 20) {
        doc.addPage();
        y = my;
      }
      doc.text(line, mx, y);
      y += 4.5;
    });
    y += 2;
  }

  // ======================================================================
  // MENTIONS LÉGALES + PIED
  // ======================================================================
  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(mx, y, rightX, y);
  y += 6;

  const mention =
    invoice.vat_legal_mention ?? resolveVatLegalMention(invoice.vat_regime ?? null);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(PDF_FONT_SIZE.xs);
  setColor(doc, PDF_COLORS.muted);

  const legalLines: string[] = [];
  if (mention) legalLines.push(mention);

  legalLines.forEach((l) => {
    if (y > pageH - 25) {
      doc.addPage();
      y = my;
    }
    doc.text(l, mx, y);
    y += 4;
  });

  // Footer centré : raison sociale · SIRET · forme · capital · APE
  const footerParts: string[] = [];
  if (companyInfo?.company_name) footerParts.push(companyInfo.company_name);
  if (companyInfo?.legal_form) footerParts.push(companyInfo.legal_form);
  if (companyInfo?.capital_social) footerParts.push(`Capital ${formatCurrency(companyInfo.capital_social)}`);
  if (companyInfo?.siret) footerParts.push(`SIRET ${companyInfo.siret}`);
  if (companyInfo?.ape_code) footerParts.push(`APE ${companyInfo.ape_code}`);
  if (companyInfo?.vat_number) footerParts.push(`TVA ${companyInfo.vat_number}`);

  if (footerParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FONT_SIZE.xs);
    setColor(doc, PDF_COLORS.muted);
    const footerText = footerParts.join(" · ");
    const wrapped = doc.splitTextToSize(footerText, contentW) as string[];
    const footerY = pageH - my + 4;
    wrapped.forEach((line, idx) => {
      doc.text(line, pageW / 2, footerY + idx * 4, { align: "center" });
    });
  }
}
