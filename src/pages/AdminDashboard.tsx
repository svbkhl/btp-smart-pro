/**
 * Tableau de bord Admin — même structure que l'espace Closer.
 * Header, widget Performances closers, 1 gros bouton vers les 4 actions, onglets (Entreprises, Leads, Performances closers, Employés).
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  useAllCompanies,
  useCreateCompany,
  Company,
  useCompanyMembersForAdmin,
} from "@/hooks/useCompany";
import {
  Loader2,
  Building2,
  Plus,
  Save,
  Mail,
  Users,
  ChevronDown,
  ChevronUp,
  MonitorPlay,
  ArrowRight,
  Tag,
  Trophy,
  Phone,
  UserCog,
  LogOut,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CloserLeaderboard } from "@/components/closer/CloserLeaderboard";
import { CloserSettings } from "@/components/settings/CloserSettings";
import AdminContactRequests from "@/pages/AdminContactRequests";
import AdminCompanies from "@/pages/AdminCompanies";
import AdminLeads from "@/pages/AdminLeads";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const CompanyMembersList = ({ companyId, companyName }: { companyId: string; companyName: string }) => {
  const { data: members, isLoading, error } = useCompanyMembersForAdmin(companyId);
  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (error) return <Alert variant="destructive" className="mt-3"><AlertTitle>Erreur</AlertTitle><AlertDescription>Impossible de charger les membres</AlertDescription></Alert>;
  if (!members?.length) return <div className="mt-3 p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">Aucun membre</div>;
  return (
    <div className="mt-3 space-y-2">
      {members.map((m) => (
        <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg bg-transparent backdrop-blur-xl border border-white/10">
          <div>
            <div className="font-medium text-sm">{[m.prenom, m.nom].filter(Boolean).join(" ") || "—"}</div>
            <div className="text-xs text-muted-foreground">{m.email && <span>{m.email}</span>}</div>
          </div>
          {(m.role_slug || m.role_name) && <Badge variant="secondary" className="text-xs">{m.role_slug || m.role_name}</Badge>}
        </div>
      ))}
    </div>
  );
};

/** Widget compact : top closers + lien vers l'onglet classement */
function AdminCloserPerformanceWidget({ onViewClassement }: { onViewClassement?: () => void }) {
  const { data: list, isLoading } = useQuery({
    queryKey: ["closer_leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_closer_leaderboard" as any);
      if (error) throw error;
      return ((data as any[]) || []).slice(0, 5);
    },
  });

  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-base sm:text-lg">Performances closers</p>
            <p className="text-sm text-muted-foreground">Classement du mois</p>
          </div>
        </div>
        {!isLoading && list && list.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {list.slice(0, 3).map((row: any, i: number) => (
              <div key={row.closer_email || i} className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1">
                <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                <span className="text-sm font-medium truncate max-w-[100px]">{row.closer_name || row.closer_email?.split("@")[0] || "—"}</span>
                <span className="text-xs text-primary font-semibold">{row.monthly_closes ?? 0}</span>
              </div>
            ))}
          </div>
        )}
        {onViewClassement && (
          <Button variant="outline" size="default" className="rounded-xl gap-1.5" onClick={onViewClassement}>
            <Trophy className="h-4 w-4" />
            Voir le classement
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: companies = [], isLoading } = useAllCompanies();
  const createCompany = useCreateCompany();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("entreprises");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"create" | "invite">("create");
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [createdCompanyName, setCreatedCompanyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    plan: "basic" as Company["plan"],
    support_level: 0 as Company["support_level"],
    features: {} as Company["features"],
  });

  const companiesList = Array.isArray(companies) ? companies : [];

  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (state?.openCreate) {
      setIsCreateDialogOpen(true);
      setCreateStep("create");
      navigate("/admin", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleCreateCompany = async () => {
    if (!newCompanyData.name.trim()) {
      toast({ title: "Erreur", description: "Le nom de l'entreprise est requis", variant: "destructive" });
      return;
    }
    try {
      const company = await createCompany.mutateAsync(newCompanyData);
      toast({ title: "Entreprise créée ✓", description: "Invitez le dirigeant ci-dessous ou fermez pour terminer." });
      setCreatedCompanyId(company?.id ?? null);
      setCreatedCompanyName(newCompanyData.name.trim());
      setCreateStep("invite");
      setInviteEmail("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de créer l'entreprise", variant: "destructive" });
    }
  };

  const handleInviteDirigeant = async () => {
    if (!createdCompanyId || !inviteEmail?.trim() || !inviteEmail.includes("@")) {
      toast({ title: "Erreur", description: "Veuillez entrer un email valide.", variant: "destructive" });
      return;
    }
    setInviteLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({ title: "Erreur", description: "Session expirée.", variant: "destructive" });
        setInviteLoading(false);
        return;
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-company-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({ company_id: createdCompanyId, email: inviteEmail.trim().toLowerCase(), role: "owner" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Erreur", description: (data?.message || data?.error) || "Erreur invitation", variant: "destructive" });
        setInviteLoading(false);
        return;
      }
      toast({ title: "Invitation envoyée ✓", description: "Le dirigeant recevra un email." });
      setInviteEmail("");
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible d'envoyer l'invitation", variant: "destructive" });
    }
    setInviteLoading(false);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateStep("create");
    setCreatedCompanyId(null);
    setCreatedCompanyName("");
    setInviteEmail("");
    setNewCompanyData({ name: "", plan: "basic", support_level: 0, features: {} });
  };

  const toggleExpansion = (id: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const firstName = user?.user_metadata?.prenom || user?.user_metadata?.first_name || user?.email?.split("@")[0] || "vous";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative flex items-center justify-between pt-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Espace Admin
          </div>
          <p className="text-xl sm:text-2xl text-muted-foreground font-medium">
            {greeting}, <span className="text-foreground font-semibold capitalize">{firstName}</span> 👋
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-0.5">Que voulez-vous faire ?</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate("/settings")} title="Paramètres">
            <UserCog className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500" onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }} title="Déconnexion">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Widget Performances closers */}
      <AdminCloserPerformanceWidget onViewClassement={() => setActiveTab("performances")} />

      {/* Un seul gros bouton → /admin/actions */}
      <button
        type="button"
        onClick={() => navigate("/admin/actions")}
        className={cn(
          "group relative w-full rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/60",
          "text-left transition-all duration-300 cursor-pointer overflow-hidden min-h-[160px] sm:min-h-[180px] flex items-center justify-center p-8"
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform">
            <MonitorPlay className="h-7 w-7" />
          </div>
          <div>
            <p className="font-bold text-lg sm:text-xl text-foreground">Choisir une action</p>
            <p className="text-sm text-muted-foreground mt-1">Démo dirigeant, démo employé, créer entreprise ou présenter l&apos;offre</p>
          </div>
          <ArrowRight className="h-5 w-5 text-amber-500/60 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap rounded-xl h-auto min-h-11 border-0 bg-transparent p-0 gap-1.5">
          <TabsTrigger value="entreprises" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Gestion Entreprises</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <Phone className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Leads BTP</span>
          </TabsTrigger>
          <TabsTrigger value="performances" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <Trophy className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Performances</span>
          </TabsTrigger>
          <TabsTrigger value="employes" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <UserCog className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Employés</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Demandes de contact</span>
          </TabsTrigger>
          <TabsTrigger value="closers" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <Users className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Param. Closers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entreprises" className="mt-4">
          <AdminCompanies />
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <AdminLeads />
        </TabsContent>

        <TabsContent value="performances" className="mt-4">
          <CloserLeaderboard />
        </TabsContent>

        <TabsContent value="employes" className="mt-4">
          <GlassCard className="p-8 text-center">
            <UserCog className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-60" />
            <p className="text-muted-foreground mb-4">Gestion des employés et des rôles.</p>
            <Button asChild className="rounded-xl">
              <Link to="/admin/employees">Ouvrir la gestion des employés</Link>
            </Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <AdminContactRequests />
        </TabsContent>

        <TabsContent value="closers" className="mt-4">
          <CloserSettings />
        </TabsContent>
      </Tabs>

      {/* Dialog créer entreprise + inviter dirigeant */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (open) { setCreateStep("create"); setCreatedCompanyId(null); setCreatedCompanyName(""); setInviteEmail(""); } if (!open) closeCreateDialog(); setIsCreateDialogOpen(open); }}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          {createStep === "create" ? (
            <>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
                <DialogDescription>Renseignez le nom du client pour créer son espace.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="admin-name">Nom de l'entreprise *</Label>
                  <Input
                    id="admin-name"
                    value={newCompanyData.name}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                    placeholder="Ex: Maçonnerie Dupont"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateCompany()}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeCreateDialog} className="rounded-xl">Annuler</Button>
                  <Button onClick={handleCreateCompany} disabled={createCompany.isPending || !newCompanyData.name.trim()} className="gap-2 rounded-xl">
                    {createCompany.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Création...</> : <><Save className="w-4 h-4" />Créer</>}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Inviter le dirigeant</DialogTitle>
                <DialogDescription>Entreprise <strong>{createdCompanyName}</strong> créée. Envoyez l&apos;invitation au dirigeant.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="admin-invite-email">Email du dirigeant *</Label>
                  <Input
                    id="admin-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="dirigeant@exemple.fr"
                    onKeyDown={(e) => e.key === "Enter" && handleInviteDirigeant()}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeCreateDialog} className="rounded-xl">Terminer</Button>
                  <Button onClick={handleInviteDirigeant} disabled={inviteLoading || !inviteEmail.trim()} className="gap-2 rounded-xl">
                    {inviteLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</> : <><Mail className="w-4 h-4" />Envoyer l&apos;invitation</>}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
