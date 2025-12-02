import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Users, Loader2, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export const UserManagementSettings = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Gestion des utilisateurs</h2>
          </div>
          <p className="text-muted-foreground">
            Cette section est réservée aux administrateurs.
          </p>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Gestion des utilisateurs</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Gérez les rôles, accès et permissions des utilisateurs
        </p>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
            <h3 className="font-semibold mb-2">Gestion des employés</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez et gérez les comptes employés, assignez les rôles et permissions
            </p>
            <Link to="/admin/employees">
              <Button className="gap-2 rounded-xl">
                <Users className="h-4 w-4" />
                Gérer les employés
              </Button>
            </Link>
          </div>

          <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
            <h3 className="font-semibold mb-2">Rôles et permissions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configurez les rôles (dirigeant, salarié, administrateur) et leurs permissions
            </p>
            <p className="text-xs text-muted-foreground">
              Fonctionnalité en cours de développement
            </p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};






