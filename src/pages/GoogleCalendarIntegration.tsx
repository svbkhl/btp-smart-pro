// ============================================================================
// 🔗 PAGE INTÉGRATION GOOGLE CALENDAR
// ============================================================================
// Route: /settings/integrations/google
// Gère les redirections OAuth depuis google-calendar-callback
// ============================================================================

import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { GoogleCalendarConnection } from "@/components/GoogleCalendarConnection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useExchangeGoogleCode } from "@/hooks/useGoogleCalendar";
import { useAuth } from "@/hooks/useAuth";

export const GoogleCalendarIntegration = () => {
  const { currentCompanyId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const exchangeCode = useExchangeGoogleCode();

  const status = searchParams.get("status");
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const state = searchParams.get("state");

  // Log pour debugging
  useEffect(() => {
    console.log("🔍 GoogleCalendarIntegration mounted");
    console.log("🔍 currentCompanyId:", currentCompanyId);
    console.log("🔍 status:", status);
    console.log("🔍 code:", code ? "present" : "missing");
    console.log("🔍 error:", error);
  }, [currentCompanyId, status, code, error]);

  // Gérer le callback OAuth
  useEffect(() => {
    // Si pas de company_id, afficher une erreur
    if (status === "success" && code && !currentCompanyId) {
      toast({
        title: "❌ Erreur de connexion",
        description: "Company ID manquant. Veuillez vous assurer d'être connecté à une entreprise.",
        variant: "destructive",
      });
      setSearchParams({});
      return;
    }

    if (status === "success" && code && currentCompanyId) {
      // Échanger le code contre des tokens
      exchangeCode.mutate(
        { code, state: state || "" },
        {
          onSuccess: () => {
            toast({
              title: "✅ Connexion réussie",
              description: "Google Calendar a été connecté avec succès",
            });
            
            // Nettoyer l'URL
            setSearchParams({});
          },
          onError: (error: any) => {
            console.error("❌ Erreur lors de l'échange du code:", error);
            toast({
              title: "❌ Erreur de connexion",
              description: error.message || "Impossible de finaliser la connexion Google Calendar",
              variant: "destructive",
            });
            
            // Nettoyer l'URL
            setSearchParams({});
          },
        }
      );
    } else if (status === "error") {
      // Afficher l'erreur
      toast({
        title: "❌ Erreur de connexion",
        description: errorDescription 
          ? decodeURIComponent(errorDescription)
          : error || "Une erreur est survenue lors de la connexion Google Calendar",
        variant: "destructive",
      });
      
      // Nettoyer l'URL
      setSearchParams({});
    }
  }, [status, code, error, errorDescription, state, currentCompanyId, exchangeCode, toast, setSearchParams]);

  // Afficher un loader pendant l'échange du code
  if (status === "success" && code && exchangeCode.isPending) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Finalisation de la connexion Google Calendar...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Intégration Google Calendar</CardTitle>
          </div>
          <CardDescription>
            Connectez votre compte Google Calendar pour synchroniser automatiquement vos événements et plannings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleCalendarConnection />
        </CardContent>
      </Card>

      {/* Afficher un message de succès si la connexion vient d'être établie */}
      {status === "success" && !code && !exchangeCode.isPending && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">
                Google Calendar connecté avec succès
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Afficher un message d'erreur si une erreur est survenue */}
      {status === "error" && !exchangeCode.isPending && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <p className="text-sm font-medium">
                Erreur lors de la connexion Google Calendar
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
