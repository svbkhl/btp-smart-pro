import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, User, Calendar, MapPin, FileText, Euro, Clock, CheckCircle2 } from "lucide-react";
import { UserSettings } from "@/hooks/useUserSettings";
import { Client } from "@/hooks/useClients";
import { calculateFromTTC } from "@/utils/priceCalculations";

// Formatage de date simple sans dépendance
const formatDate = (date: Date): string => {
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// Nettoie le texte HTML/Markdown pour l'affichage
const cleanText = (text: string | undefined): string => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '') // Supprime **bold**
    .replace(/#{1,6}\s/g, '') // Supprime les titres markdown
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Supprime les liens markdown
    .replace(/\n{3,}/g, '\n\n') // Réduit les sauts de ligne multiples
    .trim();
};

interface QuoteDisplayProps {
  result: any;
  companyInfo: UserSettings | null;
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
  quoteFormat?: "detailed" | "simplified"; // Format du devis
}

export const QuoteDisplay = ({
  result,
  companyInfo,
  clientInfo,
  surface,
  workType,
  region,
  quoteDate = new Date(),
  quoteNumber,
  signatureData,
  signedBy,
  signedAt,
  quoteFormat = "detailed",
}: QuoteDisplayProps) => {
  const isSimplified = quoteFormat === "simplified" || result?.format === "simplified";
  // ID pour l'export PDF
  const displayId = quoteNumber || `quote-${Date.now()}`;
  
  // ⚠️ MODE TTC FIRST - Le prix stocké est TOUJOURS un TTC
  let priceTTC = typeof result.estimatedCost === 'number'
    ? result.estimatedCost
    : parseFloat(result.estimatedCost || 0);

  // Si priceTTC est 0 ou manquant, calculer depuis workSteps et materials
  if (!priceTTC || priceTTC === 0) {
    const workStepsCost = (result.workSteps || []).reduce((sum: number, step: any) => {
      return sum + (typeof step.cost === 'number' ? step.cost : parseFloat(step.cost || 0));
    }, 0);

    const materialsCost = (result.materials || []).reduce((sum: number, mat: any) => {
      const quantity = typeof mat.quantity === 'string' ? parseFloat(mat.quantity) : (mat.quantity || 1);
      const unitCost = typeof mat.unitCost === 'number' ? mat.unitCost : parseFloat(mat.unitCost || 0);
      return sum + (quantity * unitCost);
    }, 0);

    priceTTC = workStepsCost + materialsCost;
  }

  // ⚠️ CALCUL CORRECT: TTC → HT et TVA
  // Le prix saisi/stocké est TOUJOURS TTC, on calcule HT et TVA à partir du TTC
  const prices = calculateFromTTC(priceTTC, 20);
  const totalTTC = prices.total_ttc;  // Source de vérité
  const totalHT = prices.total_ht;    // Calculé
  const tva = prices.vat_amount;      // Calculé

  // Formater l'adresse complète de l'entreprise
  const companyAddress = [
    companyInfo?.address,
    companyInfo?.postal_code && companyInfo?.city 
      ? `${companyInfo.postal_code} ${companyInfo.city}`
      : companyInfo?.city || companyInfo?.postal_code,
    companyInfo?.country || 'France'
  ].filter(Boolean).join(', ');

  // Formater l'adresse du client
  const clientAddress = clientInfo.location || 'Non spécifiée';

  return (
    <div className={`quote-display bg-white text-black ${isSimplified ? 'p-4 md:p-6' : 'p-4 md:p-6 lg:p-8'} max-w-4xl mx-auto`} id="quote-to-export">
      {/* Numéro de devis en haut */}
      {quoteNumber && (
        <div className="mb-3 text-right text-sm text-gray-600">
          <strong>N° de devis :</strong> {quoteNumber}
        </div>
      )}
      
      {/* En-tête avec logo et informations entreprise */}
      <div className={`flex justify-between items-start ${isSimplified ? 'mb-4 pb-4' : 'mb-6 pb-6'} border-b-2 border-gray-300`}>
        <div className="flex-1">
          {companyInfo?.company_logo_url && (
            <img 
              src={companyInfo.company_logo_url} 
              alt="Logo" 
              className="h-16 mb-4 object-contain"
            />
          )}
          <div className="space-y-1">
            <h1 className={isSimplified ? "text-xl font-bold" : "text-2xl font-bold"}>{companyInfo?.company_name || 'Nom de l\'entreprise'}</h1>
            {!isSimplified && companyInfo?.legal_form && (
              <p className="text-sm text-gray-600">{companyInfo.legal_form}</p>
            )}
            {!isSimplified && companyAddress && (
              <p className="text-sm text-gray-600">{companyAddress}</p>
            )}
            {!isSimplified && (
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                {companyInfo?.siret && (
                  <span>SIRET: {companyInfo.siret}</span>
                )}
                {companyInfo?.vat_number && (
                  <span>TVA: {companyInfo.vat_number}</span>
                )}
              </div>
            )}
            {!isSimplified && (
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                {companyInfo?.phone && (
                  <span>Tél: {companyInfo.phone}</span>
                )}
                {companyInfo?.email && (
                  <span>Email: {companyInfo.email}</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <h2 className={isSimplified ? "text-2xl font-bold mb-1" : "text-3xl font-bold mb-2"}>DEVIS</h2>
          {quoteNumber && (
            <p className="text-sm text-gray-600">N° {quoteNumber}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Date: {formatDate(quoteDate)}
          </p>
        </div>
      </div>

      {/* Informations client */}
      <div className={isSimplified ? "mb-4" : "mb-6"}>
        <h3 className={`${isSimplified ? "text-base font-semibold mb-2" : "text-lg font-semibold mb-4"} flex items-center gap-2`}>
          <User className={isSimplified ? "h-4 w-4" : "h-5 w-5"} />
          Client
        </h3>
        <div className={`bg-gray-50 ${isSimplified ? "p-3" : "p-4"} rounded-lg`}>
          <p className={`font-semibold ${isSimplified ? "text-base" : "text-lg"}`}>{clientInfo.name}</p>
          {!isSimplified && clientAddress && (
            <p className="text-sm text-gray-600 mt-1">
              <MapPin className="h-4 w-4 inline mr-1" />
              {clientAddress}
            </p>
          )}
          {!isSimplified && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
              {clientInfo.email && (
                <span>Email: {clientInfo.email}</span>
              )}
              {clientInfo.phone && (
                <span>Tél: {clientInfo.phone}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Format simplifié */}
      {isSimplified ? (
        <div className={`${isSimplified ? "mb-4" : "mb-6"} p-4 bg-gray-50 rounded-lg border-l-4 border-primary`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-semibold text-lg mb-1">{workType}</p>
              {result.description && (
                <p className="text-sm text-gray-600 mb-2">{result.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <span>Surface: {surface} m²</span>
                {region && <span>• {region}</span>}
                {result.estimatedDuration && <span>• Durée: {result.estimatedDuration}</span>}
              </div>
            </div>
            <div className="text-right ml-4">
              <p className="text-2xl font-bold text-primary">
                {totalTTC.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} € TTC
              </p>
              <p className="text-sm text-gray-600">
                ({totalHT.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} € HT)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Description des travaux */}
          <div className="mb-6">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description des prestations
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
              <p><strong>Type de travaux:</strong> {workType}</p>
              <p><strong>Surface:</strong> {surface} m²</p>
              {region && (
                <p><strong>Région:</strong> {region}</p>
              )}
              {result.estimatedDuration && (
                <p><strong>Durée estimée:</strong> {result.estimatedDuration}</p>
              )}
              {result.description && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-gray-700">{result.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Détail des prestations - Version compacte */}
          {result.workSteps && result.workSteps.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-semibold mb-3">Détail des prestations</h3>
              <div className="space-y-2">
                {result.workSteps.map((step: any, idx: number) => {
                  const stepCost = typeof step.cost === 'number' ? step.cost : parseFloat(step.cost || 0);
                  return (
                    <div key={idx} className="flex justify-between items-start p-2 bg-gray-50 rounded border-l-2 border-primary">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{step.step || `Étape ${idx + 1}`}</p>
                        {step.description && (
                          <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold ml-4 whitespace-nowrap">
                        {stepCost.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} €
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matériaux - Version compacte */}
          {result.materials && result.materials.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-semibold mb-3">Matériaux nécessaires</h3>
              <div className="space-y-1">
                {result.materials.map((mat: any, idx: number) => {
                  const unitCost = typeof mat.unitCost === 'number' ? mat.unitCost : parseFloat(mat.unitCost || 0);
                  const quantity = mat.quantity || 'Non spécifiée';
                  return (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span>{mat.name || 'Matériau'}</span>
                      <div className="flex gap-3 ml-4">
                        <span className="text-gray-600">Qté: {quantity}</span>
                        <span className="font-semibold">
                          {unitCost.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} €
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Totaux - Toujours affichés */}
      {!isSimplified && (
        <div className="mb-6">
          <div className="flex justify-end">
            <div className="w-72">
              <table className="w-full border-collapse">
                <tbody>
                  {/* ⚠️ MODE TTC FIRST: TTC affiché en premier et en gras */}
                  <tr className="bg-primary/10 font-bold text-lg">
                    <td className="border border-gray-300 p-3 text-right font-bold">Total à payer (TTC)</td>
                    <td className="border border-gray-300 p-3 text-right font-bold text-primary">
                      {totalTTC.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-right text-sm text-muted-foreground">dont TVA (20%)</td>
                    <td className="border border-gray-300 p-2 text-right text-sm">
                      {tva.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-right text-sm text-muted-foreground">Total HT</td>
                    <td className="border border-gray-300 p-2 text-right text-sm">
                      {totalHT.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recommandations - Version compacte */}
      {result.recommendations && result.recommendations.length > 0 && !isSimplified && (
        <div className="mb-4">
          <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Recommandations
          </h3>
          <ul className="space-y-1">
            {result.recommendations.slice(0, 3).map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-primary">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conditions générales - Version compacte */}
      {companyInfo?.terms_and_conditions && !isSimplified && (
        <div className="mb-4 pt-4 border-t border-gray-300">
          <h3 className="text-sm font-semibold mb-2">Conditions générales de vente</h3>
          <div className="text-xs text-gray-600 line-clamp-3">
            {companyInfo.terms_and_conditions}
          </div>
        </div>
      )}

      {/* Signature - Version compacte */}
      <div className={`${isSimplified ? "mt-6" : "mt-8"} pt-4 border-t-2 border-gray-300`}>
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <p className="text-xs text-gray-600 mb-2">
              Devis reçu avant exécution des travaux, bon pour accord
            </p>
            {signatureData ? (
              <div className="mt-4">
                <img 
                  src={signatureData} 
                  alt="Signature" 
                  className="max-w-[200px] h-16 object-contain"
                />
                {signedBy && (
                  <p className="text-xs text-gray-700 font-medium mt-1">
                    {signedBy}
                  </p>
                )}
                {signedAt && (
                  <p className="text-xs text-gray-500">
                    Signé le {formatDate(new Date(signedAt))}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-xs text-gray-600 border-t border-gray-300 pt-2 w-48">
                  Signature et date
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">
              Validité : 30 jours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

