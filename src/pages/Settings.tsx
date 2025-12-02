import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon } from "lucide-react";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { StripeSettings } from "@/components/settings/StripeSettings";
import { PaymentProviderSettings } from "@/components/settings/PaymentProviderSettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, FileText, CreditCard, Mail, Shield, Bell, Users, Play } from "lucide-react";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DemoModeSettings } from "@/components/settings/DemoModeSettings";
import AdminCompanies from "@/pages/AdminCompanies";
import AdminContactRequests from "@/pages/AdminContactRequests";

const Settings = () => {
  const { user, isAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Lire le paramètre tab de l'URL
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = tabFromUrl || "company";
  
  // Compter le nombre d'onglets (ajuster selon si admin)
  const isAdministrator = userRole === 'administrateur';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={`grid w-full gap-1 sm:gap-2 mb-4 sm:mb-6 h-auto ${
            isAdministrator 
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-7" 
              : isAdmin
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          }`}>
            <TabsTrigger value="company" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Entreprise</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="companies" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Gestion Entreprises</span>
                </TabsTrigger>
                <TabsTrigger value="contact-requests" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Demandes de contact</span>
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
            <TabsTrigger value="email" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Emails</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Sécurité</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-0">
            <CompanySettings />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="companies" className="mt-0">
                <AdminCompanies />
              </TabsContent>
              <TabsContent value="contact-requests" className="mt-0">
                <AdminContactRequests />
              </TabsContent>
            </>
          )}

          {isAdministrator && (
            <TabsContent value="demo" className="mt-0">
              <DemoModeSettings />
            </TabsContent>
          )}

          <TabsContent value="stripe" className="mt-0">
            <PaymentProviderSettings />
          </TabsContent>

          <TabsContent value="email" className="mt-0">
            <EmailSettings />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Settings;

