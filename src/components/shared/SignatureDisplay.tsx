/**
 * Composant réutilisable pour afficher la signature du client avec la date
 * Utilisé dans les devis et factures
 */

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileSignature, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SignatureDisplayProps {
  signatureData?: string | null;
  signedBy?: string | null;
  signedAt?: string | null;
  title?: string;
  showImage?: boolean;
}

export const SignatureDisplay = ({
  signatureData,
  signedBy,
  signedAt,
  title = "Signature du client",
  showImage = true,
}: SignatureDisplayProps) => {
  if (!signatureData && !signedBy && !signedAt) {
    return null;
  }

  return (
    <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              {title}
            </h3>
          </div>

          {/* Image de la signature */}
          {showImage && signatureData && (
            <div className="bg-white dark:bg-gray-900 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 flex items-center justify-center min-h-[120px]">
              <img
                src={signatureData}
                alt="Signature du client"
                className="max-w-full max-h-[150px] object-contain"
                style={{ imageRendering: "high-quality" }}
              />
            </div>
          )}

          {/* Informations de signature */}
          <div className="space-y-2 text-sm">
            {signedBy && (
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Signé par:</span>
                <span className="font-medium">{signedBy}</span>
              </div>
            )}
            {signedAt && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Date de signature:</span>
                <span className="font-medium">
                  {format(new Date(signedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
