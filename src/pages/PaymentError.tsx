import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { XCircle, Home, RefreshCw } from "lucide-react";

const PaymentError = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <GlassCard className="p-12 max-w-md w-full">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Paiement annulé</h1>
            <p className="text-muted-foreground">
              Votre paiement a été annulé. Aucun montant n'a été débité.
            </p>
          </div>

          <div className="w-full space-y-3 p-6 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground">
              Si vous rencontrez des difficultés, vous pouvez :
            </p>
            <ul className="text-sm text-muted-foreground text-left space-y-2 list-disc list-inside">
              <li>Vérifier vos informations de paiement</li>
              <li>Contacter votre banque</li>
              <li>Essayer à nouveau</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              <Home className="mr-2 h-4 w-4" />
              Accueil
            </Button>
            <Button
              onClick={() => navigate(-1)}
              className="flex-1 rounded-xl"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default PaymentError;

