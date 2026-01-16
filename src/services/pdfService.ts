import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calculateFromTTC } from '@/utils/priceCalculations';

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

interface QuoteLine {
  label: string;
  description?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  unit_price_ht?: number;
  total_ht: number;
  tva_rate: number;
  total_tva: number;
  total_ttc: number;
  section_id?: string | null; // Lien vers section
}

interface QuoteSection {
  id: string;
  title: string;
  position: number;
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
  quoteFormat?: string; // Ancien format (compatibilité)
  mode?: "simple" | "detailed"; // Nouveau format
  tvaRate?: number; // Taux TVA
  tva293b?: boolean; // TVA non applicable 293B
  sections?: QuoteSection[]; // Sections (corps de métier)
  lines?: QuoteLine[]; // Lignes détaillées (mode detailed)
  subtotal_ht?: number; // Total HT
  total_tva?: number; // Total TVA
  total_ttc?: number; // Total TTC
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
    // TABLEAU DES PRESTATIONS / LIGNES
    // ============================================
    
    // Mode détaillé : afficher les sections + lignes quote_lines
    if (quoteMode === "detailed" && lines && lines.length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      // Grouper lignes par section
      const sectionsWithLines: Array<{ section: QuoteSection | null; lines: QuoteLine[] }> = [];
      const linesWithoutSection: QuoteLine[] = [];

      if (sections && sections.length > 0) {
        // Grouper par section
        sections.sort((a, b) => a.position - b.position).forEach((section) => {
          const sectionLines = lines
            .filter((line) => line.section_id === section.id)
            .sort((a, b) => {
              // Trier par position si disponible, sinon par ordre d'apparition
              return 0; // Les lignes sont déjà triées par position dans la requête
            });
          if (sectionLines.length > 0) {
            sectionsWithLines.push({ section, lines: sectionLines });
          }
        });
      }

      // Lignes sans section
      lines.forEach((line) => {
        if (!line.section_id) {
          linesWithoutSection.push(line);
        }
      });

      if (linesWithoutSection.length > 0) {
        sectionsWithLines.push({
          section: { id: "__no_section__", title: "Autres prestations", position: sections?.length || 0 },
          lines: linesWithoutSection,
        });
      }

      // Si pas de sections, créer une section virtuelle avec toutes les lignes
      if (sectionsWithLines.length === 0 && lines.length > 0) {
        sectionsWithLines.push({
          section: null,
          lines: lines,
        });
      }

      let totalHT = 0;
      let totalTVA = 0;
      let totalTTC = 0;

      // Parcourir chaque section
      sectionsWithLines.forEach(({ section, lines: sectionLines }, sectionIndex) => {
        // Titre de section
        if (section) {
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...primaryColor);
          doc.text(`${sectionIndex + 1}. ${section.title}`, margin, yPosition);
          yPosition += 8;
        }

        // En-tête du tableau
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPosition, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Réf', margin + 2, yPosition + 5.5);
        doc.text('Désignation', margin + 15, yPosition + 5.5);
        doc.text('Unité', margin + 80, yPosition + 5.5);
        doc.text('Prix unit. HT', margin + 100, yPosition + 5.5);
        doc.text('Qté', margin + 125, yPosition + 5.5);
        doc.text('Prix HT', margin + 140, yPosition + 5.5);
        if (!tva293b) {
          doc.text('TVA', margin + 160, yPosition + 5.5);
        }
        doc.text('Total TTC', rightX, yPosition + 5.5, { align: 'right' });
        yPosition += 8;

        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');

        sectionLines.forEach((line, lineIndex) => {
          // Numérotation (1.1, 1.2, etc.)
          const lineNumber = section ? `${sectionIndex + 1}.${lineIndex + 1}` : `${lineIndex + 1}`;

          if (yPosition > pageHeight - 50) {
            doc.addPage();
            yPosition = margin;
            // Réafficher l'en-tête
            doc.setFillColor(...primaryColor);
            doc.rect(margin, yPosition, contentWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('Réf', margin + 2, yPosition + 5.5);
            doc.text('Désignation', margin + 15, yPosition + 5.5);
            doc.text('Unité', margin + 80, yPosition + 5.5);
            doc.text('Prix unit. HT', margin + 100, yPosition + 5.5);
            doc.text('Qté', margin + 125, yPosition + 5.5);
            doc.text('Prix HT', margin + 140, yPosition + 5.5);
            if (!tva293b) {
              doc.text('TVA', margin + 160, yPosition + 5.5);
            }
            doc.text('Total TTC', rightX, yPosition + 5.5, { align: 'right' });
            yPosition += 8;
            doc.setTextColor(...textColor);
            doc.setFont('helvetica', 'normal');
          }

          const lineHeight = 6;
          if (lineIndex % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(margin, yPosition - 2, contentWidth, lineHeight, 'F');
          }

          doc.setFontSize(8);
          // Réf (numérotation)
          doc.text(lineNumber, margin + 2, yPosition + 4);
          // Désignation
          const labelText = doc.splitTextToSize(line.label || '', 60)[0];
          doc.text(labelText, margin + 15, yPosition + 4);
          // Unité
          doc.text(line.unit || '-', margin + 80, yPosition + 4);
          // Prix unitaire HT
          doc.text(line.unit_price_ht ? formatCurrency(line.unit_price_ht) : '-', margin + 100, yPosition + 4);
          // Quantité
          doc.text(line.quantity?.toString() || '-', margin + 125, yPosition + 4);
          // Prix HT
          doc.text(formatCurrency(line.total_ht), margin + 140, yPosition + 4);
          // TVA (si pas 293B)
          if (!tva293b) {
            doc.text(`${(line.tva_rate * 100).toFixed(1)}%`, margin + 160, yPosition + 4);
          }
          // Total TTC
          doc.text(formatCurrency(line.total_ttc), rightX, yPosition + 4, { align: 'right' });

          totalHT += line.total_ht;
          totalTVA += line.total_tva;
          totalTTC += line.total_ttc;
          yPosition += lineHeight;
        });

        // Espace entre sections
        yPosition += 3;
      });
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
          // Réafficher l'en-tête
          doc.setFillColor(...primaryColor);
          doc.rect(margin, yPosition, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Libellé', margin + 2, yPosition + 5.5);
          doc.text('Unité', margin + 60, yPosition + 5.5);
          doc.text('Qté', margin + 75, yPosition + 5.5);
          doc.text('Prix unit. HT', margin + 85, yPosition + 5.5);
          doc.text('Total HT', margin + 110, yPosition + 5.5);
          doc.text('TVA', margin + 135, yPosition + 5.5);
          doc.text('Total TTC', rightX, yPosition + 5.5, { align: 'right' });
          yPosition += 8;
          doc.setTextColor(...textColor);
          doc.setFont('helvetica', 'normal');
        }

        const lineHeight = 6;
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPosition - 2, contentWidth, lineHeight, 'F');
        }

        doc.setFontSize(8);
        // Libellé (tronqué si trop long)
        const labelText = doc.splitTextToSize(line.label || '', 50)[0];
        doc.text(labelText, margin + 2, yPosition + 4);
        // Unité
        doc.text(line.unit || '-', margin + 60, yPosition + 4);
        // Quantité
        doc.text(line.quantity?.toString() || '-', margin + 75, yPosition + 4);
        // Prix unitaire HT
        doc.text(line.unit_price_ht ? formatCurrency(line.unit_price_ht) : '-', margin + 85, yPosition + 4);
        // Total HT
        doc.text(formatCurrency(line.total_ht), margin + 110, yPosition + 4);
        // TVA
        doc.text(`${(line.tva_rate * 100).toFixed(1)}%`, margin + 135, yPosition + 4);
        // Total TTC
        doc.text(formatCurrency(line.total_ttc), rightX, yPosition + 4, { align: 'right' });

        totalHT += line.total_ht;
        totalTVA += line.total_tva;
        totalTTC += line.total_ttc;
        yPosition += lineHeight;
      });

      // Totaux
      if (yPosition > pageHeight - margin - 50) {
        doc.addPage();
        yPosition = margin;
      }

      yPosition += 2;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, yPosition, rightX, yPosition);
      yPosition += 5;

      // Utiliser les totaux fournis ou calculés
      const finalSubtotalHT = subtotal_ht ?? totalHT;
      const finalTotalTVA = total_tva ?? totalTVA;
      const finalTotalTTC = total_ttc ?? totalTTC;

      // Total HT
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Total HT:', rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(finalSubtotalHT), rightX, yPosition, { align: 'right' });
      yPosition += 5;

      // TVA (si pas 293B)
      if (!tva293b) {
        doc.text(`TVA (${(effectiveTvaRate * 100).toFixed(2)}%):`, rightX - 30, yPosition, { align: 'right' });
        doc.text(formatCurrency(finalTotalTVA), rightX, yPosition, { align: 'right' });
        yPosition += 5;
      } else {
        // Mention 293B
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('TVA non applicable - Article 293 B du CGI', rightX, yPosition, { align: 'right' });
        yPosition += 5;
      }

      // Total TTC
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('Total à payer (TTC):', rightX - 40, yPosition, { align: 'right' });
      doc.text(formatCurrency(finalTotalTTC), rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 10;
    }
    // Mode simple : afficher workSteps (format existant)
    else if (quoteMode === "simple" && result.workSteps && result.workSteps.length > 0) {
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
      doc.text('Montant TTC', rightX, yPosition + 5.5, { align: 'right' });
      yPosition += 8;

      // Lignes du tableau
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      // ⚠️ MODE TTC FIRST : Les montants stockés sont en TTC
      let totalTTC = 0;

      result.workSteps.forEach((step, index) => {
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
        }

        // Calculer la hauteur nécessaire pour cette ligne
        const descLines = doc.splitTextToSize(step.description || step.step || '', 100) as string[];
        const lineHeight = Math.max(6, descLines.length * 4 + 4);

        // Vérifier si on dépasse la page avant d'ajouter la ligne
        if (yPosition + lineHeight > pageHeight - margin - 30) {
          doc.addPage();
          yPosition = margin;
          // Réafficher l'en-tête du tableau si nécessaire
          doc.setFillColor(...primaryColor);
          doc.rect(margin, yPosition, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Étape', margin + 2, yPosition + 5.5);
          doc.text('Description', margin + 40, yPosition + 5.5);
          doc.text('Montant TTC', rightX, yPosition + 5.5, { align: 'right' });
          yPosition += 8;
          doc.setTextColor(...textColor);
          doc.setFont('helvetica', 'normal');
        }

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
        totalTTC += cost; // Accumulation en TTC
        doc.text(formatCurrency(cost), rightX, yPosition + 4, { align: 'right' });
        yPosition += lineHeight;
      });

      // Vérifier si on a assez de place pour les totaux
      if (yPosition > pageHeight - margin - 50) {
        doc.addPage();
        yPosition = margin;
      }

      // Calculer HT et TVA à partir du TTC
      const prices = calculateFromTTC(totalTTC, tvaRate * 100);
      
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
      doc.text(formatCurrency(prices.total_ttc), rightX, yPosition, { align: 'right' });
      doc.setTextColor(...textColor);
      yPosition += 8;

      // TVA
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`dont TVA (${(tvaRate * 100).toFixed(2)}%):`, rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(prices.vat_amount), rightX, yPosition, { align: 'right' });
      yPosition += 5;

      // Total HT
      doc.text('Total HT:', rightX - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(prices.total_ht), rightX, yPosition, { align: 'right' });
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
 * Génère un PDF de devis et le retourne comme Blob (pour aperçu)
 */
export async function generateQuotePDF(params: DownloadQuotePDFParams): Promise<Blob> {
  try {
    console.log('[PDF Service] Génération du PDF pour aperçu');

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

    // Créer le document PDF
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
    const primaryColor = [59, 130, 246];
    const textColor = [31, 41, 55];
    const lightGray = [243, 244, 246];

    // EN-TÊTE
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPosition, contentWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', margin + 5, yPosition + 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (quoteNumber) {
      doc.text(`N° ${quoteNumber}`, margin + 5, yPosition + 25);
    }
    doc.text(
      `Date: ${quoteDate.toLocaleDateString('fr-FR')}`,
      margin + 5,
      yPosition + 32
    );

    yPosition += 50;

    // INFORMATIONS
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Entreprise:', margin, yPosition);
    doc.text('Client:', pageWidth - margin - 70, yPosition);
    
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.companyName || 'BTP Smart Pro', margin, yPosition);
    doc.text(clientInfo.name, pageWidth - margin - 70, yPosition);
    
    if (clientInfo.email) {
      yPosition += 5;
      doc.text(clientInfo.email, pageWidth - margin - 70, yPosition);
    }

    yPosition += 15;

    // DÉTAILS
    if (workType || surface) {
      doc.setFont('helvetica', 'bold');
      doc.text('Description des travaux:', margin, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      if (workType) doc.text(`Type: ${workType}`, margin, yPosition);
      if (surface) {
        yPosition += 5;
        doc.text(`Surface: ${surface} m²`, margin, yPosition);
      }
      yPosition += 10;
    }

    // MONTANT AVEC TTC
    const ttc = result.estimatedCost || 0;
    const { total_ht, vat_amount } = calculateFromTTC(ttc, 20);

    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition, contentWidth, 30, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MONTANT TOTAL TTC:', margin + 5, yPosition + 10);
    doc.setFontSize(16);
    doc.text(
      `${ttc.toLocaleString('fr-FR')} €`,
      pageWidth - margin - 40,
      yPosition + 10
    );
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`HT: ${total_ht.toLocaleString('fr-FR')} €`, margin + 5, yPosition + 20);
    doc.text(`TVA (20%): ${vat_amount.toLocaleString('fr-FR')} €`, margin + 5, yPosition + 25);

    // Signature si présente
    if (signatureData && signedBy && signedAt) {
      yPosition = pageHeight - 60;
      doc.setFont('helvetica', 'bold');
      doc.text('Signature:', margin, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`Signé par: ${signedBy}`, margin, yPosition);
      yPosition += 5;
      doc.text(
        `Le: ${new Date(signedAt).toLocaleDateString('fr-FR')}`,
        margin,
        yPosition
      );
      
      if (signatureData.startsWith('data:image')) {
        try {
          doc.addImage(signatureData, 'PNG', margin, yPosition + 5, 50, 20);
        } catch (e) {
          console.error('Erreur ajout signature:', e);
        }
      }
    }

    // Retourner comme Blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } catch (error) {
    console.error('[PDF Service] Erreur génération PDF:', error);
    throw new Error('Impossible de générer le PDF');
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
          formatCurrency(step.cost),
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
        const lineHeight = 6;
        
        // Vérifier si on dépasse la page avant d'ajouter la ligne
        if (yPosition + lineHeight > pageHeight - margin - 30) {
          doc.addPage();
          yPosition = margin + 8;
          // Réafficher l'en-tête du tableau
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Matériau', margin + 2, yPosition);
          doc.text('Qté', margin + 70, yPosition);
          doc.text('Prix unit.', margin + 85, yPosition);
          doc.text('Total', pageWidth - margin - 20, yPosition, { align: 'right' });
          yPosition += 8;
          doc.setFont('helvetica', 'normal');
        }

        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(margin, yPosition - 4, contentWidth, lineHeight, 'F');
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
        yPosition += lineHeight;
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
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Total TTC:', pageWidth - margin - 30, yPosition, { align: 'right' });
      doc.text(formatCurrency(totalCost), pageWidth - margin - 2, yPosition, { align: 'right' });
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

