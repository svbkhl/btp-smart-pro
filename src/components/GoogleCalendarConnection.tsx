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
import { Calendar, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const GoogleCalendarConnection = () => {
  const { currentCompanyId } = useAuth();
  const { data: connection, isLoading } = useGoogleCalendarConnection();
  const getAuthUrl = useGetGoogleAuthUrl();
  const exchangeCode = useExchangeGoogleCode();
  const disconnect = useDisconnectGoogleCalendar();

  const [isConnecting, setIsConnecting] = useState(false);

  // Gérer le callback OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code && state && !isConnecting) {
      setIsConnecting(true);
      
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData.company_id === currentCompanyId) {
          exchangeCode.mutate(code, {
            onSuccess: () => {
              // Nettoyer l'URL
              window.history.replaceState({}, document.title, window.location.pathname);
              setIsConnecting(false);
            },
            onError: (error) => {
              console.error("Erreur lors de l'échange du code:", error);
              setIsConnecting(false);
            },
          });
        }
      } catch (error) {
        console.error("Erreur lors du parsing du state:", error);
        setIsConnecting(false);
      }
    }
  }, [code, state, currentCompanyId, exchangeCode, isConnecting]);

  const handleConnect = async () => {
    try {
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
          Synchronisez vos événements avec votre calendrier Google personnel
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
                disabled={disconnect.isPending}
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
            <p className="text-sm text-muted-foreground">
              Connectez votre compte Google Calendar pour synchroniser automatiquement vos événements.
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
