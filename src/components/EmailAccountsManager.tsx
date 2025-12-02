import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Plus, Trash2, CheckCircle2, XCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConnectWithEmail } from "@/components/ConnectWithEmail";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface EmailAccount {
  id: string;
  type: "gmail" | "outlook" | "smtp";
  email: string;
  status: "connected" | "disconnected";
}

export const EmailAccountsManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Charger les comptes email depuis user_email_settings
  const { data: emailSettings, isLoading } = useQuery({
    queryKey: ["user_email_settings", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_email_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Pas de configuration email
          return null;
        }
        console.error("Erreur chargement email settings:", error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });

  // Convertir les email_settings en accounts
  const accounts: EmailAccount[] = emailSettings
    ? [
        {
          id: emailSettings.id || "default",
          type: (emailSettings.provider === "gmail" || emailSettings.provider === "outlook"
            ? emailSettings.provider
            : "smtp") as "gmail" | "outlook" | "smtp",
          email: emailSettings.from_email || emailSettings.smtp_user || "Non configuré",
          status: "connected" as const,
        },
      ]
    : [];

  const handleAddAccount = () => {
    setShowAddDialog(true);
  };

  const handleRemoveAccount = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_email_settings")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      // Invalider le cache pour recharger
      queryClient.invalidateQueries({ queryKey: ["user_email_settings", user.id] });
      
      toast({
        title: "Compte supprimé",
        description: "Le compte email a été supprimé avec succès.",
      });
    } catch (error: any) {
      console.error("Erreur suppression compte email:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le compte email",
        variant: "destructive",
      });
    }
  };

  // Fermer le dialog après une configuration réussie
  const handleDialogClose = (open: boolean) => {
    setShowAddDialog(open);
    // Recharger les comptes quand le dialog se ferme
    if (!open && user) {
      queryClient.invalidateQueries({ queryKey: ["user_email_settings", user.id] });
    }
  };

  const getStatusBadge = (status: EmailAccount["status"]) => {
    if (status === "connected") {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Connecté
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3 w-3" />
        Déconnecté
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Comptes email configurés</h3>
        <Button
          onClick={handleAddAccount}
          size="sm"
          className="gap-2 rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Ajouter un compte
        </Button>
      </div>

      <AnimatePresence>
        {accounts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 text-center rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50"
          >
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun compte email configuré
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{account.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(account.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAccount(account.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Dialog pour ajouter un compte */}
      <Dialog open={showAddDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Ajouter un compte email
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ConnectWithEmail />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


