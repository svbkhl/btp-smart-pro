// ============================================================================
// 🔗 COMPOSANT CONNEXION GOOGLE CALENDAR
// ============================================================================

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useGoogleCalendarConnection, 
  useGetGoogleAuthUrl, 
  useExchangeGoogleCode,
  useDisconnectGoogleCalendar 
} from "@/hooks/useGoogleCalendar";
import { 
  useCanConnectGoogleCalendar,
  useCanManageGoogleCalendarSettings 
} from "@/hooks/useGoogleCalendarRoles";
import { Calendar, CheckCircle2, XCircle, Loader2, ExternalLink, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export const GoogleCalendarConnection = () => {
  const { currentCompanyId } = useAuth();
  const { isOwner } = usePermissions();
  const canConnect = useCanConnectGoogleCalendar();
  const canManage = useCanManageGoogleCalendarSettings();
  const { data: connection, isLoading } = useGoogleCalendarConnection();
  const getAuthUrl = useGetGoogleAuthUrl();
  const exchangeCode = useExchangeGoogleCode();
  const disconnect = useDisconnectGoogleCalendar();

  // Le callback OAuth est maintenant géré par la page GoogleCalendarIntegration
  // Ce composant ne gère plus la redirection

  const handleConnect = async () => {
    try {
      // Appeler google-calendar-oauth et rediriger vers data.url
      const authUrl = await getAuthUrl.mutateAsync();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!connection?.id) return;

    if (confirm("Êtes-vous sûr de vouloir déconnecter Google Calendar ?")) {
      try {
        await disconnect.mutateAsync(connection.id);
      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
      }
    }
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
            <Calendar className="h-5 w-5" />
            <CardTitle>Google Calendar</CardTitle>
          </div>
          {connection && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connecté
            </Badge>
          )}
        </div>
        <CardDescription>
          {canConnect 
            ? "Connectez Google Calendar pour synchroniser les événements et plannings de l'entreprise"
            : "Seul le propriétaire de l'entreprise peut connecter Google Calendar"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connection ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Compte Google :</span>
                <span className="text-sm font-medium">{connection.google_email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Calendrier :</span>
                <span className="text-sm font-medium">{connection.calendar_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Synchronisation :</span>
                <Badge variant="outline">
                  {connection.sync_direction === "app_to_google" && "App → Google"}
                  {connection.sync_direction === "bidirectional" && "Bidirectionnelle"}
                  {connection.sync_direction === "google_to_app" && "Google → App"}
                </Badge>
              </div>
              {connection.last_sync_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dernière sync :</span>
                  <span className="text-sm font-medium">
                    {new Date(connection.last_sync_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnect.isPending || !canManage}
                className="flex-1"
              >
                {disconnect.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Déconnexion...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Déconnecter
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("https://calendar.google.com", "_blank")}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir Google Calendar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isOwner ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Connectez Google Calendar pour créer un calendrier dédié à votre entreprise.
                  Les événements et plannings seront automatiquement synchronisés.
                </p>
                <Button
                  onClick={handleConnect}
                  disabled={getAuthUrl.isPending || isConnecting}
                  className="w-full"
                >
                  {getAuthUrl.isPending || isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Connecter Google Calendar
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <Crown className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Seul le propriétaire de l'entreprise peut connecter Google Calendar.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
