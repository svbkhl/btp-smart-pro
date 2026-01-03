/**
 * Section Paiement affichée après signature du devis
 * Permet de créer des liens de paiement Stripe (total, acompte, solde)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import CreatePaymentLinkDialog from "@/components/payments/CreatePaymentLinkDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface QuotePaymentSectionProps {
  quote: any;
  onPaymentLinkCreated?: () => void;
}

export default function QuotePaymentSection({ quote, onPaymentLinkCreated }: QuotePaymentSectionProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const totalAmount = quote.estimated_cost || quote.total_ttc || 0;

  // Charger l'historique des paiements
  useEffect(() => {
    loadPayments();
  }, [quote.id]);

  const loadPayments = async () => {
    try {
      setLoadingPayments(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const totalPaid = payments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const remainingAmount = totalAmount - totalPaid;
  const paymentPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const copyPaymentLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
    toast({
      title: "✅ Lien copié",
      description: "Le lien de paiement a été copié dans le presse-papier",
    });
  };

  // Ne pas afficher la section si le devis n'est pas signé
  if (!quote.signed) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Paiement</CardTitle>
              <CardDescription>
                Devis signé le {new Date(quote.signed_at).toLocaleDateString('fr-FR')}
              </CardDescription>
            </div>
          </div>
          
          {totalPaid >= totalAmount ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Payé intégralement</span>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Résumé financier */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Montant total</p>
            <p className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalAmount)}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Déjà payé</p>
            <p className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalPaid)}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Reste à payer</p>
            <p className="text-2xl font-bold text-orange-600">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(remainingAmount)}
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        {totalPaid > 0 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progression du paiement</span>
              <span className="font-semibold">{paymentPercentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                style={{ width: `${paymentPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions de paiement */}
        {remainingAmount > 0 ? (
          <div className="space-y-3">
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <strong>Prochaine étape :</strong> Créer un lien de paiement sécurisé et l'envoyer au client par email.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <CreatePaymentLinkDialog
                quote={quote}
                onSuccess={() => {
                  loadPayments();
                  if (onPaymentLinkCreated) onPaymentLinkCreated();
                }}
                trigger={
                  <Button className="flex-1 gap-2" size="lg">
                    <CreditCard className="h-4 w-4" />
                    Créer lien de paiement
                  </Button>
                }
              />
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Le lien sera copié automatiquement et envoyé par email au client
            </p>
          </div>
        ) : (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              ✅ <strong>Paiement complet reçu !</strong> Ce devis est entièrement payé.
            </AlertDescription>
          </Alert>
        )}

        {/* Historique des paiements */}
        {payments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Historique des paiements</h4>
            <div className="space-y-2">
              {loadingPayments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        payment.status === 'succeeded' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : payment.status === 'pending'
                          ? 'bg-orange-100 dark:bg-orange-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <DollarSign className={`h-4 w-4 ${
                          payment.status === 'succeeded' 
                            ? 'text-green-600' 
                            : payment.status === 'pending'
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(payment.amount || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        payment.status === 'succeeded' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : payment.status === 'pending'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {payment.status === 'succeeded' && '✓ Payé'}
                        {payment.status === 'pending' && '⏳ En attente'}
                        {payment.status === 'failed' && '✗ Échoué'}
                      </span>

                      {payment.stripe_checkout_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyPaymentLink(payment.stripe_checkout_url)}
                        >
                          {copiedLink === payment.stripe_checkout_url ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
