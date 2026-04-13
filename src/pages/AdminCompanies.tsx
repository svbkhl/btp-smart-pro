import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAllCompanies, useCreateCompany, useDeleteCompany, Company, useCompanyMembersForAdmin } from "@/hooks/useCompany";
import { DEFAULT_FULL_COMPANY_FEATURES } from "@/utils/companyFeatures";
import { Loader2, Building2, Save, Plus, Mail, Trash2, AlertTriangle, Users, ChevronDown, ChevronUp } from "lucide-react";
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

function formatMemberRoleLabel(roleSlug: string | null | undefined, roleName: string | null | undefined): string {
  const s = roleSlug?.toLowerCase();
  if (s === "owner") return "Dirigeant";
  if (s === "admin") return "Administrateur";
  if (s === "rh") return roleName || "RH";
  if (s === "employee") return roleName || "Employé";
  return roleSlug || roleName || "—";
}

// Composant pour afficher la liste des membres d'une entreprise (company_users, y compris "déjà membres")
const CompanyEmployeesList = ({ companyId, companyName }: { companyId: string; companyName: string }) => {
  const { data: members, isLoading, error } = useCompanyMembersForAdmin(companyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Impossible de charger les membres de {companyName}
        </AlertDescription>
      </Alert>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
        Aucun membre dans cette entreprise
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="text-sm font-medium text-muted-foreground mb-2">
        {members.length} membre{members.length > 1 ? "s" : ""}
      </div>
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center justify-between p-3 rounded-lg bg-transparent backdrop-blur-xl border border-white/10"
          >
            <div className="flex-1">
              <div className="font-medium">
                {[member.prenom, member.nom].filter(Boolean).join(" ") || "—"}
              </div>
              <div className="text-sm text-muted-foreground">
                {member.poste === 'Membre' ? 'Employé' : (member.poste || "—")}
                {member.email && (
                  <span className="ml-2">• {member.email}</span>
                )}
              </div>
            </div>
            {(member.role_slug || member.role_name) && (
              <Badge variant="secondary" className="ml-2">
                {formatMemberRoleLabel(member.role_slug, member.role_name)}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminCompanies = () => {
  const { data: companies = [], isLoading, error } = useAllCompanies();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [newCompanyName, setNewCompanyName] = useState("");

  // Normaliser companies pour s'assurer que c'est toujours un tableau
  const companiesList = Array.isArray(companies) ? companies : [];

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'entreprise est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        name: newCompanyName.trim(),
        plan: "pro" as Company["plan"],
        features: { ...DEFAULT_FULL_COMPANY_FEATURES },
        support_level: 0 as Company["support_level"],
      };
      console.log("Création de l'entreprise...", payload);
      const result = await createCompany.mutateAsync(payload);
      console.log("Entreprise créée avec succès:", result);
      toast({
        title: "Entreprise créée",
        description: "L'entreprise a été créée avec succès.",
      });
      setIsCreateDialogOpen(false);
      setNewCompanyName("");
    } catch (error: any) {
      console.error("Erreur lors de la création de l'entreprise:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'entreprise",
        variant: "destructive",
      });
    }
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

  const toggleCompanyExpansion = (companyId: string) => {
    setExpandedCompanies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
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
            Créez des espaces clients et invitez les dirigeants.
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
                Indiquez le nom du client. L&apos;espace est créé avec toutes les fonctionnalités de l&apos;application.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Nom de l'entreprise *</Label>
                <Input
                  id="name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Nom de l'entreprise"
                />
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
                      onClick={() => openDeleteDialog(company)}
                      className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCompanyExpansion(company.id)}
                    className="w-full justify-between rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Voir les employés</span>
                    </div>
                    {expandedCompanies.has(company.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>

                  {expandedCompanies.has(company.id) && (
                    <CompanyEmployeesList companyId={company.id} companyName={company.name} />
                  )}
                </div>
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
