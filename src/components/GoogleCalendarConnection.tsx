// ============================================================================
// 🔗 COMPOSANT CONNEXION GOOGLE CALENDAR
// ============================================================================

import { useState } from "react";
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
import { useCalendarFeedUrl } from "@/hooks/useCalendarFeedUrl";
import { Calendar, CheckCircle2, XCircle, Loader2, ExternalLink, Crown, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

function GoogleCalendarConnectionEmployee({
  hasConnection,
  navigate,
}: {
  hasConnection: boolean;
  navigate: (path: string) => void;
}) {
  const { feedUrl, isLoading, error } = useCalendarFeedUrl();
  const { toast } = useToast();

  const handleCopyUrl = () => {
    if (!feedUrl) return;
    navigator.clipboard.writeText(feedUrl);
    toast({
      title: "Lien copié",
      description: "Collez ce lien dans Google Calendar (Autres calendriers → Par URL)",
    });
  };

  const handleAddToGoogleCalendar = () => {
    if (!feedUrl) return;
    navigator.clipboard.writeText(feedUrl);
    window.open("https://calendar.google.com/calendar/u/0/r/settings/addbyurl", "_blank");
    toast({
      title: "Prêt pour Google Calendar",
      description: "Le lien a été copié. Collez-le (Ctrl+V) dans la page Google Calendar qui vient de s'ouvrir pour synchroniser votre planning.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Google Calendar</CardTitle>
          </div>
          {hasConnection && (
            <Badge
              variant="outline"
              className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Synchronisé
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasConnection
            ? "Le dirigeant a connecté Google Calendar. Ajoutez votre planning à votre Google Calendar personnel ci-dessous."
            : "Le dirigeant n'a pas encore connecté Google Calendar. Vous pouvez quand même ajouter votre planning à votre Google Calendar personnel."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 dark:bg-muted/20 border border-border space-y-4">
          <p className="text-sm text-muted-foreground">
            Votre planning est défini par le dirigeant. Consultez l'onglet <strong>Planning</strong> pour voir vos affectations, ou ajoutez-le directement dans Google Calendar :
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {feedUrl && (
              <Button
                variant="default"
                onClick={handleAddToGoogleCalendar}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ajouter mon planning à Google Calendar
              </Button>
            )}
            <Button
              variant={feedUrl ? "outline" : "default"}
              onClick={() => navigate("/my-planning")}
              className="w-full sm:w-auto"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Voir mon planning
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Impossible de générer le lien de synchronisation. Assurez-vous d&apos;être enregistré comme employé de l&apos;entreprise.
            </p>
          ) : isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du lien...
            </div>
          ) : feedUrl ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Lien de synchronisation (à ajouter dans Google Calendar → Autres calendriers → Par URL) :
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={feedUrl}
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopyUrl} title="Copier le lien">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export const GoogleCalendarConnection = () => {
  const { currentCompanyId } = useAuth();
  const { isOwner, isEmployee } = usePermissions();
  const navigate = useNavigate();
  const canConnect = useCanConnectGoogleCalendar();
  const canManage = useCanManageGoogleCalendarSettings();
  const { data: connection, isLoading } = useGoogleCalendarConnection();
  const getAuthUrl = useGetGoogleAuthUrl();
  const exchangeCode = useExchangeGoogleCode();
  const disconnect = useDisconnectGoogleCalendar();
  const [isConnecting, setIsConnecting] = useState(false);

  // Le callback OAuth est maintenant géré par la page GoogleCalendarIntegration
  // Ce composant ne gère plus la redirection

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      // Appeler google-calendar-oauth et rediriger vers data.url
      const authUrl = await getAuthUrl.mutateAsync();
      if (typeof window !== "undefined") {
        window.location.href = authUrl;
      }
      // Note: setIsConnecting(false) n'est pas appelé car on redirige vers Google
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      setIsConnecting(false);
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

  // Vue simplifiée pour les employés : statut de la sync et accès au planning
  if (isEmployee) {
    const hasConnection = connection && connection.enabled;
    return (
      <GoogleCalendarConnectionEmployee
        hasConnection={hasConnection}
        navigate={navigate}
      />
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
          {connection && connection.enabled && (
            <Badge 
              variant="outline" 
              className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connecté
            </Badge>
          )}
          {connection && !connection.enabled && (
            <Badge 
              variant="outline" 
              className="bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Désactivé
            </Badge>
          )}
        </div>
        <CardDescription>
          {connection && connection.enabled
            ? `Google Calendar connecté avec ${connection.google_email}`
            : connection && !connection.enabled
            ? `Google Calendar configuré avec ${connection.google_email} (désactivé)`
            : canConnect 
            ? "Connectez Google Calendar pour synchroniser les événements et plannings de l'entreprise"
            : "Seul le propriétaire ou l'administrateur de l'entreprise peut connecter Google Calendar"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connection && connection.enabled ? (
          <div className="space-y-4">
            {/* Message de succès bien visible */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Google Calendar connecté avec succès
                </p>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                Les événements et plannings seront automatiquement synchronisés avec Google Calendar.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Compte Google :</span>
                <span className="text-sm font-medium">{connection.google_email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Calendrier :</span>
                <span className="text-sm font-medium">{connection.calendar_name || connection.calendar_id}</span>
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
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open("https://calendar.google.com", "_blank");
                  }
                }}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir Google Calendar
              </Button>
            </div>
          </div>
        ) : connection && !connection.enabled ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ La connexion Google Calendar est configurée mais désactivée. 
                Reconnectez-vous pour l'activer.
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={getAuthUrl.isPending || isConnecting}
              className="w-full"
            >
              {getAuthUrl.isPending || isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reconnexion en cours...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Reconnecter Google Calendar
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connectez Google Calendar pour créer un calendrier dédié à votre entreprise.
              Les événements et plannings seront automatiquement synchronisés.
            </p>
            {!canConnect && !isOwner && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" />
                Réservé au dirigeant ou à l'administrateur de l'entreprise.
              </p>
            )}
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
