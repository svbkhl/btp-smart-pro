import { useState } from "react";
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
import { useAllCompanies, useUpdateCompany, useCreateCompany, useDeleteCompany, Company } from "@/hooks/useCompany";
import { ALL_FEATURES } from "@/utils/companyFeatures";
import { Loader2, Building2, Save, Plus, Edit, Mail, Trash2, AlertTriangle } from "lucide-react";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AdminCompanies = () => {
  const { data: companies = [], isLoading, error } = useAllCompanies();
  const updateCompany = useUpdateCompany();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const { toast } = useToast();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    plan: "basic" as Company["plan"],
    support_level: 0 as Company["support_level"],
    features: {} as Company["features"],
  });

  // Normaliser companies pour s'assurer que c'est toujours un tableau
  const companiesList = Array.isArray(companies) ? companies : [];

  const handleSaveCompany = async (company: Company, updates: Partial<Company>) => {
    try {
      await updateCompany.mutateAsync({
        companyId: company.id,
        updates,
      });
      toast({
        title: "Entreprise mise à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
      setEditingCompany(null);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour l'entreprise",
        variant: "destructive",
      });
    }
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
      console.log("🔄 Création de l'entreprise...", newCompanyData);
      const result = await createCompany.mutateAsync(newCompanyData);
      console.log("✅ Entreprise créée avec succès:", result);
      toast({
        title: "Entreprise créée",
        description: "L'entreprise a été créée avec succès.",
      });
      setIsCreateDialogOpen(false);
      setNewCompanyData({
        name: "",
        plan: "basic",
        support_level: 0,
        features: {},
      });
    } catch (error: any) {
      console.error("❌ Erreur lors de la création de l'entreprise:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'entreprise",
        variant: "destructive",
      });
    }
  };

  const toggleFeature = (company: Company, featureKey: keyof Company["features"]) => {
    const currentFeatures = company.features || {};
    const newFeatures = {
      ...currentFeatures,
      [featureKey]: !currentFeatures[featureKey],
    };
    handleSaveCompany(company, { features: newFeatures });
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;

    // Vérifier que le texte de confirmation correspond (insensible à la casse, trim)
    const normalizedConfirm = deleteConfirmationText.trim().toLowerCase();
    const normalizedName = companyToDelete.name.trim().toLowerCase();
    if (normalizedConfirm !== normalizedName) {
      toast({
        title: "Erreur de confirmation",
        description: "Le nom de l'entreprise ne correspond pas. Veuillez réessayer.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteCompany.mutateAsync(companyToDelete.id);
      toast({
        title: "Entreprise supprimée",
        description: `L'entreprise "${companyToDelete.name}" a été supprimée avec succès.`,
      });
      setIsDeleteDialogOpen(false);
      setCompanyToDelete(null);
      setDeleteConfirmationText("");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'entreprise",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteConfirmationText("");
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Afficher un message si la table n'existe pas
  if (error && (error.message?.includes("does not exist") || error.message?.includes("relation"))) {
    return (
      <GlassCard className="p-12 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl font-semibold mb-2">Table companies non trouvée</h3>
        <p className="text-muted-foreground mb-4">
          La table companies n'existe pas encore dans la base de données.
        </p>
        <p className="text-sm text-muted-foreground">
          Exécutez le script <code className="bg-muted px-2 py-1 rounded">CREATE-COMPANIES-SYSTEM.sql</code> dans Supabase SQL Editor.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Gestion des Entreprises
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configurez les modules et le support pour chaque entreprise
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Nouvelle entreprise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
              <DialogDescription>
                Remplissez les informations pour créer une nouvelle entreprise et configurez les modules à activer.
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
                  placeholder="Nom de l'entreprise"
                />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
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
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Modules à activer</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
                    className="text-xs h-7 rounded-lg"
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
                  {/* Chantiers */}
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                    <Switch
                      checked={newCompanyData.features.projets === true}
                      onCheckedChange={(checked) => {
                        setNewCompanyData({
                          ...newCompanyData,
                          features: {
                            ...newCompanyData.features,
                            projets: checked,
                          },
                        });
                      }}
                    />
                    <Label className="text-sm cursor-pointer">Chantiers</Label>
                  </div>

                  {/* Calendrier */}
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                    <Switch
                      checked={newCompanyData.features.planning === true}
                      onCheckedChange={(checked) => {
                        setNewCompanyData({
                          ...newCompanyData,
                          features: {
                            ...newCompanyData.features,
                            planning: checked,
                          },
                        });
                      }}
                    />
                    <Label className="text-sm cursor-pointer">Calendrier</Label>
                  </div>

                  {/* Employés */}
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                    <Switch
                      checked={newCompanyData.features.employes === true}
                      onCheckedChange={(checked) => {
                        setNewCompanyData({
                          ...newCompanyData,
                          features: {
                            ...newCompanyData.features,
                            employes: checked,
                          },
                        });
                      }}
                    />
                    <Label className="text-sm cursor-pointer">Employés</Label>
                  </div>

                  {/* IA */}
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                    <Switch
                      checked={newCompanyData.features.ia_assistant === true}
                      onCheckedChange={(checked) => {
                        setNewCompanyData({
                          ...newCompanyData,
                          features: {
                            ...newCompanyData.features,
                            ia_assistant: checked,
                          },
                        });
                      }}
                    />
                    <Label className="text-sm cursor-pointer">IA</Label>
                  </div>

                  {/* Facturation */}
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                    <Switch
                      checked={newCompanyData.features.facturation === true}
                      onCheckedChange={(checked) => {
                        setNewCompanyData({
                          ...newCompanyData,
                          features: {
                            ...newCompanyData.features,
                            facturation: checked,
                          },
                        });
                      }}
                    />
                    <Label className="text-sm cursor-pointer">Facturation</Label>
                  </div>

                  {/* Messagerie */}
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                    <Switch
                      checked={newCompanyData.features.messagerie === true}
                      onCheckedChange={(checked) => {
                        setNewCompanyData({
                          ...newCompanyData,
                          features: {
                            ...newCompanyData.features,
                            messagerie: checked,
                          },
                        });
                      }}
                    />
                    <Label className="text-sm cursor-pointer">Messagerie</Label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
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

      {/* Dialog de suppression avec double confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Supprimer l'entreprise
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes les données associées à cette entreprise seront supprimées.
            </DialogDescription>
          </DialogHeader>

          {companyToDelete && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attention !</AlertTitle>
                <AlertDescription>
                  Vous êtes sur le point de supprimer définitivement l'entreprise <strong>{companyToDelete.name}</strong>.
                  Cette action ne peut pas être annulée.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Pour confirmer, tapez le nom de l'entreprise : <strong>{companyToDelete.name}</strong>
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder={companyToDelete.name}
                  className="rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setCompanyToDelete(null);
                    setDeleteConfirmationText("");
                  }}
                  disabled={deleteCompany.isPending}
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCompany}
                  disabled={
                    deleteCompany.isPending ||
                    deleteConfirmationText.trim().toLowerCase() !== companyToDelete.name.trim().toLowerCase()
                  }
                  className="gap-2 rounded-xl"
                >
                  {deleteCompany.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer définitivement
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4">
        {companiesList.length > 0 ? (
          companiesList.map((company) => (
            <GlassCard key={company.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{company.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Plan: {company.plan}</span>
                      <span>Statut: {company.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <InviteUserDialog
                      companyId={company.id}
                      companyName={company.name}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 rounded-xl"
                        >
                          <Mail className="w-4 h-4" />
                          Inviter dirigeant
                        </Button>
                      }
                      onSuccess={() => {
                        // Optionnel: rafraîchir la liste
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingCompany(company)}
                      className="rounded-xl"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openDeleteDialog(company)}
                      className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {editingCompany?.id === company.id ? (
                  <div className="space-y-4 pt-4 border-t">

                    <div>
                      <Label>Modules activés</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {ALL_FEATURES.map((feature) => (
                          <div
                            key={feature.key}
                            className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50"
                          >
                            <Switch
                              checked={company.features?.[feature.key] === true}
                              onCheckedChange={() => toggleFeature(company, feature.key)}
                              disabled={updateCompany.isPending}
                            />
                            <Label className="text-sm cursor-pointer">{feature.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingCompany(null)}
                        className="rounded-xl"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-sm text-muted-foreground">Modules activés</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ALL_FEATURES.filter(
                        (f) => company.features?.[f.key] === true
                      ).map((feature) => (
                        <span
                          key={feature.key}
                          className="px-2 py-1 text-xs rounded-lg bg-primary/10 text-primary"
                        >
                          {feature.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          ))
        ) : (
          <GlassCard className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucune entreprise configurée</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default AdminCompanies;
