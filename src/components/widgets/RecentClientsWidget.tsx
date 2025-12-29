import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useClientsData } from "@/lib/data/orchestrator";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Widget affichant les derniers clients ajoutés
 * Se met à jour automatiquement toutes les 60s
 */
export const RecentClientsWidget = () => {
  const { data: clients, recentClients, isLoading, error } = useClientsData();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-muted-foreground text-sm">
          Erreur de chargement des clients
        </div>
      </GlassCard>
    );
  }

  const displayClients = recentClients.slice(0, 5);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Derniers clients
          </h3>
        </div>
        <Link to="/clients">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {displayClients.length > 0 ? (
        <div className="space-y-3">
          {displayClients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/clients/${client.id}`} className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/20 dark:border-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all group">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                      {client.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {client.name}
                      </p>
                      <Badge
                        variant={
                          client.status === "actif"
                            ? "default"
                            : client.status === "VIP"
                            ? "secondary"
                            : "outline"
                        }
                        className="rounded-lg text-xs"
                      >
                        {client.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {client.email && (
                        <span className="truncate">{client.email}</span>
                      )}
                      {client.created_at && (
                        <span>
                          {format(new Date(client.created_at), "dd MMM", {
                            locale: fr,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Aucun client récent</p>
          <Link to="/clients">
            <Button variant="outline" size="sm" className="mt-2 rounded-xl">
              Ajouter un client
            </Button>
          </Link>
        </div>
      )}
    </GlassCard>
  );
};














