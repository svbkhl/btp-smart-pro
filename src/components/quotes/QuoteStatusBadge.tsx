/**
 * Badge de statut professionnel pour les devis
 * Affiche : Brouillon, Envoyé, Signé, Payé, etc.
 */

import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  DollarSign, 
  Clock,
  AlertCircle,
  Ban
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type QuoteStatus = 
  | 'draft' 
  | 'sent' 
  | 'signed' 
  | 'paid' 
  | 'partially_paid' 
  | 'expired'
  | 'cancelled';

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  signedAt?: string | null;
  showTooltip?: boolean;
  className?: string;
}

const statusConfig = {
  draft: {
    label: 'Brouillon',
    icon: FileText,
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
    tooltip: 'Devis en cours de rédaction',
  },
  sent: {
    label: 'Envoyé',
    icon: Send,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    tooltip: 'Devis envoyé au client, en attente de signature',
  },
  signed: {
    label: 'Signé',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
    tooltip: 'Devis signé électroniquement, en attente de paiement',
  },
  paid: {
    label: 'Payé',
    icon: DollarSign,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
    tooltip: 'Paiement reçu intégralement',
  },
  partially_paid: {
    label: 'Partiellement payé',
    icon: DollarSign,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    tooltip: 'Acompte reçu, solde en attente',
  },
  expired: {
    label: 'Expiré',
    icon: Clock,
    className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
    tooltip: 'Devis expiré',
  },
  cancelled: {
    label: 'Annulé',
    icon: Ban,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    tooltip: 'Devis annulé',
  },
};

export default function QuoteStatusBadge({
  status,
  signedAt,
  showTooltip = true,
  className = '',
}: QuoteStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  const badge = (
    <Badge 
      variant="outline" 
      className={`${config.className} ${className} gap-1.5 font-medium`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
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
            <p className="font-semibold text-sm">{config.tooltip}</p>
            {signedAt && status === 'signed' && (
              <p className="text-xs text-muted-foreground">
                Signé le {new Date(signedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}



