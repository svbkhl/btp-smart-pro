import jsPDF from 'jspdf';
import { Invoice } from '@/hooks/useInvoices';
import { UserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/integrations/supabase/client';
import { formatClientBlock, clientRowToBlockInput } from '@/utils/formatClientBlock';
import { renderInvoiceEditorial } from '@/services/pdf/renderInvoiceEditorial';
import { renderEauperation } from '@/services/pdf/renderEauperation';
import { getTheme } from '@/services/pdf/themes';

async function fetchClientRow(invoice: Invoice) {
  if (!invoice.client_id) return undefined;
  const { data } = await supabase
    .from('clients')
    .select('name, titre, prenom, phone, location')
    .eq('id', invoice.client_id)
    .single();
  return data ?? undefined;
}

function shouldUseEditorialV2(companyInfo?: UserSettings): boolean {
  return companyInfo?.invoice_template_version === 'v2-editorial';
}

function pdfVatRatePercent(invoice: Invoice, totalHT: number, totalVAT: number): number {
  if (invoice.vat_rate != null && invoice.vat_rate !== undefined) {
    return Number(invoice.vat_rate);
  }
  if (invoice.vat_rate_snapshot != null && invoice.vat_rate_snapshot !== undefined) {
    return Math.round(Number(invoice.vat_rate_snapshot) * 1000) / 10;
  }
  if (totalHT > 0) {
    return Math.round((totalVAT / totalHT) * 10000) / 100;
  }
  return 0;
}

interface DownloadInvoicePDFParams {
  invoice: Invoice;
  companyInfo?: UserSettings;
}

function formatCurrency(amount: number | undefined): string {
  if (!amount && amount !== 0) return '0,00 €';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0,00 €';
  const fixed = numAmount.toFixed(2);
  const parts = fixed.split('.');
  const formattedInteger = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedInteger},${parts[1] || '00'} €`;
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Génère le document jsPDF d'une facture (design noir/blanc).
 * Utilisé par downloadInvoicePDF et generateInvoicePDFAsBase64.
 */
async function generateInvoicePdfDoc(params: DownloadInvoicePDFParams): Promise<jsPDF> {
  const { invoice, companyInfo } = params;

  // Récupérer les informations complètes du client
  let clientRow: { titre?: string | null; prenom?: string | null; name?: string | null } = {};
  let clientPhone = '';
  let clientAddress = invoice.client_address || '';

  if (invoice.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, titre, prenom, phone, location')
      .eq('id', invoice.client_id)
      .single();

    if (client) {
      clientRow = { titre: client.titre, prenom: client.prenom, name: client.name };
      clientPhone = client.phone || '';
      if (client.location && !clientAddress) {
        clientAddress = client.location;
      }
    }
  }

  const clientBlockInput = clientRowToBlockInput({
    name: clientRow.name ?? invoice.client_name ?? null,
    titre: clientRow.titre ?? null,
    prenom: clientRow.prenom ?? null,
  });
  const clientLines = formatClientBlock(clientBlockInput);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin = 15;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Couleurs noir/blanc
  const primaryColor = [30, 30, 30];
  const textColor = [31, 41, 55];
  const lightGray = [243, 244, 246];

  // ============================================
  // EN-TÊTE
  // ============================================
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPosition, contentWidth, 40, 'F');

  const logoUrl = companyInfo?.company_logo_url || companyInfo?.logo_url;
  let logoLoaded = false;

  if (logoUrl) {
    try {
      const trimmedUrl = logoUrl.trim();
      if (trimmedUrl && (trimmedUrl.startsWith('http') || trimmedUrl.startsWith('data:image'))) {
        const logoImg = await loadImage(trimmedUrl);
        const logoSize = 30;
        const imageFormat = trimmedUrl.startsWith('data:image/jpeg') || trimmedUrl.includes('.jpg') || trimmedUrl.includes('.jpeg')
          ? 'JPEG'
          : 'PNG';
        doc.addImage(logoImg, imageFormat, margin + 5, yPosition + 5, logoSize, logoSize);
        logoLoaded = true;
      }
    } catch (error: any) {
      console.warn('[Invoice PDF] Impossible de charger le logo:', error?.message || error);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const companyName = companyInfo?.company_name || 'Votre Entreprise';
  doc.text(companyName, margin + (logoLoaded ? 40 : 5), yPosition + 15);

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const factureText = 'FACTURE';
  const factureWidth = doc.getTextWidth(factureText);
  doc.text(factureText, pageWidth - margin - factureWidth, yPosition + 20);

  yPosition += 45;

  // ============================================
  // INFORMATIONS ENTREPRISE
  // ============================================
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const companyDetails: string[] = [];
  if (companyInfo?.address) companyDetails.push(companyInfo.address);
  if (companyInfo?.postal_code && companyInfo?.city) {
    const country = companyInfo.country || 'France';
    companyDetails.push(
      country && country !== 'France'
        ? `${companyInfo.postal_code} ${companyInfo.city}, ${country}`
        : `${companyInfo.postal_code} ${companyInfo.city}`
    );
  } else if (companyInfo?.city) {
    companyDetails.push(companyInfo.city);
  }
  if (companyDetails.length > 0) companyDetails.push('');
  if (companyInfo?.phone) companyDetails.push(`Téléphone: ${companyInfo.phone}`);
  if (companyInfo?.email) companyDetails.push(`Email: ${companyInfo.email}`);

  let companyY = yPosition;
  companyDetails.forEach((detail) => {
    if (detail.trim() !== '') doc.text(detail, margin, companyY);
    companyY += 5;
  });

  const rightX = pageWidth - margin;
  if (invoice.invoice_number) {
    doc.setFont('helvetica', 'bold');
    doc.text(`N° ${invoice.invoice_number}`, rightX, yPosition, { align: 'right' });
    yPosition += 6;
  }
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(invoice.created_at)}`, rightX, yPosition, { align: 'right' });
  if (invoice.due_date) {
    yPosition += 6;
    doc.text(`Échéance: ${formatDate(invoice.due_date)}`, rightX, yPosition, { align: 'right' });
  }
  yPosition += 10;

  // ============================================
  // INFORMATIONS CLIENT
  // ============================================
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPosition, contentWidth, 30, 3, 3, 'F');
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPosition, contentWidth, 30, 3, 3, 'D');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Client:', margin + 5, yPosition + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const linesToPrint = clientLines.length > 0 ? clientLines : ['Non spécifié'];
  let clientBlockY = yPosition + 14;
  linesToPrint.slice(0, 2).forEach((line) => {
    doc.text(line, margin + 5, clientBlockY);
    clientBlockY += 6;
  });
  let metaY = Math.max(clientBlockY, yPosition + 20);
  if (clientAddress) {
    doc.text(clientAddress, margin + 5, metaY);
    metaY += 6;
  }
  let contactLine = '';
  if (clientPhone) contactLine += `Tél: ${clientPhone}`;
  if (invoice.client_email) {
    if (contactLine) contactLine += ' - ';
    contactLine += `Email: ${invoice.client_email}`;
  }
  if (contactLine) doc.text(contactLine, margin + 5, metaY);

  yPosition += 35;

  // ============================================
  // DESCRIPTION
  // ============================================
  if (invoice.description) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', margin, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const descriptionLines = doc.splitTextToSize(invoice.description, contentWidth) as string[];
    descriptionLines.forEach((line: string) => {
      if (yPosition > pageHeight - 50) { doc.addPage(); yPosition = margin; }
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // ============================================
  // TABLEAU DES PRESTATIONS
  // ============================================
  if (invoice.service_lines && invoice.service_lines.length > 0) {
    if (yPosition > pageHeight - 80) { doc.addPage(); yPosition = margin; }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Détail des prestations:', margin, yPosition);
    yPosition += 7;

    // En-tête tableau
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', margin + 2, yPosition + 5.5);
    doc.text('Qté', margin + 100, yPosition + 5.5);
    doc.text('Prix unit.', margin + 120, yPosition + 5.5);
    doc.text('Total', rightX, yPosition + 5.5, { align: 'right' });
    yPosition += 8;

    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    let calculatedTotalHT = 0;

    invoice.service_lines.forEach((line, index) => {
      if (yPosition > pageHeight - 30) { doc.addPage(); yPosition = margin; }

      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPosition - 2, contentWidth, 6, 'F');
      }

      doc.setFontSize(9);
      const descLines = doc.splitTextToSize(line.description || '', 80) as string[];
      doc.text(descLines[0] || '', margin + 2, yPosition + 4);
      if (descLines.length > 1) {
        yPosition += 4;
        for (let i = 1; i < descLines.length && yPosition < pageHeight - 30; i++) {
          doc.text(descLines[i] || '', margin + 2, yPosition + 4);
          yPosition += 4;
        }
        yPosition -= 4;
      }
      const quantity = line.quantity || 1;
      const unitPrice = line.unit_price || 0;
      const lineTotal = line.total || (quantity * unitPrice);
      doc.text(String(quantity), margin + 100, yPosition + 4);
      doc.text(formatCurrency(unitPrice), margin + 120, yPosition + 4);
      doc.text(formatCurrency(lineTotal), rightX, yPosition + 4, { align: 'right' });
      calculatedTotalHT += lineTotal;
      yPosition += 6;
    });

    const totalTTC = invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? 0;
    const totalHT = invoice.total_ht ?? invoice.amount_ht ?? calculatedTotalHT ?? (totalTTC && invoice.tva ? totalTTC - invoice.tva : totalTTC);
    const totalVAT = invoice.tva ?? invoice.vat_amount ?? (totalHT > 0 && totalTTC > 0 ? totalTTC - totalHT : 0);
    const vatRate = pdfVatRatePercent(invoice, totalHT, totalVAT);
    const finalHT = totalHT || calculatedTotalHT || 0;
    const finalVAT = totalVAT || (vatRate > 0 ? Math.round((finalHT * (vatRate / 100)) * 100) / 100 : 0);
    const finalTTC = totalTTC || (finalHT + finalVAT);
    const hasVAT = finalVAT > 0 && vatRate > 0;

    yPosition += 2;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(margin, yPosition, rightX, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(hasVAT ? 'Total à payer (TTC):' : 'Total à payer:', rightX - 40, yPosition, { align: 'right' });
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(finalTTC), rightX, yPosition, { align: 'right' });
    yPosition += 8;

    if (hasVAT) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`dont TVA (${vatRate.toFixed(1)}%):`, rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(finalVAT), rightX, yPosition, { align: 'right' });
      yPosition += 5;
      doc.text('Total HT:', rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(finalHT), rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 10;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(invoice.vat_legal_mention || 'TVA non applicable, art. 293 B du CGI.', rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 10;
    }
  } else {
    // Pas de lignes de service — afficher les totaux seuls
    const totalTTC = invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? 0;
    const totalHT = invoice.total_ht ?? invoice.amount_ht ?? (totalTTC && invoice.tva ? totalTTC - invoice.tva : totalTTC);
    const totalVAT = invoice.tva ?? invoice.vat_amount ?? 0;
    const vatRate = pdfVatRatePercent(invoice, totalHT, totalVAT);
    const hasVAT = totalVAT > 0 && vatRate > 0;

    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);

    if (!hasVAT) {
      doc.text('Total à payer:', rightX - 30, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      doc.text(formatCurrency(totalTTC || totalHT), rightX, yPosition, { align: 'right' });
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(invoice.vat_legal_mention || 'TVA non applicable, art. 293 B du CGI.', rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 10;
    } else {
      doc.text('Montant HT:', rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(totalHT), rightX, yPosition, { align: 'right' });
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`TVA (${vatRate.toFixed(1)}%):`, rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(totalVAT), rightX, yPosition, { align: 'right' });
      yPosition += 6;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, yPosition, rightX, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Total TTC:', rightX - 30, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      doc.text(formatCurrency(totalTTC), rightX, yPosition, { align: 'right' });
      yPosition += 10;
    }
  }

  // ============================================
  // SIGNATURE
  // ============================================
  if (invoice.signature_data || invoice.signed_by) {
    if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin; }
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (invoice.signature_data) {
      try {
        const signatureImg = await loadImage(invoice.signature_data);
        const signatureHeight = 20;
        const signatureWidth = (signatureImg.width / signatureImg.height) * signatureHeight;
        doc.addImage(signatureImg, 'PNG', margin, yPosition, signatureWidth, signatureHeight);
        yPosition += signatureHeight + 5;
      } catch (error) {
        console.warn('[Invoice PDF] Impossible de charger la signature:', error);
      }
    }

    if (invoice.signed_by) { doc.text(`Signé par: ${invoice.signed_by}`, margin, yPosition); yPosition += 5; }
    if (invoice.signed_at) { doc.text(`Le: ${formatDate(invoice.signed_at)}`, margin, yPosition); yPosition += 5; }
  }

  // ============================================
  // CONDITIONS GÉNÉRALES
  // ============================================
  if (yPosition > pageHeight - 40) { doc.addPage(); yPosition = margin; }
  yPosition += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const conditions = [
    'Paiement à réception de la facture.',
    "En cas de retard de paiement, des pénalités de 3 fois le taux d'intérêt légal seront appliquées.",
    'Une indemnité forfaitaire de 40€ sera due pour frais de recouvrement en cas de retard.',
  ];
  conditions.forEach((condition) => {
    if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = margin; }
    doc.text(condition, margin, yPosition);
    yPosition += 5;
  });

  // ============================================
  // FOOTER — SIRET / TVA
  // ============================================
  if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = margin; }
  yPosition += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const footerParts: string[] = [];
  if (companyInfo?.legal_form) footerParts.push(companyInfo.legal_form);
  if (companyInfo?.siret) footerParts.push(`SIRET: ${companyInfo.siret}`);
  if (companyInfo?.vat_number) footerParts.push(`TVA intracommunautaire: ${companyInfo.vat_number}`);
  if (footerParts.length > 0) {
    doc.text(footerParts.join(' — '), pageWidth / 2, yPosition, { align: 'center' });
  }

  return doc;
}

export async function downloadInvoicePDF(params: DownloadInvoicePDFParams): Promise<void> {
  try {
    const { invoice, companyInfo } = params;

    // Thème Eau'pération Sanitaire
    const theme = getTheme(companyInfo?.company_id);
    if (theme.id === 'eauperation') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const clientRow = await fetchClientRow(invoice);
      await renderEauperation(doc, { mode: 'facture', invoice, companyInfo, clientRow });
      const fileName = invoice.invoice_number
        ? `Facture-${invoice.invoice_number}.pdf`
        : `Facture-${formatDate(invoice.created_at).replace(/\s/g, '-')}.pdf`;
      doc.save(fileName);
      return;
    }

    if (shouldUseEditorialV2(companyInfo)) {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const clientRow = await fetchClientRow(invoice);
      await renderInvoiceEditorial(doc, { invoice, companyInfo, clientRow, mode: 'facture' });
      const fileName = invoice.invoice_number
        ? `Facture-${invoice.invoice_number}.pdf`
        : `Facture-${formatDate(invoice.created_at).replace(/\s/g, '-')}.pdf`;
      doc.save(fileName);
      return;
    }

    const doc = await generateInvoicePdfDoc(params);
    const fileName = invoice.invoice_number
      ? `Facture-${invoice.invoice_number}.pdf`
      : `Facture-${formatDate(invoice.created_at).replace(/\s/g, '-')}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('[Invoice PDF] Erreur lors de la génération du PDF:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Impossible de générer le PDF. Veuillez réessayer.'
    );
  }
}

export async function generateInvoicePDFAsBase64(params: DownloadInvoicePDFParams): Promise<string> {
  try {
    const { invoice, companyInfo } = params;

    // Thème Eau'pération Sanitaire
    const theme = getTheme(companyInfo?.company_id);
    if (theme.id === 'eauperation') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const clientRow = await fetchClientRow(invoice);
      await renderEauperation(doc, { mode: 'facture', invoice, companyInfo, clientRow });
      return doc.output('dataurlstring').split(',')[1] ?? '';
    }

    if (shouldUseEditorialV2(companyInfo)) {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const clientRow = await fetchClientRow(invoice);
      await renderInvoiceEditorial(doc, { invoice, companyInfo, clientRow, mode: 'facture' });
      return doc.output('dataurlstring').split(',')[1] ?? '';
    }

    const doc = await generateInvoicePdfDoc(params);
    return doc.output('dataurlstring').split(',')[1] ?? '';
  } catch (error) {
    console.error('[Invoice PDF] Erreur lors de la génération du PDF en base64:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Impossible de générer le PDF. Veuillez réessayer.'
    );
  }
}
