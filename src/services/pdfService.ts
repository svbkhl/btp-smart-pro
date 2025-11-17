/**
 * Service pour générer des PDFs de devis
 * Utilise jsPDF et html2canvas pour créer un vrai fichier PDF téléchargeable
 * Optimisé pour réduire la taille des fichiers (objectif < 1 Mo)
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFQuoteData {
  result: any;
  companyInfo: any;
  clientInfo: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  surface: string;
  workType: string;
  region?: string;
  quoteDate?: Date;
  quoteNumber?: string;
  signatureData?: string;
  signedBy?: string;
  signedAt?: string;
}

/**
 * Optimise une image base64 en réduisant sa qualité
 */
function optimizeImage(dataUrl: string, quality: number = 0.7, maxWidth: number = 1200): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Redimensionner si nécessaire
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Convertir en JPEG pour réduire la taille
        const optimized = canvas.toDataURL('image/jpeg', quality);
        resolve(optimized);
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Génère le HTML du devis pour l'export PDF
 */
function generateQuoteHTML(data: PDFQuoteData): string {
  const formatDate = (date: Date): string => {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Calculer le prix total à partir des étapes et matériaux si estimatedCost n'est pas disponible
  let estimatedCost = typeof data.result.estimatedCost === 'number' 
    ? data.result.estimatedCost 
    : parseFloat(data.result.estimatedCost || 0);
  
  // Si estimatedCost est 0 ou manquant, calculer depuis workSteps et materials
  if (!estimatedCost || estimatedCost === 0) {
    const workStepsCost = (data.result.workSteps || []).reduce((sum: number, step: any) => {
      return sum + (typeof step.cost === 'number' ? step.cost : parseFloat(step.cost || 0));
    }, 0);
    
    const materialsCost = (data.result.materials || []).reduce((sum: number, mat: any) => {
      const quantity = typeof mat.quantity === 'string' ? parseFloat(mat.quantity) : (mat.quantity || 1);
      const unitCost = typeof mat.unitCost === 'number' ? mat.unitCost : parseFloat(mat.unitCost || 0);
      return sum + (quantity * unitCost);
    }, 0);
    
    estimatedCost = workStepsCost + materialsCost;
  }
  
  const tvaRate = 0.20;
  const totalHT = estimatedCost;
  const tva = totalHT * tvaRate;
  const totalTTC = totalHT + tva;

  const companyAddress = [
    data.companyInfo?.address,
    data.companyInfo?.postal_code && data.companyInfo?.city 
      ? `${data.companyInfo.postal_code} ${data.companyInfo.city}`
      : data.companyInfo?.city || data.companyInfo?.postal_code,
    data.companyInfo?.country || 'France'
  ].filter(Boolean).join(', ');

  const workSteps = data.result.workSteps || [];
  const materials = data.result.materials || [];
  const recommendations = data.result.recommendations || [];

  // Format professionnel optimisé pour une seule page A4 paysage
  // Structure claire, élégante et complète
  return `
    <div id="quote-to-export" style="width: 1047px; max-width: 1047px; background: white; padding: 15px; font-family: 'Arial', 'Helvetica', sans-serif; color: #1a1a1a; box-sizing: border-box; margin: 0 auto; line-height: 1.4;">
      
      <!-- 🏢 EN-TÊTE PROFESSIONNELLE -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #0066cc;">
        <!-- Logo et informations entreprise (gauche) -->
        <div style="flex: 1; max-width: 55%;">
          ${data.companyInfo?.company_logo_url ? `<img src="${data.companyInfo.company_logo_url}" alt="Logo" style="height: 80px; max-width: 200px; margin-bottom: 12px; object-fit: contain;" />` : ''}
          <h1 style="font-size: 22px; font-weight: bold; margin-bottom: 6px; margin-top: 0; color: #1a1a1a; letter-spacing: 0.3px;">${data.companyInfo?.company_name || 'Nom de l\'entreprise'}</h1>
          ${data.companyInfo?.legal_form ? `<p style="font-size: 12px; color: #555; margin-bottom: 4px; margin-top: 0; font-weight: 500;">${data.companyInfo.legal_form}</p>` : ''}
          ${companyAddress ? `<p style="font-size: 11px; color: #666; margin-bottom: 3px; margin-top: 0; line-height: 1.4;">${companyAddress}</p>` : ''}
          <div style="font-size: 10px; color: #777; margin-top: 8px; line-height: 1.5;">
            ${data.companyInfo?.siret ? `<div style="margin-bottom: 2px;">SIRET: ${data.companyInfo.siret}</div>` : ''}
            ${data.companyInfo?.vat_number ? `<div style="margin-bottom: 2px;">TVA: ${data.companyInfo.vat_number}</div>` : ''}
            ${data.companyInfo?.phone ? `<div style="margin-bottom: 2px;">Tél: ${data.companyInfo.phone}</div>` : ''}
            ${data.companyInfo?.email ? `<div>Email: ${data.companyInfo.email}</div>` : ''}
          </div>
        </div>
        <!-- Titre DEVIS et numéro (droite) -->
        <div style="text-align: right; flex-shrink: 0; margin-left: 20px;">
          <h2 style="font-size: 42px; font-weight: bold; margin-bottom: 8px; margin-top: 0; color: #0066cc; letter-spacing: 1px;">DEVIS</h2>
          ${data.quoteNumber ? `<div style="font-size: 12px; color: #333; font-weight: 600; margin-bottom: 6px; padding: 4px 8px; background-color: #f0f7ff; border-radius: 4px; display: inline-block;">N° ${data.quoteNumber}</div>` : ''}
          <p style="font-size: 11px; color: #666; margin-top: 8px; margin-bottom: 0;">Date: ${formatDate(data.quoteDate || new Date())}</p>
        </div>
      </div>

       <!-- Section Client et Détails - Côte à côte pour optimiser l'espace -->
       <div style="display: flex; gap: 15px; margin-bottom: 12px;">
         <div style="flex: 1; padding: 6px; background-color: #f9f9f9; border-left: 3px solid #0066cc;">
           <h3 style="font-size: 11px; font-weight: 600; margin-bottom: 4px; margin-top: 0; color: #333;">Client</h3>
           <p style="font-size: 11px; margin-bottom: 1px; margin-top: 0; font-weight: 600;">${data.clientInfo.name}</p>
           ${data.clientInfo.location ? `<p style="font-size: 10px; color: #666; margin-top: 1px; margin-bottom: 1px;">${data.clientInfo.location}</p>` : ''}
           ${data.clientInfo.email ? `<p style="font-size: 10px; color: #666; margin-top: 1px; margin-bottom: 1px;">${data.clientInfo.email}</p>` : ''}
           ${data.clientInfo.phone ? `<p style="font-size: 10px; color: #666; margin-top: 1px; margin-bottom: 0;">${data.clientInfo.phone}</p>` : ''}
         </div>
         <div style="flex: 1;">
           <h3 style="font-size: 11px; font-weight: 600; margin-bottom: 4px; margin-top: 0;">Détails des travaux</h3>
           <p style="font-size: 10px; margin-bottom: 2px; margin-top: 0;"><strong>Type:</strong> ${data.workType}</p>
           <p style="font-size: 10px; margin-bottom: 2px; margin-top: 0;"><strong>Surface:</strong> ${data.surface} m²</p>
           ${data.region ? `<p style="font-size: 10px; margin-bottom: 2px; margin-top: 0;"><strong>Région:</strong> ${data.region}</p>` : ''}
           ${data.result.estimatedDuration ? `<p style="font-size: 10px; margin-bottom: 2px; margin-top: 0;"><strong>Durée:</strong> ${data.result.estimatedDuration}</p>` : ''}
         </div>
       </div>

       <!-- 📊 TABLEAUX DE PRESTATIONS (Côte à côte pour optimiser l'espace) -->
       <div style="display: flex; gap: 15px; margin-bottom: 18px;">
         ${workSteps.length > 0 ? `
           <div style="flex: 1;">
             <h3 style="font-size: 12px; font-weight: 700; margin-bottom: 8px; margin-top: 0; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 6px; border-bottom: 2px solid #0066cc;">Étapes de travaux</h3>
             <table style="width: 100%; border-collapse: collapse; margin-top: 0; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
               <thead>
                 <tr style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: white;">
                   <th style="border: 1px solid #004080; padding: 8px 6px; text-align: left; font-size: 11px; font-weight: 600;">Étape</th>
                   <th style="border: 1px solid #004080; padding: 8px 6px; text-align: left; font-size: 11px; font-weight: 600;">Description</th>
                   <th style="border: 1px solid #004080; padding: 8px 6px; text-align: right; font-size: 11px; font-weight: 600; width: 90px;">Montant HT</th>
                 </tr>
               </thead>
               <tbody>
                 ${workSteps.slice(0, 6).map((step: any, idx: number) => `
                   <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                     <td style="border: 1px solid #e0e0e0; padding: 6px; font-size: 11px; color: #333; font-weight: 500;">${step.step || `Étape ${idx + 1}`}</td>
                     <td style="border: 1px solid #e0e0e0; padding: 6px; font-size: 11px; color: #555;">${(step.description || '').substring(0, 35)}</td>
                     <td style="border: 1px solid #e0e0e0; padding: 6px; text-align: right; font-size: 11px; color: #1a1a1a; font-weight: 600;">${parseFloat(step.cost || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>
           </div>
         ` : ''}
         
         ${materials.length > 0 ? `
           <div style="flex: 1;">
             <h3 style="font-size: 12px; font-weight: 700; margin-bottom: 8px; margin-top: 0; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 6px; border-bottom: 2px solid #0066cc;">Matériaux nécessaires</h3>
             <table style="width: 100%; border-collapse: collapse; margin-top: 0; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
               <thead>
                 <tr style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: white;">
                   <th style="border: 1px solid #004080; padding: 8px 6px; text-align: left; font-size: 11px; font-weight: 600;">Désignation</th>
                   <th style="border: 1px solid #004080; padding: 8px 6px; text-align: center; font-size: 11px; font-weight: 600; width: 70px;">Qté</th>
                   <th style="border: 1px solid #004080; padding: 8px 6px; text-align: right; font-size: 11px; font-weight: 600; width: 90px;">Prix unit. HT</th>
                 </tr>
               </thead>
               <tbody>
                 ${materials.slice(0, 6).map((mat: any, idx: number) => `
                   <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                     <td style="border: 1px solid #e0e0e0; padding: 6px; font-size: 11px; color: #333;">${(mat.name || 'Matériau').substring(0, 30)}</td>
                     <td style="border: 1px solid #e0e0e0; padding: 6px; text-align: center; font-size: 11px; color: #555;">${mat.quantity || '-'}</td>
                     <td style="border: 1px solid #e0e0e0; padding: 6px; text-align: right; font-size: 11px; color: #1a1a1a; font-weight: 500;">${parseFloat(mat.unitCost || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>
           </div>
         ` : ''}
       </div>

       <!-- 💰 RÉSUMÉ FINANCIER (Professionnel) -->
       <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border: 2px solid #0066cc; border-radius: 6px;">
         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #d0d0d0;">
           <span style="font-size: 13px; font-weight: 600; color: #333;">Total HT</span>
           <span style="font-size: 13px; font-weight: 700; text-align: right; color: #1a1a1a; min-width: 120px;">${totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
         </div>
         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #d0d0d0;">
           <span style="font-size: 13px; font-weight: 600; color: #333;">TVA (20%)</span>
           <span style="font-size: 13px; font-weight: 600; text-align: right; color: #555; min-width: 120px;">${tva.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
         </div>
         <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 3px solid #0066cc; background-color: #ffffff; padding: 12px; border-radius: 4px;">
           <span style="font-size: 20px; font-weight: 700; color: #0066cc; text-transform: uppercase; letter-spacing: 0.5px;">Total TTC</span>
           <span style="font-size: 20px; font-weight: 700; text-align: right; color: #0066cc; min-width: 140px;">${totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
         </div>
       </div>

       <!-- ✍️ SIGNATURE ET CONDITIONS -->
       <div style="display: flex; gap: 20px; margin-top: 20px; padding-top: 15px; border-top: 2px solid #e0e0e0;">
         <div style="flex: 1;">
           <p style="font-size: 11px; color: #666; margin-bottom: 12px; line-height: 1.5;">Devis reçu avant exécution des travaux, bon pour accord</p>
           ${data.signatureData ? `
             <div style="margin-top: 15px;">
               <img src="${data.signatureData}" alt="Signature" style="max-width: 220px; height: 60px; object-fit: contain; margin-bottom: 6px;" />
               ${data.signedBy ? `<p style="font-size: 12px; font-weight: 600; margin-top: 6px; margin-bottom: 3px; color: #1a1a1a;">${data.signedBy}</p>` : ''}
               ${data.signedAt ? `<p style="font-size: 10px; color: #666; margin-top: 3px; margin-bottom: 0;">Signé le ${formatDate(new Date(data.signedAt))}</p>` : ''}
             </div>
           ` : `
             <div style="margin-top: 40px; padding-top: 8px; border-top: 1px solid #333; width: 220px;">
               <p style="font-size: 11px; color: #666; margin: 0;">Signature et date</p>
             </div>
           `}
         </div>
         <div style="flex: 1; text-align: right;">
           <p style="font-size: 11px; color: #666; margin-bottom: 8px; line-height: 1.5;"><strong>Validité du devis :</strong> 30 jours à compter de la date d'émission</p>
           ${recommendations.length > 0 ? `
             <div style="margin-top: 15px; padding: 10px; background-color: #fff9e6; border-left: 3px solid #ffa500; border-radius: 4px;">
               <p style="font-size: 10px; font-weight: 600; color: #8b6914; margin-bottom: 6px; margin-top: 0;">💡 Recommandations</p>
               <ul style="font-size: 9px; color: #666; padding-left: 16px; margin: 0; line-height: 1.4;">
                 ${recommendations.slice(0, 2).map((rec: string) => `<li style="margin-bottom: 3px;">${rec.substring(0, 50)}</li>`).join('')}
               </ul>
             </div>
           ` : ''}
         </div>
       </div>

      ${data.companyInfo?.terms_and_conditions ? `
        <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
          <h3 style="font-size: 11px; font-weight: 700; margin-bottom: 8px; margin-top: 0; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px;">Conditions générales de vente</h3>
          <div style="font-size: 9px; color: #666; white-space: pre-line; line-height: 1.4; max-height: 60px; overflow: hidden; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">${data.companyInfo.terms_and_conditions.substring(0, 250)}...</div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Génère un vrai fichier PDF téléchargeable au format A4
 * Optimisé pour réduire la taille du fichier (< 1 Mo)
 */
export async function downloadQuotePDF(data: PDFQuoteData): Promise<void> {
  try {
    // Chercher d'abord si l'élément existe déjà (cas où le devis est affiché)
    let quoteElement = document.getElementById('quote-to-export');
    let isTemporary = false;
    
    // Si l'élément n'existe pas, le créer dynamiquement
    if (!quoteElement) {
      // Créer un élément temporaire invisible pour le devis
      const tempContainer = document.createElement('div');
      tempContainer.id = 'quote-to-export-temp';
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '1047px'; // 277mm en pixels (277 * 3.7795) - largeur utile A4 paysage
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.zIndex = '-1';
      document.body.appendChild(tempContainer);

      // Générer le HTML du devis directement
      const quoteHTML = generateQuoteHTML(data);
      tempContainer.innerHTML = quoteHTML;
      
      // Attendre que le contenu soit rendu (notamment les images)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      quoteElement = tempContainer.querySelector('#quote-to-export') || tempContainer;
      isTemporary = true;
    }

    if (!quoteElement) {
      throw new Error('Impossible de créer l\'élément de devis pour l\'export PDF.');
    }

    // S'assurer que l'élément est visible pour html2canvas
    const originalStyles = {
      display: quoteElement.style.display,
      position: quoteElement.style.position,
      left: quoteElement.style.left,
      top: quoteElement.style.top,
      visibility: quoteElement.style.visibility,
      opacity: quoteElement.style.opacity,
      zIndex: quoteElement.style.zIndex,
    };

    quoteElement.style.display = 'block';
    quoteElement.style.position = 'relative';
    quoteElement.style.visibility = 'visible';
    quoteElement.style.opacity = '1';
    quoteElement.style.zIndex = '9999';
    if (isTemporary) {
      quoteElement.style.left = '0';
      quoteElement.style.top = '0';
    }
    
    // Attendre un peu pour que le rendu soit complet
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // OPTIMISATION : Réduire le scale pour que le contenu tienne sur une page
    // Scale 1.2 pour réduire la hauteur et tenir sur une seule page A4
    const canvas = await html2canvas(quoteElement as HTMLElement, {
      scale: 1.2, // Scale réduit pour tenir sur une page
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: quoteElement.scrollWidth || 1047,
      height: quoteElement.scrollHeight || 700, // Hauteur max pour A4 paysage
      windowWidth: quoteElement.scrollWidth || 1047,
      windowHeight: Math.min(quoteElement.scrollHeight || 700, 700), // Limiter la hauteur
      // Optimisations supplémentaires
      removeContainer: true,
      imageTimeout: 15000,
    });

    // Restaurer les styles originaux
    Object.assign(quoteElement.style, originalStyles);

    // Supprimer le conteneur temporaire s'il a été créé
    if (isTemporary) {
      const tempContainer = document.getElementById('quote-to-export-temp');
      if (tempContainer) {
        document.body.removeChild(tempContainer);
      }
    }

    // OPTIMISATION : Convertir le canvas en JPEG avec compression
    let imgData = canvas.toDataURL('image/jpeg', 0.75); // JPEG à 75% de qualité
    
    // Optimiser les images dans le canvas si nécessaire
    // (logo, signature, etc. sont déjà dans le HTML, mais on peut optimiser le canvas final)
    
    // Les dimensions seront calculées directement dans le PDF pour utiliser toute la largeur
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Créer le PDF en format A4 PAYSAGE pour plus de largeur et moins de hauteur
    const pdf = new jsPDF({
      orientation: 'landscape', // PAYSAGE : 297mm x 210mm
      unit: 'mm',
      format: 'a4',
      compress: true, // Activer la compression PDF
    });

    // Calculer les dimensions de la page
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm en paysage
    const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm en paysage
    
    // Marges réduites pour optimiser l'espace : 10mm partout
    const marginLeft = 10;
    const marginRight = 10;
    const marginTop = 10;
    const marginBottom = 10;
    
    // Largeur utile : 297mm - 20mm (marges) = 277mm
    // Hauteur utile : 210mm - 20mm (marges) = 190mm
    const usableWidth = pageWidth - marginLeft - marginRight;
    const usableHeight = pageHeight - marginTop - marginBottom;
    
    // Adapter l'image à la largeur utile (utiliser toute la largeur disponible)
    const finalWidth = usableWidth;
    let finalHeight = (imgHeight * usableWidth) / imgWidth;
    
    // FORCER SUR UNE SEULE PAGE : Si la hauteur dépasse, réduire l'échelle
    const maxHeightPerPage = pageHeight - marginTop - marginBottom;
    if (finalHeight > maxHeightPerPage) {
      // Réduire proportionnellement pour tenir sur une page
      const scaleFactor = maxHeightPerPage / finalHeight;
      finalHeight = maxHeightPerPage;
      // Note: on garde la largeur, seule la hauteur est ajustée
    }
    
    // Positionner avec les marges (xOffset = marginLeft)
    const xOffset = marginLeft;
    const yOffset = marginTop;
    
    // Ajouter l'image sur UNE SEULE PAGE (pleine largeur avec marges, format JPEG pour réduire la taille)
    pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight, '', 'FAST'); // 'FAST' = compression rapide
    
    // NE PLUS AJOUTER DE PAGES SUPPLÉMENTAIRES - Tout doit tenir sur une page

    // Générer le nom de fichier : devis (nom client) (date)
    const formatDateForFileName = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const clientName = data.clientInfo.name.replace(/[^a-z0-9\s-]/gi, '').trim();
    const dateStr = formatDateForFileName(data.quoteDate || new Date());
    const fileName = `devis ${clientName} (${dateStr}).pdf`;

    // OPTIMISATION : Mesurer la taille du PDF avant téléchargement
    const pdfOutput = pdf.output('arraybuffer');
    const pdfSizeMB = (pdfOutput.byteLength / 1024 / 1024);
    const pdfSizeKB = (pdfOutput.byteLength / 1024).toFixed(2);

    // Si le PDF dépasse 3 Mo, réessayer avec une compression plus agressive
    if (pdfSizeMB > 3) {
      // Compression supplémentaire pour PDF trop lourd
      
      // Réessayer avec une qualité d'image plus faible
      imgData = canvas.toDataURL('image/jpeg', 0.6); // 60% de qualité
      
      const pdfRetry = new jsPDF({
        orientation: 'landscape', // PAYSAGE pour tenir sur une page
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      
      // Recalculer les dimensions pour la re-compression (format A4 paysage)
      const pageHeightRetry = pdfRetry.internal.pageSize.getHeight();
      const pageWidthRetry = pdfRetry.internal.pageSize.getWidth();
      const marginLeftRetry = 10;
      const marginRightRetry = 10;
      const marginTopRetry = 10;
      const marginBottomRetry = 10;
      const usableWidthRetry = pageWidthRetry - marginLeftRetry - marginRightRetry;
      const usableHeightRetry = pageHeightRetry - marginTopRetry - marginBottomRetry;
      
      const widthRatioRetry = usableWidthRetry / (imgWidth * 0.264583);
      const heightRatioRetry = usableHeightRetry / (imgHeight * 0.264583);
      const finalRatioRetry = Math.min(widthRatioRetry, heightRatioRetry);
      const finalWidthRetry = imgWidth * finalRatioRetry * 0.264583;
      const finalHeightRetry = imgHeight * finalRatioRetry * 0.264583;
      
      // Utiliser toute la largeur disponible (format professionnel)
      const xOffsetRetry = marginLeftRetry;
      const finalWidthRetryAdjusted = usableWidthRetry;
      let finalHeightRetryAdjusted = (finalHeightRetry * usableWidthRetry) / finalWidthRetry;
      
      // FORCER SUR UNE SEULE PAGE : Ajuster la hauteur si nécessaire
      const maxHeightPerPageRetry = pageHeightRetry - marginTopRetry - marginBottomRetry;
      if (finalHeightRetryAdjusted > maxHeightPerPageRetry) {
        finalHeightRetryAdjusted = maxHeightPerPageRetry;
      }
      
      pdfRetry.addImage(imgData, 'JPEG', xOffsetRetry, marginTopRetry, finalWidthRetryAdjusted, finalHeightRetryAdjusted, '', 'FAST');
      
      // NE PLUS AJOUTER DE PAGES SUPPLÉMENTAIRES - Tout doit tenir sur une page
      
      const pdfOutputRetry = pdfRetry.output('arraybuffer');
      const pdfSizeMBRetry = (pdfOutputRetry.byteLength / 1024 / 1024);
      
      if (pdfSizeMBRetry < pdfSizeMB) {
        pdfRetry.save(fileName);
        return;
      }
    }

    // Télécharger le PDF
    pdf.save(fileName);
    
    // Afficher la taille finale dans la console
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(`Impossible de générer le PDF: ${errorMessage}`);
  }
}

/**
 * Ancienne fonction (conservée pour compatibilité)
 * @deprecated Utilisez downloadQuotePDF à la place
 */
export async function generateQuotePDF(data: PDFQuoteData): Promise<void> {
  await downloadQuotePDF(data);
}
