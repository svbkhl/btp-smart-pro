import jsPDF from 'jspdf';
import { calculateFromTTC } from '@/utils/priceCalculations';
import { formatClientBlock, clientRowToBlockInput } from '@/utils/formatClientBlock';
import { renderInvoiceEditorial } from '@/services/pdf/renderInvoiceEditorial';
import { renderEauperation } from '@/services/pdf/renderEauperation';
import { getTheme } from '@/services/pdf/themes';
import type { Invoice } from '@/hooks/useInvoices';
import type { UserSettings } from '@/hooks/useUserSettings';

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
  civility?: string; // Civilité (M., Mme, etc.)
  firstName?: string; // Prénom
  address?: string; // Adresse complète
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

export interface DownloadQuotePDFParams {
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

export interface DownloadQuotePDFOptions {
  /** Si true : ouvre le PDF dans un nouvel onglet au lieu de télécharger */
  preview?: boolean;
  /** Si true : retourne le Blob PDF (aperçu iframe, sans téléchargement ni pop-up) */
  asBlob?: boolean;
}

function openPdfBlobInNewTab(doc: InstanceType<typeof jsPDF>, fileName: string): void {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error(
      "Impossible d'ouvrir l'aperçu PDF. Vérifiez que les pop-ups ne sont pas bloqués pour ce site."
    );
  }
  win.addEventListener("unload", () => URL.revokeObjectURL(url), { once: true });
}

/**
 * Génère et télécharge un PDF de devis professionnel (ou l'ouvre en aperçu si options.preview)
 */
export async function downloadQuotePDF(
  params: DownloadQuotePDFParams,
  options?: DownloadQuotePDFOptions
): Promise<void | Blob> {
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
      quoteFormat, // Ancien format (compatibilité)
      mode, // Nouveau format
      tvaRate = 0.20,
      tva293b = false, // TVA non applicable 293B
      sections, // Sections (corps de métier)
      lines, // Lignes détaillées (mode detailed)
      subtotal_ht,
      total_tva,
      total_ttc,
    } = params;

    // Thème Eau'pération Sanitaire — renderer custom (navy/rouge/cyan).
    const companyId = (companyInfo as any)?.company_id as string | undefined;
    const theme = getTheme(companyId);
    if (theme.id === 'eauperation') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      await renderEauperation(doc, {
        mode: 'devis',
        companyInfo: companyInfo as UserSettings,
        clientInfo: {
          name:      clientInfo.name,
          civility:  clientInfo.civility,
          firstName: clientInfo.firstName,
          phone:     clientInfo.phone,
          email:     clientInfo.email,
          location:  clientInfo.location,
          address:   (clientInfo as any).address,
        },
        quoteNumber:  quoteNumber || '',
        quoteDate:    quoteDate,
        sections:     (sections || []) as any,
        lines:        (lines    || []) as any,
        subtotalHT:   subtotal_ht ?? 0,
        totalTVA:     total_tva   ?? 0,
        totalTTC:     total_ttc   ?? 0,
        tva293b:      tva293b,
        signatureData: signatureData,
        signedBy:     signedBy,
        signedAt:     signedAt,
      });
      const fileName = quoteNumber
        ? `Devis-${quoteNumber}.pdf`
        : `Devis-${formatDate(quoteDate).replace(/\s/g, '-')}.pdf`;
      if (options?.asBlob) return doc.output('blob');
      if (options?.preview) { openPdfBlobInNewTab(doc, fileName); } else { doc.save(fileName); }
      return;
    }

    // V2 éditorial : si activé sur l'entreprise, déléguer au renderer partagé.
    const editorialEnabled = (companyInfo as any)?.invoice_template_version === 'v2-editorial';
    if (editorialEnabled) {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const fakeInvoice = {
        id: 'preview',
        user_id: '',
        invoice_number: quoteNumber || '',
        description: [
          (result as any)?.description ? String((result as any).description).trim() : "",
          (result as any)?.note ? `Note:\n${String((result as any).note).trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        client_name: clientInfo.name,
        client_email: clientInfo.email,
        client_address: clientInfo.address || clientInfo.location,
        amount: total_ttc ?? 0,
        total_ht: subtotal_ht,
        total_ttc: total_ttc,
        tva: total_tva,
        vat_rate_snapshot: tva293b ? 0 : tvaRate,
        vat_legal_mention: tva293b ? 'TVA non applicable, art. 293 B du CGI.' : null,
        status: 'draft' as const,
        service_lines: (lines || []).map((l) => ({
          description: l.label,
          quantity: l.quantity ?? 1,
          unit_price: l.unit_price_ht ?? 0,
          total: l.total_ht,
        })),
        created_at: quoteDate.toISOString(),
        updated_at: quoteDate.toISOString(),
      } as unknown as Invoice;
      await renderInvoiceEditorial(doc, {
        invoice: fakeInvoice,
        companyInfo: companyInfo as UserSettings,
        clientRow: {
          name: clientInfo.name,
          titre: clientInfo.civility ?? null,
          prenom: clientInfo.firstName ?? null,
          phone: clientInfo.phone,
          location: clientInfo.address || clientInfo.location,
        },
        mode: 'devis',
      });
      const fileName = quoteNumber
        ? `Devis-${quoteNumber}.pdf`
        : `Devis-${formatDate(quoteDate).replace(/\s/g, '-')}.pdf`;
      if (options?.asBlob) {
        return doc.output("blob");
      }
      if (options?.preview) {
        openPdfBlobInNewTab(doc, fileName);
        console.log("[PDF Service V2] Aperçu devis éditorial:", fileName);
      } else {
        doc.save(fileName);
        console.log("[PDF Service V2] Devis éditorial généré:", fileName);
      }
      return;
    }

    // Déterminer le mode
    const quoteMode = mode || (quoteFormat === "simplified" ? "simple" : "detailed") || "simple";
    const effectiveTvaRate = tva293b ? 0 : tvaRate; // Forcer à 0 si 293B

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

    // Couleurs — design noir & blanc professionnel
    const primaryColor = [30, 30, 30]; // Noir/anthracite
    const textColor = [31, 41, 55]; // Gris foncé
    const lightGray = [243, 244, 246]; // Gris clair

    // ============================================
    // EN-TÊTE
    // ============================================
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPosition, contentWidth, 40, 'F');

    // Logo (si disponible) - gérer les deux formats de noms de champs
    const logoUrl = companyInfo.logoUrl || companyInfo.company_logo_url;
    let logoLoaded = false;
    if (logoUrl) {
      try {
        // Valider l'URL avant de charger
        const trimmedUrl = logoUrl.trim();
        if (trimmedUrl && (trimmedUrl.startsWith('http') || trimmedUrl.startsWith('data:image'))) {
          const logoImg = await loadImage(trimmedUrl);
          const logoSize = 30;
          // Déterminer le format de l'image depuis l'URL ou utiliser PNG par défaut
          const imageFormat = trimmedUrl.startsWith('data:image/jpeg') || trimmedUrl.includes('.jpg') || trimmedUrl.includes('.jpeg') 
            ? 'JPEG' 
            : 'PNG';
          doc.addImage(logoImg, imageFormat, margin + 5, yPosition + 5, logoSize, logoSize);
          logoLoaded = true;
        } else {
          console.warn('[PDF Service] URL du logo invalide:', trimmedUrl);
        }
      } catch (error: any) {
        console.warn('[PDF Service] Impossible de charger le logo:', error?.message || error);
        // Continuer sans logo - ne pas bloquer la génération du PDF
      }
    }

    // Nom de l'entreprise - gérer les deux formats de noms de champs
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const companyName = companyInfo.companyName || companyInfo.company_name || 'Votre Entreprise';
    const headerX = margin + (logoLoaded ? 40 : 5);
    doc.text(companyName, headerX, yPosition + 14);

    // Nom du responsable (signature_name) sous le nom de l'entreprise
    const contactName = (companyInfo as any).signature_name || (companyInfo as any).contact_name;
    if (contactName) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(contactName, headerX, yPosition + 22);
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
    
    // Coordonnées (gérer les deux formats) — SIRET/TVA/forme juridique en bas au centre
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
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPosition, contentWidth, 30, 3, 3, 'D');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Client:', margin + 5, yPosition + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Bloc client centralisé via formatClientBlock (Bug #2 fix)
    const quoteClientLines = formatClientBlock(
      clientRowToBlockInput({
        name: clientInfo.name,
        titre: clientInfo.civility ?? null,
        prenom: clientInfo.firstName ?? null,
      })
    );
    const linesToPrintQ = quoteClientLines.length > 0 ? quoteClientLines : [clientInfo.name || 'Non spécifié'];
    let clientBlockYQ = yPosition + 14;
    linesToPrintQ.slice(0, 2).forEach((line) => {
      doc.text(line, margin + 5, clientBlockYQ);
      clientBlockYQ += 6;
    });
    let metaYQ = Math.max(clientBlockYQ, yPosition + 20);

    // Adresse complète (priorité: address > location)
    const fullAddress = clientInfo.address || clientInfo.location;
    if (fullAddress) {
      doc.text(fullAddress, margin + 5, metaYQ);
      metaYQ += 6;
    }

    // Téléphone et email sur la même ligne
    let contactLine = '';
    if (clientInfo.phone) {
      contactLine += `Tél: ${clientInfo.phone}`;
    }
    if (clientInfo.email) {
      if (contactLine) contactLine += ' - ';
      contactLine += `Email: ${clientInfo.email}`;
    }
    if (contactLine) {
      doc.text(contactLine, margin + 5, metaYQ);
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

      // Positions des colonnes — adaptées selon présence TVA
      // Sans TVA (293B) : plus de place pour la Désignation
      const COL = tva293b ? {
        ref:     margin + 2,
        desig:   margin + 13,
        desigW:  78,
        unite:   margin + 92,
        pu:      margin + 112,
        qty:     margin + 137,
        ht:      margin + 148,
        tva:     0,  // absent
        ttc:     rightX,
      } : {
        ref:     margin + 2,
        desig:   margin + 13,
        desigW:  65,
        unite:   margin + 79,
        pu:      margin + 98,
        qty:     margin + 123,
        ht:      margin + 134,
        tva:     margin + 157,
        ttc:     rightX,
      };

      // Helper : dessine l'en-tête de tableau
      const renderTableHeader = () => {
        if (yPosition + 8 > pageHeight - margin - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPosition, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Réf',           COL.ref,   yPosition + 5.5);
        doc.text('Désignation',   COL.desig, yPosition + 5.5);
        doc.text('Unité',         COL.unite, yPosition + 5.5);
        doc.text('Prix unit. HT', COL.pu,    yPosition + 5.5);
        doc.text('Qté',           COL.qty,   yPosition + 5.5);
        doc.text('Prix HT',       COL.ht,    yPosition + 5.5);
        if (!tva293b) doc.text('TVA', COL.tva, yPosition + 5.5);
        doc.text('Total TTC', COL.ttc, yPosition + 5.5, { align: 'right' });
        yPosition += 8;
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');
      };

      // Parcourir chaque section
      sectionsWithLines.forEach(({ section, lines: sectionLines }, sectionIndex) => {
        // --- Titre de section (multi-ligne) ---
        if (section) {
          // Construire toutes les lignes du titre (gère les \n + retour à la ligne auto)
          const rawTitle = `${sectionIndex + 1}. ${section.title}`;
          const titleWrapped: string[] = rawTitle.split('\n').flatMap(
            (l) => doc.splitTextToSize(l, contentWidth) as string[]
          );
          const titleBlockH = titleWrapped.length * 5 + 4;

          if (yPosition + titleBlockH + 20 > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...primaryColor);
          // Première ligne en gras 12pt
          doc.text(titleWrapped[0], margin, yPosition);
          yPosition += 6;

          // Lignes suivantes (ex : description longue) en normal 9pt
          if (titleWrapped.length > 1) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            titleWrapped.slice(1).forEach((tl) => {
              doc.text(tl, margin, yPosition);
              yPosition += 4.5;
            });
          }
          yPosition += 3;
        }

        renderTableHeader();

        sectionLines.forEach((line, lineIndex) => {
          const lineNumber = section
            ? `${sectionIndex + 1}.${lineIndex + 1}`
            : `${lineIndex + 1}`;

          // Calculer la hauteur réelle de la ligne AVANT de la dessiner
          const labelLines = doc.splitTextToSize(
            line.label || '', COL.desigW
          ) as string[];
          const lineHeight = Math.max(7, labelLines.length * 4 + 3);

          // Saut de page si la ligne ne rentre pas
          if (yPosition + lineHeight > pageHeight - margin - 20) {
            doc.addPage();
            yPosition = margin;
            renderTableHeader();
          }

          // Fond alterné — utiliser la hauteur réelle
          if (lineIndex % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(margin, yPosition, contentWidth, lineHeight, 'F');
          }

          doc.setFontSize(8);

          // Réf
          doc.text(lineNumber, COL.ref, yPosition + 4);

          // Désignation — toutes les lignes wrappées
          labelLines.forEach((lbl, i) => {
            doc.text(lbl, COL.desig, yPosition + 4 + i * 4);
          });

          // Colonnes numériques : centrées verticalement sur la hauteur de la ligne
          const midY = yPosition + lineHeight / 2 + 1.5;
          doc.text(line.unit || '-',                                       COL.unite, midY);
          doc.text(line.unit_price_ht ? formatCurrency(line.unit_price_ht) : '-', COL.pu, midY);
          doc.text((line.quantity ?? 1).toString(),                        COL.qty,   midY);
          doc.text(formatCurrency(line.total_ht),                          COL.ht,    midY);
          if (!tva293b) {
            doc.text(`${(line.tva_rate * 100).toFixed(1)}%`, COL.tva, midY);
          }
          doc.text(formatCurrency(line.total_ttc), COL.ttc, midY, { align: 'right' });

          totalHT  += line.total_ht;
          totalTVA += line.total_tva;
          totalTTC += line.total_ttc;
          yPosition += lineHeight;
        });

        yPosition += 4; // espace entre sections
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
    // NOTE CLIENT (optionnelle)
    // ============================================
    const quoteNote = cleanText((result as any)?.note);
    if (quoteNote) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text("Note :", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(quoteNote, contentWidth);
      noteLines.forEach((line: string) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 4.5;
      });
      yPosition += 4;
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

    // Conditions : custom (terms_and_conditions) ou défaut
    const customTerms = (companyInfo as any).terms_and_conditions as string | undefined;
    const conditions = customTerms
      ? customTerms.split('\n').filter(Boolean)
      : [
          "Ce devis est valable 30 jours à compter de la date d'émission.",
          'Les prix sont exprimés en euros, toutes taxes comprises.',
          "Les travaux débuteront après acceptation du devis et versement d'un acompte si demandé.",
        ];

    conditions.forEach((condition) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      const condLines = doc.splitTextToSize(condition, contentWidth) as string[];
      condLines.forEach((cl) => {
        doc.text(cl, margin, yPosition);
        yPosition += 4.5;
      });
    });

    // ============================================
    // FOOTER - SIRET ET TVA
    // ============================================
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }

    yPosition += 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    const centerX = pageWidth / 2;
    const legalForm = companyInfo.legalForm || companyInfo.legal_form;
    const siret = companyInfo.siret;
    const vatNumber = companyInfo.vatNumber || companyInfo.vat_number;
    const footerParts: string[] = [];
    if (legalForm) footerParts.push(legalForm);
    if (siret) footerParts.push(`SIRET: ${siret}`);
    if (vatNumber) footerParts.push(`TVA intracommunautaire: ${vatNumber}`);
    if (footerParts.length > 0) {
      doc.text(footerParts.join(' — '), centerX, yPosition, { align: 'center' });
    }

    // ============================================
    // TÉLÉCHARGEMENT
    // ============================================
    const fileName = quoteNumber
      ? `Devis-${quoteNumber}.pdf`
      : `Devis-${formatDate(quoteDate).replace(/\s/g, '-')}.pdf`;

    if (options?.asBlob) {
      return doc.output("blob");
    }
    if (options?.preview) {
      openPdfBlobInNewTab(doc, fileName);
      console.log("[PDF Service] Aperçu PDF devis:", fileName);
    } else {
      doc.save(fileName);
      console.log("[PDF Service] PDF généré avec succès:", fileName);
    }
  } catch (error) {
    console.error('[PDF Service] Erreur lors de la génération du PDF:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Impossible de générer le PDF. Veuillez réessayer.'
    );
  }
}

/** Blob PDF devis (même rendu que téléchargement) pour aperçu inline. */
export async function getQuotePdfBlob(params: DownloadQuotePDFParams): Promise<Blob> {
  const out = await downloadQuotePDF(params, { asBlob: true });
  if (!(out instanceof Blob)) {
    throw new Error("Impossible de générer le PDF du devis.");
  }
  return out;
}

/**
 * Génère un PDF de devis et le retourne comme Blob (pour aperçu)
 */
export async function generateQuotePDF(params: DownloadQuotePDFParams): Promise<Blob> {
  return getQuotePdfBlob(params);
}

/**
 * Génère un PDF de devis et le retourne en base64 pour l'email / aperçu iframe
 */
export async function generateQuotePDFBase64(params: DownloadQuotePDFParams): Promise<{
  base64: string;
  filename: string;
}> {
  const blob = await getQuotePdfBlob(params);
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  const fileName = params.quoteNumber
    ? `Devis-${params.quoteNumber}.pdf`
    : `Devis-${formatDate(params.quoteDate).replace(/\s/g, '-')}.pdf`;
  return { base64, filename: fileName };
}

/**
 * Charge une image depuis une URL ou une data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // Vérifier que l'URL est valide
    if (!src || typeof src !== 'string' || src.trim() === '') {
      reject(new Error('URL du logo invalide ou vide'));
      return;
    }

    // Vérifier si c'est une data URL valide
    if (src.startsWith('data:')) {
      // Vérifier le format de la data URL
      const dataUrlMatch = src.match(/^data:image\/(png|jpeg|jpg|gif);base64,/i);
      if (!dataUrlMatch) {
        reject(new Error('Format de data URL invalide pour le logo'));
        return;
      }
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Timeout pour éviter d'attendre indéfiniment
    const timeout = setTimeout(() => {
      reject(new Error('Timeout lors du chargement du logo'));
    }, 10000); // 10 secondes max

    img.onload = () => {
      clearTimeout(timeout);
      // Vérifier que l'image est valide (largeur et hauteur > 0)
      if (img.width === 0 || img.height === 0) {
        reject(new Error('Image du logo invalide (dimensions nulles)'));
        return;
      }
      resolve(img);
    };

    img.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error(`Erreur lors du chargement du logo: ${error}`));
    };

    img.src = src;
  });
}

