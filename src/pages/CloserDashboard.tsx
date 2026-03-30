import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCloserPresence } from "@/hooks/useCloserPresence";
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
  BookOpen,
  Phone,
  CalendarDays,
  UserCircle,
  LogOut,
  BarChart3,
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
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CloserResources, CloserCalendly } from "@/components/closer/CloserResources";
import { CloserPerformanceWidget } from "@/components/closer/CloserPerformanceWidget";
import { CloserKPITable } from "@/components/closer/CloserKPITable";
import CloserLeads from "@/components/closer/CloserLeads";

/* ─── Membres d'une entreprise ─── */
const CompanyMembersList = ({ companyId, companyName }: { companyId: string; companyName: string }) => {
  const { data: members, isLoading, error } = useCompanyMembersForAdmin(companyId);
  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (error) return <Alert variant="destructive" className="mt-3"><AlertTitle>Erreur</AlertTitle><AlertDescription>Impossible de charger les membres de {companyName}</AlertDescription></Alert>;
  if (!members || members.length === 0) return <div className="mt-3 p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">Aucun membre pour l'instant</div>;
  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{members.length} membre{members.length > 1 ? "s" : ""}</div>
      {members.map((member) => (
        <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg bg-transparent backdrop-blur-xl border border-white/10">
          <div>
            <div className="font-medium text-sm">{[member.prenom, member.nom].filter(Boolean).join(" ") || "—"}</div>
            <div className="text-xs text-muted-foreground">
              {member.poste === "Membre" ? "Employé" : member.poste || "—"}
              {member.email && <span className="ml-2">• {member.email}</span>}
            </div>
          </div>
          {(member.role_slug || member.role_name) && <Badge variant="secondary" className="ml-2 text-xs">{member.role_slug || member.role_name}</Badge>}
        </div>
      ))}
    </div>
  );
};

/* ─── Tuile d'action grande ─── */
const ActionTile = ({
  icon: Icon,
  title,
  description,
  onClick,
  color = "primary",
  active = false,
  gradient,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  color?: "primary" | "orange" | "blue" | "green";
  active?: boolean;
  gradient: string;
}) => {
  const colorMap = {
    primary: { icon: "text-violet-400", border: "border-violet-500/20 hover:border-violet-500/50", glow: "hover:shadow-violet-500/20" },
    orange:  { icon: "text-orange-400", border: "border-orange-500/20 hover:border-orange-500/50", glow: "hover:shadow-orange-500/20" },
    blue:    { icon: "text-blue-400",   border: "border-blue-500/20 hover:border-blue-500/50",   glow: "hover:shadow-blue-500/20" },
    green:   { icon: "text-green-400",  border: "border-green-500/20 hover:border-green-500/50",  glow: "hover:shadow-green-500/20" },
  };
  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-2xl border text-left transition-all duration-300 cursor-pointer overflow-hidden",
        "backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1",
        c.border, c.glow,
        active && "ring-2 ring-inset ring-white/20"
      )}
    >
      {/* Fond dégradé */}
      <div className={cn("absolute inset-0 opacity-80 dark:opacity-60", gradient)} />
      {/* Cercle déco flou */}
      <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5 group-hover:scale-125 transition-transform duration-500" />
      <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-700" />

      <div className="relative p-5 sm:p-6 flex flex-col gap-4 min-h-[140px]">
        {/* Icône */}
        <div className={cn("w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", c.icon)}>
          <Icon className="w-6 h-6" />
        </div>
        {/* Texte */}
        <div>
          <p className="font-bold text-base sm:text-lg text-white leading-tight">{title}</p>
          <p className="text-xs sm:text-sm text-white/70 mt-1 leading-relaxed">{description}</p>
        </div>
        {/* Flèche */}
        <ArrowRight className="absolute bottom-5 right-5 w-5 h-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </button>
  );
};

/* ─── Dashboard principal ─── */
const CloserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: companies = [], isLoading } = useAllCompanies();
  const createCompany = useCreateCompany();
  const { toast } = useToast();
  const { setFakeDataEnabled, fakeDataEnabled, closerEmployeeMode, setCloserEmployeeMode } = useFakeDataStore();
  // Rejoindre le canal de présence dès que le closer est connecté
  useCloserPresence(user?.email);
  const [activeTab, setActiveTab] = useState("entreprises");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Ouvrir le dialog "Nouvelle entreprise" si on revient de /closer/actions avec state.openCreate
  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (state?.openCreate) {
      setIsCreateDialogOpen(true);
      setCreateStep("create");
      navigate("/closer", { replace: true, state: {} });
    }
  }, [location.state, navigate]);
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

  const handleLancerDemo = (employeeMode = false) => {
    setFakeDataEnabled(true);
    setCloserEmployeeMode(employeeMode);
    navigate("/dashboard");
  };

  const handleStopDemo = () => {
    setCloserEmployeeMode(false);
    navigate("/closer");
  };

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
        toast({ title: "Erreur", description: "Session expirée. Reconnectez-vous.", variant: "destructive" });
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
        const msg = data?.message || data?.error || "Erreur lors de l'invitation";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
        setInviteLoading(false);
        return;
      }
      toast({ title: "Invitation envoyée ✓", description: "Le dirigeant recevra un email pour rejoindre l'entreprise." });
      setInviteEmail("");
      setInviteLoading(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible d'envoyer l'invitation", variant: "destructive" });
      setInviteLoading(false);
    }
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
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const firstName = user?.user_metadata?.prenom || user?.user_metadata?.first_name || user?.email?.split("@")[0] || "vous";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="relative flex items-center justify-between pt-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-500 text-xs font-medium mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Espace Closer
          </div>
          <p className="text-xl sm:text-2xl text-muted-foreground font-medium">
            {greeting}, <span className="text-foreground font-semibold capitalize">{firstName}</span> 👋
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-0.5">Que voulez-vous faire ?</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/settings")}
            title="Mon profil"
          >
            <UserCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-red-500"
            onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
            title="Se déconnecter"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Widget performance (plus gros pour la vue démo) ── */}
      <CloserPerformanceWidget size="large" />

      {/* ── Un seul gros bouton : ouvre la page des 4 actions (sans le reste en dessous) ── */}
      <button
        type="button"
        onClick={() => navigate("/closer/actions")}
        className="group relative w-full rounded-2xl border-2 border-dashed border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/60 text-left transition-all duration-300 cursor-pointer overflow-hidden min-h-[160px] sm:min-h-[180px] flex items-center justify-center p-8"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-500 group-hover:scale-110 transition-transform">
            <MonitorPlay className="h-7 w-7" />
          </div>
          <div>
            <p className="font-bold text-lg sm:text-xl text-foreground">Choisir une action</p>
            <p className="text-sm text-muted-foreground mt-1">Démo patron, démo employé, offres ou nouvelle entreprise</p>
          </div>
          <ArrowRight className="h-5 w-5 text-violet-500/60 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* ── Section tabulée ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 rounded-xl h-11 border-0 bg-transparent p-0 gap-1.5">
          <TabsTrigger value="entreprises" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Entreprises</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <Phone className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Mes leads</span>
          </TabsTrigger>
          <TabsTrigger value="kpi" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">KPI</span>
          </TabsTrigger>
          <TabsTrigger value="documentation" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Documentation</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="calendly" className="gap-1 rounded-lg text-xs sm:text-sm px-1 sm:px-3">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Calendly</span>
          </TabsTrigger>
          {/* Classement masqué temporairement (jusqu'à nouvelle annonce) */}
        </TabsList>

        {/* Mes entreprises */}
        <TabsContent value="entreprises" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {companiesList.length === 0
                ? "Aucune entreprise créée pour l'instant."
                : `${companiesList.length} entreprise${companiesList.length > 1 ? "s" : ""} créée${companiesList.length > 1 ? "s" : ""}.`}
            </p>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Nouvelle
            </Button>
          </div>

          {companiesList.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">Cliquez sur "Nouvelle Entreprise" pour créer votre premier client.</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {companiesList.map((company) => (
                <GlassCard key={company.id} className="p-4 sm:p-5">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{company.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs">{company.plan}</Badge>
                          <Badge variant="secondary" className="text-xs">{company.status}</Badge>
                        </div>
                      </div>
                      <InviteUserDialog
                        companyId={company.id}
                        companyName={company.name}
                        trigger={
                          <Button variant="outline" size="sm" className="gap-2 rounded-xl w-full sm:w-auto flex-shrink-0">
                            <Mail className="w-4 h-4" />
                            Inviter dirigeant
                          </Button>
                        }
                        onSuccess={() => {}}
                      />
                    </div>
                    <div className="border-t pt-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleExpansion(company.id)} className="w-full justify-between rounded-xl h-8">
                        <div className="flex items-center gap-2 text-xs"><Users className="w-3.5 h-3.5" /><span>Membres</span></div>
                        {expandedCompanies.has(company.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                      {expandedCompanies.has(company.id) && <CompanyMembersList companyId={company.id} companyName={company.name} />}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Mes Leads */}
        <TabsContent value="leads" className="mt-4">
          <CloserLeads />
        </TabsContent>

        {/* KPI */}
        <TabsContent value="kpi" className="mt-4">
          <CloserKPITable />
        </TabsContent>

        {/* Documentation */}
        <TabsContent value="documentation" className="mt-4">
          <CloserResources />
        </TabsContent>

        {/* Calendly — forceMount pour garder l'iframe en DOM et éviter le rechargement à chaque visite */}
        <TabsContent value="calendly" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <CloserCalendly />
        </TabsContent>

        {/* Classement masqué temporairement (jusqu'à nouvelle annonce) */}
      </Tabs>

      {/* Dialog créer entreprise + inviter dirigeant (sans quitter) */}
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
                  <Label htmlFor="name">Nom de l'entreprise *</Label>
                  <Input
                    id="name"
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
                <DialogDescription>
                  Entreprise <strong>{createdCompanyName}</strong> créée. Envoyez l&apos;invitation au dirigeant (il pourra s&apos;inscrire et gérer l&apos;abonnement).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="invite-email">Email du dirigeant *</Label>
                  <Input
                    id="invite-email"
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
};

export default CloserDashboard;
