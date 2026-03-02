import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Eye,
  ArrowRight,
  Tag,
  Trophy,
  BookOpen,
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
import { CloserResources } from "@/components/closer/CloserResources";
import { CloserLeaderboard } from "@/components/closer/CloserLeaderboard";

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

/* ─── Tuile d'action compacte ─── */
const ActionTile = ({
  icon: Icon,
  title,
  description,
  onClick,
  color = "primary",
  active = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  color?: "primary" | "orange" | "blue" | "green";
  active?: boolean;
}) => {
  const colorMap = {
    primary: { bg: "bg-primary/10 hover:bg-primary/20", icon: "bg-primary/20 text-primary", border: "border-primary/20 hover:border-primary/40", active: "bg-primary/20 border-primary/50" },
    orange:  { bg: "bg-orange-500/10 hover:bg-orange-500/20", icon: "bg-orange-500/20 text-orange-500", border: "border-orange-500/20 hover:border-orange-500/40", active: "bg-orange-500/20 border-orange-500/50" },
    blue:    { bg: "bg-blue-500/10 hover:bg-blue-500/20", icon: "bg-blue-500/20 text-blue-500", border: "border-blue-500/20 hover:border-blue-500/40", active: "bg-blue-500/20 border-blue-500/50" },
    green:   { bg: "bg-green-500/10 hover:bg-green-500/20", icon: "bg-green-500/20 text-green-500", border: "border-green-500/20 hover:border-green-500/40", active: "bg-green-500/20 border-green-500/50" },
  };
  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer",
        "backdrop-blur-xl shadow-sm hover:shadow-md",
        active ? c.active : `${c.bg} ${c.border}`
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("p-3 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110", c.icon)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm sm:text-base leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{description}</p>
        </div>
        <div className="flex-shrink-0">
          {active ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-500">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse inline-block" />
              Actif
            </span>
          ) : (
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </div>
    </button>
  );
};

/* ─── Dashboard principal ─── */
const CloserDashboard = () => {
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useAllCompanies();
  const createCompany = useCreateCompany();
  const { toast } = useToast();
  const { setFakeDataEnabled, fakeDataEnabled, closerEmployeeMode, setCloserEmployeeMode } = useFakeDataStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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
      await createCompany.mutateAsync(newCompanyData);
      toast({ title: "Entreprise créée ✓", description: "L'entreprise a été créée avec succès." });
      setIsCreateDialogOpen(false);
      setNewCompanyData({ name: "", plan: "basic", support_level: 0, features: {} });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de créer l'entreprise", variant: "destructive" });
    }
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="relative flex items-center justify-between pt-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-medium mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Espace Closer
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Que voulez-vous faire ?</h1>
        </div>
        <ThemeToggle />
      </div>

      {/* ── Tuiles d'action ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionTile
          icon={MonitorPlay}
          title="Démo Patron"
          description="Vue dirigeant avec toutes les fonctionnalités et données réalistes."
          onClick={() => (fakeDataEnabled && !closerEmployeeMode) ? handleStopDemo() : handleLancerDemo(false)}
          color="blue"
          active={fakeDataEnabled && !closerEmployeeMode}
        />
        <ActionTile
          icon={Eye}
          title="Démo Employé"
          description="Vue employé : planning, affectations chantiers et espace personnel."
          onClick={() => (fakeDataEnabled && closerEmployeeMode) ? handleStopDemo() : handleLancerDemo(true)}
          color="green"
          active={fakeDataEnabled && closerEmployeeMode}
        />
        <ActionTile
          icon={Tag}
          title="Présenter les offres"
          description="Page tarifaire Starter / Pro / Elite à montrer au client en visio."
          onClick={() => navigate("/start")}
          color="orange"
        />
        <ActionTile
          icon={Plus}
          title="Nouvelle Entreprise"
          description="Créer l'espace d'un nouveau client et l'inscrire sur BTP Smart Pro."
          onClick={() => setIsCreateDialogOpen(true)}
          color="primary"
        />
      </div>

      {/* ── Section tabulée : Classement / Entreprises / Ressources ── */}
      <Tabs defaultValue="classement" className="w-full">
        <TabsList className="w-full grid grid-cols-3 rounded-xl h-11 border-0 bg-transparent p-0 gap-2">
          <TabsTrigger value="classement" className="gap-1.5 rounded-lg text-xs sm:text-sm">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Classement</span>
            <span className="sm:hidden">Top</span>
          </TabsTrigger>
          <TabsTrigger value="entreprises" className="gap-1.5 rounded-lg text-xs sm:text-sm">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Mes entreprises</span>
            <span className="sm:hidden">Entreprises</span>
            {companiesList.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-0.5">{companiesList.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ressources" className="gap-1.5 rounded-lg text-xs sm:text-sm">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Ressources</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
        </TabsList>

        {/* Classement */}
        <TabsContent value="classement" className="mt-4">
          <CloserLeaderboard />
        </TabsContent>

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

        {/* Ressources */}
        <TabsContent value="ressources" className="mt-4">
          <CloserResources />
        </TabsContent>
      </Tabs>

      {/* Dialog créer entreprise */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl">Annuler</Button>
              <Button onClick={handleCreateCompany} disabled={createCompany.isPending || !newCompanyData.name.trim()} className="gap-2 rounded-xl">
                {createCompany.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Création...</> : <><Save className="w-4 h-4" />Créer</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CloserDashboard;
