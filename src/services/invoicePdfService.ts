import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice } from '@/hooks/useInvoices';
import { UserSettings } from '@/hooks/useUserSettings';
import { calculateFromTTC } from '@/utils/priceCalculations';

interface DownloadInvoicePDFParams {
  invoice: Invoice;
  companyInfo?: UserSettings;
}

/**
 * Formate un montant en euros (format professionnel sans espaces ni caractères spéciaux)
 */
function formatCurrency(amount: number | undefined): string {
  if (!amount && amount !== 0) return '0,00 €';
  // S'assurer que c'est un nombre valide
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0,00 €';
  
  // Formater manuellement pour un format professionnel : 1234,56 € (sans slash)
  const fixed = numAmount.toFixed(2);
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00';
  
  // Ajouter les séparateurs de milliers (espaces) mais seulement pour les grands nombres
  // Format français : 1 234,56 € (avec espace pour les milliers, virgule pour les décimales, pas de slash)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return `${formattedInteger},${decimalPart} €`;
}

/**
 * Formate une date en français
 */
function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Charge une image depuis une URL ou une data URL
 */
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
 * Génère et télécharge un PDF de facture professionnel
 */
export async function downloadInvoicePDF(params: DownloadInvoicePDFParams): Promise<void> {
  try {
    const { invoice, companyInfo } = params;

    // Créer le document PDF en format A4 portrait
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Marges
    const margin = 15;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Couleurs
    const primaryColor = [59, 130, 246]; // Bleu
    const textColor = [31, 41, 55]; // Gris foncé
    const lightGray = [243, 244, 246]; // Gris clair

    // ============================================
    // EN-TÊTE
    // ============================================
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPosition, contentWidth, 40, 'F');

    // Logo (si disponible)
    if (companyInfo?.logo_url) {
      try {
        const logoImg = await loadImage(companyInfo.logo_url);
        const logoSize = 30;
        doc.addImage(logoImg, 'PNG', margin + 5, yPosition + 5, logoSize, logoSize);
      } catch (error) {
        console.warn('[Invoice PDF] Impossible de charger le logo:', error);
      }
    }

    // Nom de l'entreprise
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const companyName = companyInfo?.company_name || 'Votre Entreprise';
    doc.text(companyName, margin + (companyInfo?.logo_url ? 40 : 5), yPosition + 15);

    // Forme juridique
    if (companyInfo?.legal_form) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(companyInfo.legal_form, margin + (companyInfo?.logo_url ? 40 : 5), yPosition + 22);
    }

    // Titre "FACTURE" à droite
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
    
    // Adresse complète
    if (companyInfo?.address) {
      companyDetails.push(companyInfo.address);
    }
    if (companyInfo?.postal_code && companyInfo?.city) {
      const country = companyInfo.country || 'France';
      const cityLine = country && country !== 'France' 
        ? `${companyInfo.postal_code} ${companyInfo.city}, ${country}`
        : `${companyInfo.postal_code} ${companyInfo.city}`;
      companyDetails.push(cityLine);
    } else if (companyInfo?.city) {
      companyDetails.push(companyInfo.city);
    }
    
    // Ligne vide pour séparer
    if (companyDetails.length > 0) {
      companyDetails.push('');
    }
    
    // Informations légales
    if (companyInfo?.siret) {
      companyDetails.push(`SIRET: ${companyInfo.siret}`);
    }
    if (companyInfo?.vat_number) {
      companyDetails.push(`TVA intracommunautaire: ${companyInfo.vat_number}`);
    }
    
    // Ligne vide pour séparer
    if (companyInfo?.siret || companyInfo?.vat_number) {
      companyDetails.push('');
    }
    
    // Coordonnées
    if (companyInfo?.phone) {
      companyDetails.push(`Téléphone: ${companyInfo.phone}`);
    }
    if (companyInfo?.email) {
      companyDetails.push(`Email: ${companyInfo.email}`);
    }

    let companyY = yPosition;
    companyDetails.forEach((detail) => {
      if (detail.trim() !== '') {
        doc.text(detail, margin, companyY);
      }
      companyY += 5;
    });

    // Numéro de facture et date à droite
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
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPosition, contentWidth, 30, 3, 3, 'D');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Client:', margin + 5, yPosition + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(invoice.client_name || 'Non spécifié', margin + 5, yPosition + 14);
    if (invoice.client_address) {
      doc.text(invoice.client_address, margin + 5, yPosition + 20);
    }
    if (invoice.client_email) {
      doc.text(`Email: ${invoice.client_email}`, margin + 5, yPosition + 26);
    }

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
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // ============================================
    // TABLEAU DES PRESTATIONS
    // ============================================
    if (invoice.service_lines && invoice.service_lines.length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Détail des prestations:', margin, yPosition);
      yPosition += 7;

      // En-tête du tableau
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

      // Lignes du tableau
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      let totalHT = 0;

      invoice.service_lines.forEach((line, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }

        // Alternance de couleurs
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPosition - 2, contentWidth, 6, 'F');
        }

        doc.setFontSize(9);
        const descLines = doc.splitTextToSize(line.description, 80) as string[];
        doc.text(descLines[0] || '', margin + 2, yPosition + 4);
        doc.text(String(line.quantity), margin + 100, yPosition + 4);
        doc.text(formatCurrency(line.unit_price), margin + 120, yPosition + 4);
        doc.text(formatCurrency(line.total), rightX, yPosition + 4, { align: 'right' });
        totalHT += line.total;
        yPosition += 6;
      });

      // ⚠️ MODE TTC FIRST : Si amount_ttc existe, partir du TTC
      let finalTTC, finalHT, finalVAT;
      const vat = invoice.vat_rate || 20;
      
      if (invoice.amount_ttc) {
        // Partir du TTC (source de vérité)
        const prices = calculateFromTTC(invoice.amount_ttc, vat);
        finalTTC = prices.total_ttc;
        finalHT = prices.total_ht;
        finalVAT = prices.vat_amount;
      } else {
        // Ancienne logique (compatibilité)
        finalHT = totalHT;
        finalVAT = invoice.vat_amount || (totalHT * vat) / 100;
        finalTTC = finalHT + finalVAT;
      }

      // Total TTC (EN PREMIER, GROS, EN COULEUR)
      yPosition += 2;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, yPosition, rightX, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Total à payer (TTC):', rightX - 40, yPosition, { align: 'right' });
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(finalTTC), rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 8;

      // TVA
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`dont TVA (${vat}%):`, rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(finalVAT), rightX, yPosition, { align: 'right' });
      yPosition += 5;

      // Total HT
      doc.text('Total HT:', rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(finalHT), rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 10;
    } else {
      // Si pas de lignes de service, afficher juste les totaux
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Montant HT:', rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(invoice.amount_ht), rightX, yPosition, { align: 'right' });
      yPosition += 6;

      const vat = invoice.vat_rate || 20;
      const vatAmount = invoice.vat_amount || (invoice.amount_ht * vat) / 100;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`TVA (${vat}%):`, rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(vatAmount), rightX, yPosition, { align: 'right' });
      yPosition += 6;

      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, yPosition, rightX, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Total TTC:', rightX - 30, yPosition, { align: 'right' });
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(invoice.amount_ttc), rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 10;
    }

    // ============================================
    // SIGNATURE
    // ============================================
    if (invoice.signature_data || invoice.signed_by) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

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

      if (invoice.signed_by) {
        doc.text(`Signé par: ${invoice.signed_by}`, margin, yPosition);
        yPosition += 5;
      }
      if (invoice.signed_at) {
        doc.text(`Le: ${formatDate(invoice.signed_at)}`, margin, yPosition);
        yPosition += 5;
      }
    }

    // ============================================
    // CONDITIONS GÉNÉRALES
    // ============================================
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    yPosition += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const conditions = [
      'Paiement à réception de la facture.',
      'En cas de retard de paiement, des pénalités de 3 fois le taux d\'intérêt légal seront appliquées.',
      'Une indemnité forfaitaire de 40€ sera due pour frais de recouvrement en cas de retard.',
    ];
    conditions.forEach((condition) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(condition, margin, yPosition);
      yPosition += 5;
    });

    // ============================================
    // TÉLÉCHARGEMENT
    // ============================================
    const fileName = invoice.invoice_number
      ? `Facture-${invoice.invoice_number}.pdf`
      : `Facture-${formatDate(invoice.created_at).replace(/\s/g, '-')}.pdf`;

    doc.save(fileName);
    console.log('[Invoice PDF] PDF généré avec succès:', fileName);
  } catch (error) {
    console.error('[Invoice PDF] Erreur lors de la génération du PDF:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Impossible de générer le PDF. Veuillez réessayer.'
    );
  }
}




