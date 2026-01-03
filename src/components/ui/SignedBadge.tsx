/**
 * Badge "Signé" réutilisable pour afficher le statut de signature
 */

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SignedBadgeProps {
  signed: boolean;
  signedAt?: string | null;
  signedBy?: string | null;
  signatureIp?: string | null;
  showTooltip?: boolean;
  variant?: "default" | "outline" | "secondary";
}

export default function SignedBadge({
  signed,
  signedAt,
  signedBy,
  signatureIp,
  showTooltip = true,
  variant = "default",
}: SignedBadgeProps) {
  const badge = signed ? (
    <Badge 
      variant={variant} 
      className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
    >
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Signé
    </Badge>
  ) : (
    <Badge 
      variant="outline" 
      className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
    >
      <Clock className="h-3 w-3 mr-1" />
      En attente
    </Badge>
  );

  if (!showTooltip || !signed) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">✅ Signature électronique</p>
            {signedAt && (
              <p className="text-xs">
                <strong>Date:</strong> {new Date(signedAt).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            )}
            {signedBy && (
              <p className="text-xs">
                <strong>Signataire:</strong> {signedBy}
              </p>
            )}
            {signatureIp && (
              <p className="text-xs font-mono">
                <strong>IP:</strong> {signatureIp}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
