import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  useAllCompanies,
  useCreateCompany,
  Company,
  useCompanyMembersForAdmin,
} from "@/hooks/useCompany";
import { ALL_FEATURES } from "@/utils/companyFeatures";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFakeDataStore } from "@/store/useFakeDataStore";

const CompanyMembersList = ({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) => {
  const { data: members, isLoading, error } = useCompanyMembersForAdmin(companyId);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );

  if (error)
    return (
      <Alert variant="destructive" className="mt-3">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>Impossible de charger les membres de {companyName}</AlertDescription>
      </Alert>
    );

  if (!members || members.length === 0)
    return (
      <div className="mt-3 p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
        Aucun membre pour l'instant
      </div>
    );

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        {members.length} membre{members.length > 1 ? "s" : ""}
      </div>
      {members.map((member) => (
        <div
          key={member.user_id}
          className="flex items-center justify-between p-3 rounded-lg bg-transparent backdrop-blur-xl border border-white/10"
        >
          <div>
            <div className="font-medium text-sm">
              {[member.prenom, member.nom].filter(Boolean).join(" ") || "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {member.poste === "Membre" ? "Employé" : member.poste || "—"}
              {member.email && <span className="ml-2">• {member.email}</span>}
            </div>
          </div>
          {(member.role_slug || member.role_name) && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {member.role_slug || member.role_name}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
};

const CloserDashboard = () => {
  const navigate = useNavigate();
  const { data: companies = [], isLoading, error } = useAllCompanies();
  const createCompany = useCreateCompany();
  const { toast } = useToast();
  const { setFakeDataEnabled, fakeDataEnabled, setCloserEmployeeMode } = useFakeDataStore();
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
    if (employeeMode) {
      setCloserEmployeeMode(true);
    } else {
      setCloserEmployeeMode(false);
    }
    navigate("/dashboard");
  };

  const handleStopDemo = () => {
    setFakeDataEnabled(false);
    setCloserEmployeeMode(false);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyData.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'entreprise est requis",
        variant: "destructive",
      });
      return;
    }
    try {
      await createCompany.mutateAsync(newCompanyData);
      toast({
        title: "Entreprise créée",
        description: "L'entreprise a été créée avec succès.",
      });
      setIsCreateDialogOpen(false);
      setNewCompanyData({ name: "", plan: "basic", support_level: 0, features: {} });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de créer l'entreprise",
        variant: "destructive",
      });
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && (error.message?.includes("does not exist") || error.message?.includes("relation"))) {
    return (
      <GlassCard className="p-12 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl font-semibold mb-2">Table companies non trouvée</h3>
        <p className="text-sm text-muted-foreground">Contactez l'administrateur système.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Espace Closer
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Créez des entreprises et invitez les dirigeants à rejoindre BTP Smart Pro
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Démo patron */}
          <Button
            variant={fakeDataEnabled ? "default" : "outline"}
            onClick={() => fakeDataEnabled ? handleStopDemo() : handleLancerDemo(false)}
            className="gap-2 rounded-xl flex-1 sm:flex-none text-sm"
          >
            <MonitorPlay className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {fakeDataEnabled ? "Quitter la démo" : "Démo patron"}
            </span>
          </Button>

          {/* Démo employé */}
          <Button
            variant="outline"
            onClick={() => handleLancerDemo(true)}
            className="gap-2 rounded-xl flex-1 sm:flex-none text-sm"
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Démo employé</span>
          </Button>

          {/* Créer entreprise */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl flex-1 sm:flex-none text-sm">
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Nouvelle entreprise</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour créer l'entreprise du client et activez ses modules.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Nom de l'entreprise *</Label>
                  <Input
                    id="name"
                    value={newCompanyData.name}
                    onChange={(e) =>
                      setNewCompanyData({ ...newCompanyData, name: e.target.value })
                    }
                    placeholder="Ex: Maçonnerie Dupont"
                  />
                </div>
                <div>
                  <Label htmlFor="plan">Plan souscrit</Label>
                  <Select
                    value={newCompanyData.plan}
                    onValueChange={(value: Company["plan"]) =>
                      setNewCompanyData({ ...newCompanyData, plan: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Modules */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Modules à activer</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 rounded-lg"
                      onClick={() => {
                        const allSelected =
                          newCompanyData.features.projets === true &&
                          newCompanyData.features.planning === true &&
                          newCompanyData.features.employes === true &&
                          newCompanyData.features.ia_assistant === true &&
                          newCompanyData.features.facturation === true &&
                          newCompanyData.features.messagerie === true;
                        setNewCompanyData({
                          ...newCompanyData,
                          features: {
                            projets: !allSelected,
                            planning: !allSelected,
                            employes: !allSelected,
                            ia_assistant: !allSelected,
                            facturation: !allSelected,
                            messagerie: !allSelected,
                          },
                        });
                      }}
                    >
                      {newCompanyData.features.projets === true &&
                      newCompanyData.features.planning === true &&
                      newCompanyData.features.employes === true &&
                      newCompanyData.features.ia_assistant === true &&
                      newCompanyData.features.facturation === true &&
                      newCompanyData.features.messagerie === true
                        ? "Tout désélectionner"
                        : "Tout sélectionner"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {ALL_FEATURES.map((feature) => (
                      <div
                        key={feature.key}
                        className="flex items-center space-x-2 p-2 rounded-lg bg-transparent backdrop-blur-xl"
                      >
                        <Switch
                          checked={newCompanyData.features[feature.key as keyof typeof newCompanyData.features] === true}
                          onCheckedChange={(checked) =>
                            setNewCompanyData({
                              ...newCompanyData,
                              features: { ...newCompanyData.features, [feature.key]: checked },
                            })
                          }
                        />
                        <Label className="text-sm cursor-pointer">{feature.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateCompany}
                    disabled={createCompany.isPending}
                    className="gap-2 rounded-xl"
                  >
                    {createCompany.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Créer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bannière démo active */}
      {fakeDataEnabled && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm">
          <MonitorPlay className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 font-medium">Mode démo actif — vous naviguez avec de fausses données.</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStopDemo}
            className="text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg h-7 px-2 flex-shrink-0"
          >
            Quitter
          </Button>
        </div>
      )}

      {/* Liste des entreprises */}
      <div className="grid grid-cols-1 gap-4">
        {companiesList.length > 0 ? (
          companiesList.map((company) => (
            <GlassCard key={company.id} className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold truncate">{company.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{company.plan}</Badge>
                      <Badge variant="secondary" className="text-xs">{company.status}</Badge>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <InviteUserDialog
                      companyId={company.id}
                      companyName={company.name}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-2 rounded-xl w-full sm:w-auto">
                          <Mail className="w-4 h-4" />
                          Inviter dirigeant
                        </Button>
                      }
                      onSuccess={() => {}}
                    />
                  </div>
                </div>

                {/* Modules */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Modules activés</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_FEATURES.filter((f) => company.features?.[f.key] === true).map(
                      (feature) => (
                        <span
                          key={feature.key}
                          className="px-2 py-0.5 text-xs rounded-lg bg-primary/10 text-primary"
                        >
                          {feature.label}
                        </span>
                      )
                    )}
                    {ALL_FEATURES.filter((f) => company.features?.[f.key] === true).length === 0 && (
                      <span className="text-xs text-muted-foreground">Aucun module activé</span>
                    )}
                  </div>
                </div>

                {/* Membres */}
                <div className="pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpansion(company.id)}
                    className="w-full justify-between rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Voir les membres</span>
                    </div>
                    {expandedCompanies.has(company.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  {expandedCompanies.has(company.id) && (
                    <CompanyMembersList companyId={company.id} companyName={company.name} />
                  )}
                </div>
              </div>
            </GlassCard>
          ))
        ) : (
          <GlassCard className="p-8 sm:p-12 text-center">
            <Building2 className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4 text-sm">Aucune entreprise créée pour l'instant</p>
            <Button
              className="gap-2 rounded-xl"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Créer la première entreprise
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default CloserDashboard;
