import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon } from "lucide-react";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { StripeSettings } from "@/components/settings/StripeSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useExchangeGoogleCode } from "@/hooks/useGoogleCalendar";
import { Building2, FileText, CreditCard, Mail, Shield, Bell, Users, UserPlus, Play, UserCog, Settings as SettingsIcon2, Calendar } from "lucide-react";
import { LegalPagesContent } from "@/components/settings/LegalPagesSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DemoModeSettings } from "@/components/settings/DemoModeSettings";
import { AdminCompanySettings } from "@/components/settings/AdminCompanySettings";
import { GoogleCalendarConnection } from "@/components/GoogleCalendarConnection";
import AdminCompanies from "@/pages/AdminCompanies";
import AdminContactRequests from "@/pages/AdminContactRequests";
import DelegationsManagement from "@/pages/DelegationsManagement";
import RolesManagement from "@/pages/RolesManagement";
import UsersManagementRBAC from "@/pages/UsersManagementRBAC";
import { usePermissions } from "@/hooks/usePermissions";
import { useFakeDataStore } from "@/store/useFakeDataStore";

const Settings = () => {
  const { user, isAdmin, userRole, currentCompanyId } = useAuth();
  const { isOwner, can } = usePermissions();
  const { fakeDataEnabled } = useFakeDataStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const exchangeCode = useExchangeGoogleCode();
  
  // Ref pour éviter les appels multiples
  const hasProcessedOAuth = useRef(false);
  const oauthCodeRef = useRef<string | null>(null);
  
  // Lire le paramètre tab de l'URL (contrôlé pour que ?tab=notifications ouvre le bon onglet)
  const tabFromUrl = searchParams.get("tab");
  const activeTab = tabFromUrl || "company";
  const setActiveTab = (value: string) => setSearchParams({ tab: value }, { replace: true });
  
  // Gérer le callback Google Calendar OAuth
  const googleCalendarStatus = searchParams.get("google_calendar_status");
  const googleCalendarCode = searchParams.get("code");
  const googleCalendarError = searchParams.get("error");
  const googleCalendarState = searchParams.get("state");
  
  // Décoder le state pour récupérer company_id si disponible
  let companyIdFromState: string | null = null;
  if (googleCalendarState) {
    try {
      const decodedState = JSON.parse(atob(googleCalendarState));
      companyIdFromState = decodedState.company_id || null;
    } catch (e) {
      console.warn("⚠️ Could not decode state:", e);
    }
  }
  
  // Utiliser company_id du state si currentCompanyId n'est pas disponible
  const effectiveCompanyId = currentCompanyId || companyIdFromState;
  
  // Gérer le callback OAuth Google Calendar (une seule fois)
  useEffect(() => {
    // Si pas de paramètres OAuth dans l'URL, ne rien faire
    if (!googleCalendarCode && !googleCalendarStatus && !googleCalendarError) {
      return;
    }
    
    // Créer une clé unique pour cette tentative OAuth
    const oauthKey = `${googleCalendarCode || ''}-${googleCalendarStatus || ''}-${googleCalendarError || ''}`;
    
    // Si cette tentative a déjà été traitée, ne rien faire
    if (hasProcessedOAuth.current === oauthKey) {
      return;
    }
    
    // Si en cours de traitement, ne rien faire
    if (exchangeCode.isPending) {
      return;
    }
    
    // Marquer cette tentative comme traitée IMMÉDIATEMENT
    hasProcessedOAuth.current = oauthKey;
    
    // Nettoyer l'URL immédiatement pour éviter les re-déclenchements
    const newParams = new URLSearchParams();
    newParams.set("tab", "integrations");
    setSearchParams(newParams, { replace: true });
    
    // Traiter le callback
    if (googleCalendarStatus === "success" && googleCalendarCode && effectiveCompanyId) {
      // Échanger le code contre des tokens
      exchangeCode.mutate(
        { code: googleCalendarCode, state: googleCalendarState || "", companyId: effectiveCompanyId },
        {
          onSuccess: () => {
            toast({
              title: "✅ Connexion réussie",
              description: "Google Calendar a été connecté avec succès",
            });
          },
          onError: (error: any) => {
            console.error("❌ Erreur lors de l'échange du code:", error);
            console.error("❌ Détails de l'erreur:", {
              message: error.message,
              context: error.context,
              status: error.status,
              data: error.data
            });
            
            // Extraire le message d'erreur détaillé
            let errorMessage = error.message || "Impossible de finaliser la connexion Google Calendar";
            if (error.data?.message) {
              errorMessage = error.data.message;
            } else if (error.data?.google_error_description) {
              errorMessage = error.data.google_error_description;
            } else if (error.data?.error) {
              errorMessage = error.data.error;
            }
            
            toast({
              title: "❌ Erreur de connexion",
              description: errorMessage,
              variant: "destructive",
            });
          },
        }
      );
    } else if (googleCalendarStatus === "success" && googleCalendarCode && !effectiveCompanyId) {
      // Company ID manquant même après décodage du state
      toast({
        title: "❌ Erreur de connexion",
        description: "Company ID manquant. Veuillez vous assurer d'être connecté à une entreprise.",
        variant: "destructive",
      });
    } else if (googleCalendarStatus === "error" || googleCalendarError) {
      // Afficher l'erreur
      toast({
        title: "❌ Erreur de connexion",
        description: googleCalendarError || "Une erreur est survenue lors de la connexion Google Calendar",
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleCalendarCode]); // Dépendre uniquement du code pour éviter les re-déclenchements
  
  // Compter le nombre d'onglets (ajuster selon si admin)
  const isAdministrator = userRole === 'admin' || isAdmin;
  const canManageDelegations = isOwner || can("delegations.manage");
  
  // Ajuster le nombre de colonnes selon les onglets
  // company, companies, contact-requests, users, roles, delegations (si permis), admin-company, demo (si admin), stripe, integrations, notifications, security
  const tabCount = isAdministrator 
    ? (canManageDelegations ? 13 : 12) // +1 si delegations
    : isAdmin
    ? (canManageDelegations ? 10 : 9) // +1 si delegations
    : 6; // company, stripe, integrations, notifications, security

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Si on est en mode démo, rediriger vers le formulaire d'essai
    if (fakeDataEnabled) {
      navigate("/?openTrialForm=true");
    } else {
      navigate("/auth");
    }
  };

  return (
    <PageLayout>
      <div className="p-4 sm:p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            Paramètres
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gérez vos préférences, votre compte et les configurations de l'application
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full gap-1 sm:gap-2 mb-4 sm:mb-6 h-auto grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            <TabsTrigger value="company" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Entreprise</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Employés</span>
            </TabsTrigger>
            {(isAdmin || isAdministrator) && (
              <>
                <TabsTrigger value="companies" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Gestion Entreprises</span>
                </TabsTrigger>
                <TabsTrigger value="contact-requests" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Demandes de contact</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <UserCog className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Utilisateurs</span>
                </TabsTrigger>
                <TabsTrigger value="roles" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Rôles</span>
                </TabsTrigger>
                {canManageDelegations && (
                  <TabsTrigger value="delegations" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                    <UserCog className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">Délégations</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="admin-company" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <SettingsIcon2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Config Entreprises</span>
                </TabsTrigger>
              </>
            )}
            {isAdministrator && (
              <TabsTrigger value="demo" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                <Play className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Mode démo</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="stripe" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Paiements</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Intégrations</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="legal" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">RGPD, Mentions légales, CGU</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-0">
            <CompanySettings />
          </TabsContent>

          <TabsContent value="employees" className="mt-0">
            <div className="[&_div]:!p-0 [&_main]:!p-0">
              <UsersManagementRBAC embedded />
            </div>
          </TabsContent>

          {(isAdmin || isAdministrator) && (
            <>
              <TabsContent value="companies" className="mt-0">
                <AdminCompanies />
              </TabsContent>
              <TabsContent value="contact-requests" className="mt-0">
                <AdminContactRequests />
              </TabsContent>
              <TabsContent value="users" className="mt-0">
                <div className="[&_div]:!p-0 [&_main]:!p-0">
                  <UsersManagementRBAC />
                </div>
              </TabsContent>
              <TabsContent value="roles" className="mt-0">
                <div className="[&_div]:!p-0 [&_main]:!p-0">
                  <RolesManagement />
                </div>
              </TabsContent>
              {canManageDelegations && (
                <TabsContent value="delegations" className="mt-0">
                  <DelegationsManagement />
                </TabsContent>
              )}
              <TabsContent value="admin-company" className="mt-0">
                <AdminCompanySettings />
              </TabsContent>
            </>
          )}

          {isAdministrator && (
            <TabsContent value="demo" className="mt-0">
              <DemoModeSettings />
            </TabsContent>
          )}

          <TabsContent value="stripe" className="mt-0">
            <StripeSettings />
          </TabsContent>

          <TabsContent value="integrations" className="mt-0">
            <div className="space-y-6">
              <GoogleCalendarConnection />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="legal" className="mt-0">
            <LegalPagesContent />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Settings;

