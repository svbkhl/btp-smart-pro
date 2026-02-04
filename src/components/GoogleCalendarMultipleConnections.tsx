// ============================================================================
// 📅 COMPOSANT MULTIPLE CALENDRIERS GOOGLE
// ============================================================================
// Affiche et gère les 3 calendriers Google : Planning, Agenda, Événements
// ============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useGoogleCalendarConnectionByType,
  useGetGoogleAuthUrl, 
  useDisconnectGoogleCalendar 
} from "@/hooks/useGoogleCalendar";
import { useSyncAllPlanningsWithGoogle } from "@/hooks/usePlanningSync";
import { 
  useCanConnectGoogleCalendar,
  useCanManageGoogleCalendarSettings 
} from "@/hooks/useGoogleCalendarRoles";
import { Calendar, CheckCircle2, XCircle, Loader2, ExternalLink, Users, CalendarDays, CalendarClock, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type CalendarType = "planning" | "agenda" | "events";

interface CalendarCardProps {
  type: CalendarType;
  icon: React.ReactNode;
  title: string;
  description: string;
  calendarUrl?: string;
}

const CalendarCard = ({ type, icon, title, description, calendarUrl }: CalendarCardProps) => {
  const { data: connection, isLoading } = useGoogleCalendarConnectionByType(type);
  const getAuthUrl = useGetGoogleAuthUrl(type);
  const disconnect = useDisconnectGoogleCalendar();
  const syncAllPlannings = useSyncAllPlanningsWithGoogle();
  const canConnect = useCanConnectGoogleCalendar();
  const canManage = useCanManageGoogleCalendarSettings();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const authUrl = await getAuthUrl.mutateAsync();
      if (typeof window !== "undefined") {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error(`Erreur lors de la connexion ${type}:`, error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection?.id) return;

    if (confirm(`Êtes-vous sûr de vouloir déconnecter le calendrier ${title} ?`)) {
      try {
        await disconnect.mutateAsync(connection.id);
      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
      }
    }
  };

  const handleOpenCalendar = () => {
    const url = calendarUrl || "https://calendar.google.com";
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {connection && connection.enabled && (
            <Badge 
              variant="outline" 
              className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connecté
            </Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {connection && connection.enabled ? (
          <div className="space-y-4">
            {/* Informations de connexion */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Calendrier {title} connecté
                </p>
              </div>
              <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                <p>📧 {connection.google_email}</p>
                <p>📅 {connection.calendar_name || connection.calendar_id}</p>
                {connection.last_sync_at && (
                  <p>🔄 Dernière sync : {new Date(connection.last_sync_at).toLocaleString("fr-FR")}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {type === "planning" && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const result = await syncAllPlannings.mutateAsync();
                      const data = result as { created?: number; updated?: number; total?: number; errors?: number } | undefined;
                      const created = data?.created ?? 0;
                      const updated = data?.updated ?? 0;
                      const total = data?.total ?? 0;
                      toast({
                        title: "Google Calendar mis à jour",
                        description: total === 0
                          ? "Aucun planning à synchroniser. Créez des affectations dans Planning."
                          : `${created + updated} événement(s) envoyé(s) dans Google (${created} créé(s), ${updated} mis à jour).`,
                      });
                    } catch (e) {
                      toast({
                        title: "Erreur de synchronisation",
                        description: (e as Error)?.message || "Impossible de mettre à jour Google Calendar. Vérifiez la connexion Planning.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={syncAllPlannings.isPending || !canManage}
                  size="sm"
                  className="w-full"
                >
                  {syncAllPlannings.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Mettre à jour dans Google
                    </>
                  )}
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnect.isPending || !canManage}
                  className="flex-1"
                  size="sm"
                >
                  {disconnect.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Déconnexion...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-2" />
                      Déconnecter
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenCalendar}
                  className="flex-1"
                  size="sm"
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Ouvrir
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {canConnect 
                ? `Connectez le calendrier ${title} pour synchroniser automatiquement`
                : "Réservé au propriétaire ou à l'administrateur de l'entreprise"
              }
            </p>
            <Button
              onClick={handleConnect}
              disabled={!canConnect || getAuthUrl.isPending || isConnecting}
              className="w-full"
              size="sm"
            >
              {getAuthUrl.isPending || isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Connecter {title}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const GoogleCalendarMultipleConnections = () => {
  return (
    <div className="space-y-4">
      {/* Titre principal */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Intégration Google Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Connectez vos calendriers Google pour synchroniser automatiquement vos plannings, agendas et événements
        </p>
      </div>

      {/* Grille des 3 calendriers */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Calendrier Planning */}
        <CalendarCard
          type="planning"
          icon={<Users className="h-5 w-5 text-blue-600" />}
          title="Planning"
          description="Affectations et plannings des employés"
        />

        {/* Calendrier Agenda */}
        <CalendarCard
          type="agenda"
          icon={<CalendarDays className="h-5 w-5 text-purple-600" />}
          title="Agenda"
          description="Événements généraux de l'entreprise"
        />

        {/* Calendrier Événements */}
        <CalendarCard
          type="events"
          icon={<CalendarClock className="h-5 w-5 text-orange-600" />}
          title="Événements"
          description="Réunions, deadlines et rappels"
        />
      </div>

      {/* Note informative */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 <strong>Astuce :</strong> Vous pouvez connecter chaque calendrier séparément pour une meilleure organisation.
            Chaque type de données sera synchronisé vers son propre calendrier Google.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
