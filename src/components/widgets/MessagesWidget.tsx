import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useMessagesData } from "@/lib/data/orchestrator";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Widget affichant les notifications et messages
 * Se met à jour automatiquement toutes les 30s
 */
export const MessagesWidget = () => {
  const {
    notifications,
    conversations,
    unreadCount,
    recentNotifications,
    isLoading,
    error,
  } = useMessagesData();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-muted-foreground text-sm">
          Erreur de chargement des messages
        </div>
      </GlassCard>
    );
  }

  const hasUnread = unreadCount > 0;
  const displayItems = recentNotifications.slice(0, 3);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Notifications
          </h3>
          {hasUnread && (
            <Badge
              variant="destructive"
              className="rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </div>
        <Link to="/mailbox">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {displayItems.length > 0 ? (
        <div className="space-y-2">
          {displayItems.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  notification.is_read
                    ? "border-white/20 dark:border-gray-700/30 bg-transparent"
                    : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium truncate ${
                        notification.is_read
                          ? "text-foreground"
                          : "text-foreground font-semibold"
                      }`}
                    >
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  {notification.created_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(notification.created_at), "dd MMM à HH:mm", {
                        locale: fr,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune notification</p>
        </div>
      )}
    </GlassCard>
  );
};

