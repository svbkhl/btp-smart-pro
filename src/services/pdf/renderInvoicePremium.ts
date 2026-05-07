/**
 * Renderer "Premium" v3 — successeur de renderInvoiceEditorial.
 *
 * Ajouts par rapport au v2 :
 *  - Polices custom Inter (texte) + JetBrains Mono (chiffres) chargées via
 *    pdfFonts.ts. Fallback silencieux helvetica/courier si fetch échoue.
 *  - Tous les chiffres en mono (numéro facture, montants, SIRET) →
 *    aspect "document officiel" type Stripe / Pennylane.
 *  - Pagination "Page X / Y" sur toutes les pages.
 *  - Bloc note libre (description "\nNote: ...") rendu séparément.
 *  - Bloc signature pour devis (rectangle "Bon pour accord").
 *  - Footer avec filet sur toutes les pages.
 *
 * Cette version est une drop-in replacement de renderInvoiceEditorial —
 * même signature, même comportement extérieur. Le swap se fait au niveau
 * des dispatchers (invoicePdfService.ts, pdfService.ts).
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
import { ensurePdfFonts, pdfFontFamily, type PdfFontFamily } from "./pdfFonts";

type DocMode = "facture" | "devis";

export interface RenderInvoicePremiumParams {
  invoice: Invoice;
  companyInfo?: UserSettings;
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

function formatSiret(siret: string): string {
  const clean = siret.replace(/\s/g, "");
  if (clean.length !== 14) return siret;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
}

function setColor(doc: jsPDF, color: RGB): void {
  doc.setTextColor(color[0], color[1], color[2]);
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

export async function renderInvoicePremium(
  doc: jsPDF,
  params: RenderInvoicePremiumParams
): Promise<void> {
  const { invoice, companyInfo, clientRow } = params;
  const mode: DocMode = params.mode ?? "facture";

  // Polices custom Inter + JetBrainsMono — fallback silencieux si réseau down
  const { available } = await ensurePdfFonts(doc);
  const font: PdfFontFamily = pdfFontFamily(available);

  const accent = resolveAccent(companyInfo?.brand_color);
  const pageW = PDF_PAGE.widthMm;
  const pageH = PDF_PAGE.heightMm;
  const mx = PDF_PAGE.marginXMm;
  const my = PDF_PAGE.marginYMm;
  const contentW = pageW - 2 * mx;
  const rightX = pageW - mx;

  // ========================================================================
  // EN-TÊTE
  // ========================================================================
  let y = my;

  const logoUrl = companyInfo?.company_logo_url || companyInfo?.logo_url;
  let logoOk = false;
  if (logoUrl) {
    try {
      const trimmed = logoUrl.trim();
      if (trimmed.startsWith("http") || trimmed.startsWith("data:image")) {
        const img = await loadImage(trimmed);
        const targetH = 14;
        const ratio = img.width / Math.max(img.height, 1);
        const targetW = Math.min(50, Math.max(20, targetH * ratio));
        const fmt =
          trimmed.startsWith("data:image/jpeg") || /\.jpe?g(\?|$)/i.test(trimmed) ? "JPEG" : "PNG";
        doc.addImage(img, fmt, mx, y, targetW, targetH);
        logoOk = true;
      }
    } catch {
      // fallback typo
    }
  }

  if (!logoOk) {
    doc.setFont(font.sans, "bold");
    doc.setFontSize(PDF_FONT_SIZE.lg);
    setColor(doc, PDF_COLORS.ink);
    doc.text(companyInfo?.company_name || "Votre Entreprise", mx, y + 8);
  }

  // Label DEVIS / FACTURE — uppercase tracked, droite
  doc.setFont(font.sans, "bold");
  doc.setFontSize(PDF_FONT_SIZE.xs);
  setColor(doc, PDF_COLORS.label);
  const label = mode === "devis" ? "DEVIS" : "FACTURE";
  const labelText = label.split("").join(" ");
  doc.text(labelText, rightX, y + 4, { align: "right" });

  if (logoOk && companyInfo?.company_name) {
    doc.setFont(font.sans, "normal");
    doc.setFontSize(PDF_FONT_SIZE.sm);
    setColor(doc, PDF_COLORS.muted);
    doc.text(companyInfo.company_name, mx, y + 18);
  }

  y += 24;

  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(mx, y, rightX, y);
  y += 8;

  // ========================================================================
  // BLOC ÉMETTEUR / DESTINATAIRE
  // ========================================================================
  const colWidth = (contentW - 10) / 2;
  const col1X = mx;
  const col2X = mx + colWidth + 10;

  doc.setFont(font.sans, "bold");
  doc.setFontSize(PDF_FONT_SIZE.xs);
  setColor(doc, PDF_COLORS.label);
  doc.text("ÉMETTEUR", col1X, y);
  doc.text("DESTINATAIRE", col2X, y);

  // Émetteur
  doc.setFont(font.sans, "bold");
  doc.setFontSize(PDF_FONT_SIZE.base);
  setColor(doc, PDF_COLORS.ink);
  let leftY = y + 6;
  doc.text(companyInfo?.company_name || "Votre Entreprise", col1X, leftY);
  leftY += 5;

  doc.setFont(font.sans, "normal");
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
    doc.setFont(font.mono, "normal");
    doc.text(`SIRET ${formatSiret(companyInfo.siret)}`, col1X, leftY);
    doc.setFont(font.sans, "normal");
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

  // Destinataire — formatClientBlock (dédup civilité)
  const clientLines = formatClientBlock(
    clientRowToBlockInput({
      name: clientRow?.name ?? invoice.client_name ?? null,
      titre: clientRow?.titre ?? null,
      prenom: clientRow?.prenom ?? null,
    })
  );
  let rightY = y + 6;
  doc.setFont(font.sans, "bold");
  doc.setFontSize(PDF_FONT_SIZE.base);
  setColor(doc, PDF_COLORS.ink);
  if (clientLines[0]) {
    doc.text(clientLines[0], col2X, rightY);
    rightY += 5;
  }
  doc.setFont(font.sans, "normal");
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

  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(mx, y, rightX, y);
  y += 8;

  // ========================================================================
  // META — N° en mono accent
  // ========================================================================
  doc.setFont(font.mono, "bold");
  doc.setFontSize(PDF_FONT_SIZE.lg);
  setColor(doc, accent);
  doc.text(`N° ${invoice.invoice_number || ""}`, mx, y);
  y += 6;

  doc.setFont(font.sans, "normal");
  doc.setFontSize(PDF_FONT_SIZE.sm);
  setColor(doc, PDF_COLORS.muted);
  const issueDate = formatDate(invoice.created_at);
  const dueDate = invoice.due_date ? formatDate(invoice.due_date) : "";
  const serviceDate = invoice.service_date ? formatDate(invoice.service_date) : "";
  const dateLabel = mode === "devis" ? "Émis le" : "Émise le";
  let metaLine = `${dateLabel} ${issueDate}`;
  if (mode === "devis") {
    const validUntil = new Date(invoice.created_at);
    validUntil.setDate(validUntil.getDate() + 30);
    metaLine += ` · Valable jusqu'au ${formatDate(validUntil)} (30 jours)`;
  } else {
    if (dueDate) metaLine += ` · Échéance ${dueDate}`;
    if (serviceDate) metaLine += ` · Prestation le ${serviceDate}`;
  }
  doc.text(metaLine, mx, y);
  y += 10;

  // Description (sans la note)
  const descCore = stripInvoiceNote(invoice.description);
  if (descCore) {
    doc.setFont(font.sans, "normal");
    doc.setFontSize(PDF_FONT_SIZE.sm);
    setColor(doc, PDF_COLORS.ink);
    const wrapped = doc.splitTextToSize(descCore, contentW) as string[];
    wrapped.forEach((line) => {
      if (y > pageH - 80) {
        doc.addPage();
        y = my;
      }
      doc.text(line, mx, y);
      y += 4;
    });
    y += 4;
  }

  // ========================================================================
  // TABLEAU PRESTATIONS — chiffres en mono
  // ========================================================================
  const lines = invoice.service_lines ?? [];
  if (lines.length > 0) {
    doc.setFont(font.sans, "bold");
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

      const designation = line.description || "";
      doc.setFont(font.sans, "normal");
      doc.setFontSize(PDF_FONT_SIZE.sm);
      setColor(doc, PDF_COLORS.ink);
      const wrapped = doc.splitTextToSize(designation, contentW * 0.55) as string[];
      const startY = y;
      wrapped.forEach((tline, idx) => {
        doc.text(tline, mx, startY + idx * 4);
      });
      const rowH = Math.max(4, wrapped.length * 4);

      doc.setFont(font.mono, "normal");
      doc.text(String(qty), mx + contentW * 0.6, startY, { align: "right" });
      doc.text(formatCurrency(unit), mx + contentW * 0.78, startY, { align: "right" });
      doc.text(formatCurrency(total), rightX, startY, { align: "right" });
      doc.setFont(font.sans, "normal");
      y = startY + rowH + 2;
    }

    setDraw(doc, PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(mx, y, rightX, y);
    y += 6;

    // Totaux
    const totalHt = invoice.total_ht ?? invoice.amount_ht ?? calculatedHt;
    const vatRateSnapshot = invoice.vat_rate_snapshot ?? null;
    const tva = invoice.tva ?? invoice.vat_amount ?? 0;
    const totalTtc = invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? totalHt;
    const hasVat = (tva ?? 0) > 0;
    const vatPercent = vatRateSnapshot != null
      ? Math.round(vatRateSnapshot * 1000) / 10
      : invoice.vat_rate ?? (totalHt > 0 ? Math.round((tva / totalHt) * 1000) / 10 : 0);

    const labelX = mx + contentW * 0.6;
    if (hasVat) {
      doc.setFont(font.sans, "normal");
      doc.setFontSize(PDF_FONT_SIZE.sm);
      setColor(doc, PDF_COLORS.muted);
      doc.text("Sous-total HT", labelX, y, { align: "right" });
      doc.setFont(font.mono, "normal");
      setColor(doc, PDF_COLORS.ink);
      doc.text(formatCurrency(totalHt), rightX, y, { align: "right" });
      y += 5;
      doc.setFont(font.sans, "normal");
      setColor(doc, PDF_COLORS.muted);
      doc.text(`TVA (${vatPercent}%)`, labelX, y, { align: "right" });
      doc.setFont(font.mono, "normal");
      setColor(doc, PDF_COLORS.ink);
      doc.text(formatCurrency(tva), rightX, y, { align: "right" });
      y += 5;
    }

    setDraw(doc, accent);
    doc.setLineWidth(0.5);
    doc.line(labelX - 5, y, rightX, y);
    y += 6;

    doc.setFont(font.sans, "bold");
    doc.setFontSize(PDF_FONT_SIZE.md);
    setColor(doc, PDF_COLORS.ink);
    doc.text(hasVat ? "TOTAL TTC" : "TOTAL", labelX, y, { align: "right" });
    doc.setFont(font.mono, "bold");
    doc.setFontSize(PDF_FONT_SIZE.xl);
    setColor(doc, accent);
    doc.text(formatCurrency(totalTtc), rightX, y + 1, { align: "right" });
    y += 14;
  }

  // ========================================================================
  // BLOC NOTE LIBRE
  // ========================================================================
  const note = extractInvoiceNote(invoice.description);
  if (note) {
    if (y > pageH - 60) {
      doc.addPage();
      y = my;
    }
    doc.setFont(font.sans, "bold");
    doc.setFontSize(PDF_FONT_SIZE.xs);
    setColor(doc, PDF_COLORS.label);
    doc.text("NOTE", mx, y);
    y += 5;

    doc.setFont(font.sans, "normal");
    doc.setFontSize(PDF_FONT_SIZE.sm);
    setColor(doc, PDF_COLORS.ink);
    const wrapped = doc.splitTextToSize(note, contentW) as string[];
    wrapped.forEach((line) => {
      if (y > pageH - 40) {
        doc.addPage();
        y = my;
      }
      doc.text(line, mx, y);
      y += 4;
    });
    y += 4;
  }

  // ========================================================================
  // SIGNATURE (devis) + MENTIONS LÉGALES
  // ========================================================================
  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(mx, y, rightX, y);
  y += 6;

  if (mode === "devis") {
    if (y > pageH - 60) {
      doc.addPage();
      y = my;
    }
    doc.setFont(font.sans, "bold");
    doc.setFontSize(PDF_FONT_SIZE.xs);
    setColor(doc, PDF_COLORS.label);
    doc.text("BON POUR ACCORD", mx, y);
    y += 4;
    doc.setFont(font.sans, "normal");
    doc.setFontSize(PDF_FONT_SIZE.xs);
    setColor(doc, PDF_COLORS.muted);
    doc.text("Date et signature précédée de la mention « Lu et approuvé, bon pour accord »", mx, y);
    y += 6;
    setDraw(doc, PDF_COLORS.line);
    doc.setLineWidth(0.3);
    doc.rect(mx, y, 80, 25);
    y += 30;
  }

  const mention = invoice.vat_legal_mention ?? resolveVatLegalMention(invoice.vat_regime ?? null);

  doc.setFont(font.sans, "italic");
  doc.setFontSize(PDF_FONT_SIZE.xs);
  setColor(doc, PDF_COLORS.muted);

  const legalLines: string[] = [];
  if (mode === "facture") {
    legalLines.push("Pénalités de retard : 3 fois le taux d'intérêt légal en vigueur.");
    legalLines.push("Indemnité forfaitaire de recouvrement : 40 €.");
    if (mention) legalLines.push(mention);
  } else {
    legalLines.push("Devis gratuit et sans engagement. Valable 30 jours.");
    if (mention) legalLines.push(mention);
  }

  legalLines.forEach((l) => {
    if (y > pageH - 25) {
      doc.addPage();
      y = my;
    }
    doc.text(l, mx, y);
    y += 4;
  });

  // ========================================================================
  // FOOTER + PAGINATION sur toutes les pages
  // ========================================================================
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  const footerParts: string[] = [];
  if (companyInfo?.company_name) footerParts.push(companyInfo.company_name);
  if (companyInfo?.legal_form) footerParts.push(companyInfo.legal_form);
  if (companyInfo?.capital_social) footerParts.push(`Capital ${formatCurrency(companyInfo.capital_social)}`);
  if (companyInfo?.siret) footerParts.push(`SIRET ${formatSiret(companyInfo.siret)}`);
  if (companyInfo?.ape_code) footerParts.push(`APE ${companyInfo.ape_code}`);
  if (companyInfo?.vat_number) footerParts.push(`TVA ${companyInfo.vat_number}`);

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageH - my + 4;

    setDraw(doc, PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(mx, footerY - 4, rightX, footerY - 4);

    if (footerParts.length > 0) {
      doc.setFont(font.sans, "normal");
      doc.setFontSize(PDF_FONT_SIZE.xs);
      setColor(doc, PDF_COLORS.muted);
      const footerText = footerParts.join(" · ");
      const wrapped = doc.splitTextToSize(footerText, contentW - 30) as string[];
      wrapped.forEach((line, idx) => {
        doc.text(line, pageW / 2, footerY + idx * 3.5, { align: "center" });
      });
    }

    doc.setFont(font.mono, "normal");
    doc.setFontSize(PDF_FONT_SIZE.xs);
    setColor(doc, PDF_COLORS.muted);
    doc.text(`Page ${p} / ${totalPages}`, rightX, footerY + 7, { align: "right" });
  }
}
