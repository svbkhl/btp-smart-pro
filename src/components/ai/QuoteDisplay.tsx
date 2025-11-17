import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, User, Calendar, MapPin, FileText, Euro, Clock, CheckCircle2 } from "lucide-react";
import { UserSettings } from "@/hooks/useUserSettings";
import { Client } from "@/hooks/useClients";
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
}: QuoteDisplayProps) => {
  // ID pour l'export PDF
  const displayId = quoteNumber || `quote-${Date.now()}`;
  
  // Calculer le prix total de la même manière que dans le PDF
  let estimatedCost = typeof result.estimatedCost === 'number' 
    ? result.estimatedCost 
    : parseFloat(result.estimatedCost || 0);
  
  // Si estimatedCost est 0 ou manquant, calculer depuis workSteps et materials
  if (!estimatedCost || estimatedCost === 0) {
    const workStepsCost = (result.workSteps || []).reduce((sum: number, step: any) => {
      return sum + (typeof step.cost === 'number' ? step.cost : parseFloat(step.cost || 0));
    }, 0);
    
    const materialsCost = (result.materials || []).reduce((sum: number, mat: any) => {
      const quantity = typeof mat.quantity === 'string' ? parseFloat(mat.quantity) : (mat.quantity || 1);
      const unitCost = typeof mat.unitCost === 'number' ? mat.unitCost : parseFloat(mat.unitCost || 0);
      return sum + (quantity * unitCost);
    }, 0);
    
    estimatedCost = workStepsCost + materialsCost;
  }
  
  // Calculer TVA (20% par défaut)
  const tvaRate = 0.20;
  const totalHT = estimatedCost;
  const tva = totalHT * tvaRate;
  const totalTTC = totalHT + tva;

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
    <div className="quote-display bg-white text-black p-4 md:p-6 lg:p-8 max-w-4xl mx-auto" id="quote-to-export">
      {/* Numéro de devis en haut */}
      {quoteNumber && (
        <div className="mb-4 text-right text-sm text-gray-600">
          <strong>N° de devis :</strong> {quoteNumber}
        </div>
      )}
      
      {/* En-tête avec logo et informations entreprise */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-300">
        <div className="flex-1">
          {companyInfo?.company_logo_url && (
            <img 
              src={companyInfo.company_logo_url} 
              alt="Logo" 
              className="h-16 mb-4 object-contain"
            />
          )}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{companyInfo?.company_name || 'Nom de l\'entreprise'}</h1>
            {companyInfo?.legal_form && (
              <p className="text-sm text-gray-600">{companyInfo.legal_form}</p>
            )}
            {companyAddress && (
              <p className="text-sm text-gray-600">{companyAddress}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
              {companyInfo?.siret && (
                <span>SIRET: {companyInfo.siret}</span>
              )}
              {companyInfo?.vat_number && (
                <span>TVA: {companyInfo.vat_number}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
              {companyInfo?.phone && (
                <span>Tél: {companyInfo.phone}</span>
              )}
              {companyInfo?.email && (
                <span>Email: {companyInfo.email}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold mb-2">DEVIS</h2>
          {quoteNumber && (
            <p className="text-sm text-gray-600">N° {quoteNumber}</p>
          )}
          <p className="text-sm text-gray-600 mt-2">
            Date: {formatDate(quoteDate)}
          </p>
        </div>
      </div>

      {/* Informations client */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          Client
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-semibold text-lg">{clientInfo.name}</p>
          {clientAddress && (
            <p className="text-sm text-gray-600 mt-1">
              <MapPin className="h-4 w-4 inline mr-1" />
              {clientAddress}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
            {clientInfo.email && (
              <span>Email: {clientInfo.email}</span>
            )}
            {clientInfo.phone && (
              <span>Tél: {clientInfo.phone}</span>
            )}
          </div>
        </div>
      </div>

      {/* Description des travaux */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Description des prestations
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <p><strong>Type de travaux:</strong> {workType}</p>
          <p><strong>Surface:</strong> {surface} m²</p>
          {region && (
            <p><strong>Région:</strong> {region}</p>
          )}
          {result.estimatedDuration && (
            <p><strong>Durée estimée:</strong> {result.estimatedDuration}</p>
          )}
        </div>
      </div>

      {/* Détail des prestations */}
      {result.workSteps && result.workSteps.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Détail des prestations</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left">Désignation</th>
                <th className="border border-gray-300 p-3 text-right">Prix HT</th>
              </tr>
            </thead>
            <tbody>
              {result.workSteps.map((step: any, idx: number) => {
                const stepCost = typeof step.cost === 'number' ? step.cost : parseFloat(step.cost || 0);
                return (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-3">
                      <div>
                        <p className="font-medium">{step.step || `Étape ${idx + 1}`}</p>
                        {step.description && (
                          <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 p-3 text-right">
                      {stepCost.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Matériaux */}
      {result.materials && result.materials.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Matériaux nécessaires</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left">Désignation</th>
                <th className="border border-gray-300 p-3 text-center">Quantité</th>
                <th className="border border-gray-300 p-3 text-right">Prix unitaire HT</th>
              </tr>
            </thead>
            <tbody>
              {result.materials.map((mat: any, idx: number) => {
                const unitCost = typeof mat.unitCost === 'number' ? mat.unitCost : parseFloat(mat.unitCost || 0);
                return (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-3">{mat.name || 'Matériau'}</td>
                    <td className="border border-gray-300 p-3 text-center">{mat.quantity || 'Non spécifiée'}</td>
                    <td className="border border-gray-300 p-3 text-right">
                      {unitCost.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Totaux */}
      <div className="mb-8">
        <div className="flex justify-end">
          <div className="w-80">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-3 text-right font-semibold">Total HT</td>
                  <td className="border border-gray-300 p-3 text-right">
                    {totalHT.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} €
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 text-right">TVA (20%)</td>
                  <td className="border border-gray-300 p-3 text-right">
                    {tva.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} €
                  </td>
                </tr>
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-gray-300 p-3 text-right">Total TTC</td>
                  <td className="border border-gray-300 p-3 text-right">
                    {totalTTC.toLocaleString('fr-FR', {
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

      {/* Recommandations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Recommandations
          </h3>
          <ul className="space-y-2">
            {result.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conditions générales */}
      {companyInfo?.terms_and_conditions && (
        <div className="mb-8 pt-6 border-t-2 border-gray-300">
          <h3 className="text-lg font-semibold mb-4">Conditions générales de vente</h3>
          <div className="text-sm text-gray-700 whitespace-pre-line">
            {companyInfo.terms_and_conditions}
          </div>
        </div>
      )}

      {/* Signature */}
      <div className="mt-12 pt-6 border-t-2 border-gray-300">
        <div className="flex justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-4">
              Devis reçu avant exécution des travaux, bon pour accord
            </p>
            {signatureData ? (
              <div className="mt-8">
                <div className="mb-2">
                  <img 
                    src={signatureData} 
                    alt="Signature" 
                    className="max-w-xs h-20 object-contain"
                  />
                </div>
                {signedBy && (
                  <p className="text-sm text-gray-700 font-medium">
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
              <div className="mt-16">
                <p className="text-sm text-gray-600 border-t border-gray-300 pt-2 w-64">
                  Signature et date
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Validité du devis : 30 jours à compter de la date d'émission
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

