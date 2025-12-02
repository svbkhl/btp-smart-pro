import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Types pour les données du devis
interface QuoteResult {
  estimatedCost?: number;
  workSteps?: Array<{ step: string; description: string; cost: number }>;
  materials?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  description?: string;
  quote_number?: string;
  format?: string;
  [key: string]: any;
}

interface CompanyInfo {
  companyName?: string;
  legalForm?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  siret?: string;
  vatNumber?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  [key: string]: any;
}

interface ClientInfo {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
}

interface DownloadQuotePDFParams {
  result: QuoteResult;
  companyInfo: CompanyInfo;
  clientInfo: ClientInfo;
  surface?: string;
  workType?: string;
  region?: string;
  quoteDate: Date;
  quoteNumber?: string;
  signatureData?: string;
  signedBy?: string;
  signedAt?: string;
  quoteFormat?: string;
}

/**
 * Nettoie le texte HTML/Markdown pour l'affichage dans le PDF
 */
function cleanText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '') // Supprime **bold**
    .replace(/#{1,6}\s/g, '') // Supprime les titres markdown
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Supprime les liens markdown
    .replace(/\n{3,}/g, '\n\n') // Réduit les sauts de ligne multiples
    .trim();
}

/**
 * Formate un montant en euros pour le PDF (format professionnel sans espaces ni caractères spéciaux)
 */
function formatCurrency(amount: number | undefined): string {
  if (!amount && amount !== 0) return '0,00€';
  // S'assurer que c'est un nombre valide
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0,00€';
  
  // Formater manuellement pour un format professionnel : 1234,56€ (sans espaces)
  const fixed = numAmount.toFixed(2);
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00';
  
  // Ajouter les séparateurs de milliers (espaces) mais seulement pour les grands nombres
  // Format français : 1 234,56€ (avec espace pour les milliers, virgule pour les décimales)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return `${formattedInteger},${decimalPart}€`;
}

/**
 * Formate une date en français
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Génère et télécharge un PDF de devis professionnel
 */
export async function downloadQuotePDF(params: DownloadQuotePDFParams): Promise<void> {
  try {
    console.log('[PDF Service] Début de la génération du PDF');

    const {
      result,
      companyInfo,
      clientInfo,
      surface,
      workType,
      region,
      quoteDate,
      quoteNumber,
      signatureData,
      signedBy,
      signedAt,
      quoteFormat,
    } = params;

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

    // Logo (si disponible) - gérer les deux formats de noms de champs
    const logoUrl = companyInfo.logoUrl || companyInfo.company_logo_url;
    if (logoUrl) {
      try {
        const logoImg = await loadImage(logoUrl);
        const logoSize = 30;
        doc.addImage(logoImg, 'PNG', margin + 5, yPosition + 5, logoSize, logoSize);
      } catch (error) {
        console.warn('[PDF Service] Impossible de charger le logo:', error);
      }
    }

    // Nom de l'entreprise - gérer les deux formats de noms de champs
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const companyName = companyInfo.companyName || companyInfo.company_name || 'Votre Entreprise';
    doc.text(companyName, margin + (logoUrl ? 40 : 5), yPosition + 15);

    // Forme juridique - gérer les deux formats de noms de champs
    const legalForm = companyInfo.legalForm || companyInfo.legal_form;
    if (legalForm) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(legalForm, margin + (logoUrl ? 40 : 5), yPosition + 22);
    }

    // Titre "DEVIS" à droite
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const devisText = 'DEVIS';
    const devisWidth = doc.getTextWidth(devisText);
    doc.text(devisText, pageWidth - margin - devisWidth, yPosition + 20);

    yPosition += 45;

    // ============================================
    // INFORMATIONS ENTREPRISE
    // ============================================
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const companyDetails: string[] = [];
    
    // Adresse complète (gérer les deux formats de noms de champs)
    const address = companyInfo.address;
    const postalCode = companyInfo.postalCode || companyInfo.postal_code;
    const city = companyInfo.city;
    const country = companyInfo.country || 'France';
    
    if (address) {
      companyDetails.push(address);
    }
    if (postalCode && city) {
      const cityLine = country && country !== 'France' 
        ? `${postalCode} ${city}, ${country}`
        : `${postalCode} ${city}`;
      companyDetails.push(cityLine);
    } else if (city) {
      companyDetails.push(city);
    }
    
    // Ligne vide pour séparer
    if (companyDetails.length > 0) {
      companyDetails.push('');
    }
    
    // Informations légales (gérer les deux formats)
    const siret = companyInfo.siret;
    const vatNumber = companyInfo.vatNumber || companyInfo.vat_number;
    
    if (siret) {
      companyDetails.push(`SIRET: ${siret}`);
    }
    if (vatNumber) {
      companyDetails.push(`TVA intracommunautaire: ${vatNumber}`);
    }
    
    // Ligne vide pour séparer
    if (siret || vatNumber) {
      companyDetails.push('');
    }
    
    // Coordonnées (gérer les deux formats)
    const phone = companyInfo.phone;
    const email = companyInfo.email;
    
    if (phone) {
      companyDetails.push(`Téléphone: ${phone}`);
    }
    if (email) {
      companyDetails.push(`Email: ${email}`);
    }

    let companyY = yPosition;
    companyDetails.forEach((detail) => {
      if (detail.trim() !== '') {
        doc.text(detail, margin, companyY);
      }
      companyY += 5;
    });

    // Numéro de devis et date à droite
    const rightX = pageWidth - margin;
    if (quoteNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(`N° ${quoteNumber}`, rightX, yPosition, { align: 'right' });
      yPosition += 6;
    }
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${formatDate(quoteDate)}`, rightX, yPosition, { align: 'right' });
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
    doc.text(clientInfo.name, margin + 5, yPosition + 14);
    if (clientInfo.location) {
      doc.text(clientInfo.location, margin + 5, yPosition + 20);
    }
    if (clientInfo.email) {
      doc.text(`Email: ${clientInfo.email}`, margin + 5, yPosition + 26);
    }
    if (clientInfo.phone) {
      doc.text(`Tél: ${clientInfo.phone}`, margin + 120, yPosition + 26);
    }

    yPosition += 35;

    // Détails des travaux supprimés - déjà dans le tableau des prestations

    // Description supprimée - la phrase standard sera dans le tableau des prestations

    // ============================================
    // TABLEAU DES PRESTATIONS
    // ============================================
    if (result.workSteps && result.workSteps.length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Prestations:', margin, yPosition);
      yPosition += 7;

      // En-tête du tableau
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPosition, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Étape', margin + 2, yPosition + 5.5);
      doc.text('Description', margin + 40, yPosition + 5.5);
      doc.text('Montant HT', rightX, yPosition + 5.5, { align: 'right' });
      yPosition += 8;

      // Lignes du tableau
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      let totalHT = 0;

      result.workSteps.forEach((step, index) => {
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
        }

        // Calculer la hauteur nécessaire pour cette ligne
        const descLines = doc.splitTextToSize(step.description || step.step || '', 100) as string[];
        const lineHeight = descLines.length * 4 + 4;

        // Alternance de couleurs
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPosition - 2, contentWidth, lineHeight, 'F');
        }

        doc.setFontSize(9);
        doc.text(String(index + 1), margin + 2, yPosition + 4);
        
        // Afficher toutes les lignes de description
        let descY = yPosition + 4;
        descLines.forEach((line: string) => {
          doc.text(line, margin + 10, descY);
          descY += 4;
        });
        
        const cost = step.cost || 0;
        totalHT += cost;
        doc.text(formatCurrency(cost), rightX, yPosition + 4, { align: 'right' });
        yPosition += lineHeight;
      });

      // Total HT
      yPosition += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, rightX, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const totalHTRounded = Math.round(totalHT * 100) / 100;
      doc.text('Total HT:', rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(totalHTRounded), rightX, yPosition, { align: 'right' });
      yPosition += 6;

      // TVA (20%)
      const tva = Math.round(totalHTRounded * 0.2 * 100) / 100;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('TVA (20%):', rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(tva), rightX, yPosition, { align: 'right' });
      yPosition += 6;

      // Total TTC
      const totalTTC = Math.round((totalHTRounded + tva) * 100) / 100;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, yPosition, rightX, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Total TTC:', rightX - 30, yPosition, { align: 'right' });
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(totalTTC), rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 10;
    } else if (result.estimatedCost) {
      // Si pas de tableau détaillé, afficher juste le montant estimé
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Montant estimé:', rightX - 30, yPosition, { align: 'right' });
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(result.estimatedCost), rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 10;
    }

    // ============================================
    // SIGNATURE
    // ============================================
    if (signatureData || signedBy) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (signatureData) {
        try {
          const signatureImg = await loadImage(signatureData);
          const signatureHeight = 20;
          const signatureWidth = (signatureImg.width / signatureImg.height) * signatureHeight;
          doc.addImage(signatureImg, 'PNG', margin, yPosition, signatureWidth, signatureHeight);
          yPosition += signatureHeight + 5;
        } catch (error) {
          console.warn('[PDF Service] Impossible de charger la signature:', error);
        }
      }

      if (signedBy) {
        doc.text(`Signé par: ${signedBy}`, margin, yPosition);
        yPosition += 5;
      }
      if (signedAt) {
        doc.text(`Le: ${signedAt}`, margin, yPosition);
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
      'Ce devis est valable 30 jours à compter de la date d\'émission.',
      'Les prix sont exprimés en euros, toutes taxes comprises.',
      'Les travaux débuteront après acceptation du devis et versement d\'un acompte si demandé.',
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
    const fileName = quoteNumber
      ? `Devis-${quoteNumber}.pdf`
      : `Devis-${formatDate(quoteDate).replace(/\s/g, '-')}.pdf`;

    doc.save(fileName);
    console.log('[PDF Service] PDF généré avec succès:', fileName);
  } catch (error) {
    console.error('[PDF Service] Erreur lors de la génération du PDF:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Impossible de générer le PDF. Veuillez réessayer.'
    );
  }
}

/**
 * Génère un PDF de devis et le retourne en base64 pour l'email
 */
export async function generateQuotePDFBase64(params: DownloadQuotePDFParams): Promise<{
  base64: string;
  filename: string;
}> {
  try {
    console.log('[PDF Service] Début de la génération du PDF en base64');

    const {
      result,
      companyInfo,
      clientInfo,
      surface,
      workType,
      region,
      quoteDate,
      quoteNumber,
      signatureData,
      signedBy,
      signedAt,
      quoteFormat,
    } = params;

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

    // Logo (si disponible) - gérer les deux formats de noms de champs
    const logoUrl = companyInfo.logoUrl || companyInfo.company_logo_url;
    if (logoUrl) {
      try {
        const logoImg = await loadImage(logoUrl);
        const logoSize = 30;
        doc.addImage(logoImg, 'PNG', margin + 5, yPosition + 5, logoSize, logoSize);
      } catch (error) {
        console.warn('[PDF Service] Impossible de charger le logo:', error);
      }
    }

    // Nom de l'entreprise - gérer les deux formats de noms de champs
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const companyName = companyInfo.companyName || companyInfo.company_name || 'Votre Entreprise';
    doc.text(companyName, margin + (logoUrl ? 40 : 5), yPosition + 15);

    // Forme juridique - gérer les deux formats de noms de champs
    const legalForm = companyInfo.legalForm || companyInfo.legal_form;
    if (legalForm) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(legalForm, margin + (logoUrl ? 40 : 5), yPosition + 22);
    }

    // Titre "DEVIS" à droite
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const devisText = 'DEVIS';
    const devisWidth = doc.getTextWidth(devisText);
    doc.text(devisText, pageWidth - margin - devisWidth, yPosition + 20);

    yPosition += 50;

    // ============================================
    // INFORMATIONS CLIENT
    // ============================================
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Client :', margin, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (clientInfo.name) doc.text(clientInfo.name, margin, yPosition);
    yPosition += 5;
    if (clientInfo.location) doc.text(clientInfo.location, margin, yPosition);
    yPosition += 5;
    if (clientInfo.email) doc.text(`Email: ${clientInfo.email}`, margin, yPosition);
    yPosition += 5;
    if (clientInfo.phone) doc.text(`Tél: ${clientInfo.phone}`, margin, yPosition);
    yPosition += 10;

    // ============================================
    // INFORMATIONS DEVIS
    // ============================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (quoteNumber) {
      doc.text(`N° de devis: ${quoteNumber}`, pageWidth - margin - 60, yPosition - 20);
    }
    doc.text(`Date: ${formatDate(quoteDate)}`, pageWidth - margin - 60, yPosition - 15);

    if (surface) {
      doc.text(`Surface: ${surface} m²`, pageWidth - margin - 60, yPosition - 10);
    }
    if (workType) {
      doc.text(`Type de travaux: ${workType}`, pageWidth - margin - 60, yPosition - 5);
    }
    if (region) {
      doc.text(`Région: ${region}`, pageWidth - margin - 60, yPosition);
    }

    yPosition += 10;

    // ============================================
    // DESCRIPTION
    // ============================================
    if (result.description) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Description des travaux :', margin, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const descriptionLines = doc.splitTextToSize(cleanText(result.description), contentWidth);
      descriptionLines.forEach((line: string) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // ============================================
    // DÉTAILS DES TRAVAUX
    // ============================================
    if (result.workSteps && result.workSteps.length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Détail des travaux :', margin, yPosition);
      yPosition += 10;

      // En-tête du tableau
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Étape', margin + 2, yPosition);
      doc.text('Description', margin + 40, yPosition);
      doc.text('Prix', pageWidth - margin - 20, yPosition, { align: 'right' });
      yPosition += 8;

      // Lignes du tableau
      doc.setFont('helvetica', 'normal');
      result.workSteps.forEach((step, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin + 8;
        }

        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPosition - 4, contentWidth, 6, 'F');
        }

        doc.setFontSize(9);
        doc.text(`${index + 1}`, margin + 2, yPosition);
        const descLines = doc.splitTextToSize(cleanText(step.description), 100);
        doc.text(descLines[0], margin + 10, yPosition);
        doc.text(
          step.cost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
          pageWidth - margin - 2,
          yPosition,
          { align: 'right' }
        );
        yPosition += Math.max(6, descLines.length * 5);
      });

      yPosition += 5;
    }

    // ============================================
    // MATÉRIAUX
    // ============================================
    if (result.materials && result.materials.length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Matériaux :', margin, yPosition);
      yPosition += 10;

      // En-tête du tableau
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Matériau', margin + 2, yPosition);
      doc.text('Qté', margin + 70, yPosition);
      doc.text('Prix unit.', margin + 85, yPosition);
      doc.text('Total', pageWidth - margin - 20, yPosition, { align: 'right' });
      yPosition += 8;

      // Lignes du tableau
      doc.setFont('helvetica', 'normal');
      result.materials.forEach((material, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin + 8;
        }

        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPosition - 4, contentWidth, 6, 'F');
        }

        doc.setFontSize(9);
        doc.text(cleanText(material.name), margin + 2, yPosition);
        doc.text(material.quantity.toString(), margin + 70, yPosition);
        doc.text(
          formatCurrency(material.unitPrice),
          margin + 85,
          yPosition
        );
        doc.text(
          formatCurrency(material.total),
          pageWidth - margin - 2,
          yPosition,
          { align: 'right' }
        );
        yPosition += 6;
      });

      yPosition += 5;
    }

    // ============================================
    // TOTAL
    // ============================================
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    const totalCost = result.estimatedCost || 0;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Total TTC: ${formatCurrency(totalCost)}`,
      pageWidth - margin - 2,
      yPosition,
      { align: 'right' }
    );
    yPosition += 10;

    // ============================================
    // SIGNATURE
    // ============================================
    if (signatureData || signedBy) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (signatureData) {
        try {
          const signatureImg = await loadImage(signatureData);
          const signatureHeight = 20;
          const signatureWidth = (signatureImg.width / signatureImg.height) * signatureHeight;
          doc.addImage(signatureImg, 'PNG', margin, yPosition, signatureWidth, signatureHeight);
          yPosition += signatureHeight + 5;
        } catch (error) {
          console.warn('[PDF Service] Impossible de charger la signature:', error);
        }
      }

      if (signedBy) {
        doc.text(`Signé par: ${signedBy}`, margin, yPosition);
        yPosition += 5;
      }
      if (signedAt) {
        doc.text(`Le: ${signedAt}`, margin, yPosition);
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
      'Ce devis est valable 30 jours à compter de la date d\'émission.',
      'Les prix sont exprimés en euros, toutes taxes comprises.',
      'Les travaux débuteront après acceptation du devis et versement d\'un acompte si demandé.',
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
    // CONVERSION EN BASE64
    // ============================================
    const base64 = doc.output('datauristring').split(',')[1]; // Retirer le préfixe data:application/pdf;base64,
    const fileName = quoteNumber
      ? `Devis-${quoteNumber}.pdf`
      : `Devis-${formatDate(quoteDate).replace(/\s/g, '-')}.pdf`;

    console.log('[PDF Service] PDF généré en base64 avec succès:', fileName);
    
    return {
      base64,
      filename: fileName,
    };
  } catch (error) {
    console.error('[PDF Service] Erreur lors de la génération du PDF en base64:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Impossible de générer le PDF. Veuillez réessayer.'
    );
  }
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

