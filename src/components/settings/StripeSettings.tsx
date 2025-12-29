import { GlassCard } from "@/components/ui/GlassCard";
import { CreditCard, Loader2 } from "lucide-react";
import { ConnectWithStripe } from "@/components/ConnectWithStripe";
import { motion } from "framer-motion";

export const StripeSettings = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Paramètres Stripe</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Configurez votre compte Stripe pour accepter les paiements en ligne
        </p>

        <ConnectWithStripe />

        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-sm mb-2">À propos de Stripe Connect</h3>
          <p className="text-sm text-muted-foreground">
            Stripe Connect vous permet d'accepter les paiements directement sur votre compte bancaire.
            Les fonds sont transférés automatiquement après chaque transaction réussie.
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
};



















