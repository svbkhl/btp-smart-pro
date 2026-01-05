import { useState } from "react";
import { useDelegations, useCreateDelegation, useRevokeDelegation, CreateDelegationData } from "@/hooks/useDelegations";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Clock, User, Shield } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// Permissions déléguables (excluant les permissions critiques)
const DELEGATABLE_PERMISSIONS = [
  { key: "planning.read", label: "Planning - Lecture" },
  { key: "planning.create", label: "Planning - Création" },
  { key: "planning.update", label: "Planning - Modification" },
  { key: "employees.read", label: "Employés - Lecture" },
  { key: "invoices.read", label: "Factures - Lecture" },
  { key: "invoices.send", label: "Factures - Envoi" },
  { key: "payments.read", label: "Paiements - Lecture" },
  { key: "clients.read", label: "Clients - Lecture" },
  { key: "clients.create", label: "Clients - Création" },
  { key: "clients.update", label: "Clients - Modification" },
  { key: "projects.read", label: "Projets - Lecture" },
  { key: "projects.create", label: "Projets - Création" },
  { key: "projects.update", label: "Projets - Modification" },
  { key: "quotes.read", label: "Devis - Lecture" },
  { key: "quotes.create", label: "Devis - Création" },
  { key: "quotes.send", label: "Devis - Envoi" },
];

export default function DelegationsManagement() {
  const { user, currentCompanyId } = useAuth();
  const { can, isOwner } = usePermissions();
  const { data: delegations = [], isLoading } = useDelegations();
  const createDelegation = useCreateDelegation();
  const revokeDelegation = useRevokeDelegation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateDelegationData>({
    to_user_id: "",
    permission_key: "",
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    reason: "",
  });

  // Récupérer les utilisateurs de l'entreprise
  const { data: companyUsers = [] } = useQuery({
    queryKey: ["company-users", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      const { data, error } = await supabase
        .from("company_users")
        .select("user_id, users(id, email)")
        .eq("company_id", currentCompanyId);

      if (error) {
        console.error("Error fetching users:", error);
        return [];
      }

      return (data || []).map((cu: any) => ({
        id: cu.user_id,
        email: cu.users?.email || "Email inconnu",
      }));
    },
    enabled: !!currentCompanyId,
  });

  // Vérifier les permissions
  if (!isOwner && !can("delegations.manage")) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Accès refusé</h2>
          <p className="text-muted-foreground">
            Vous n'avez pas les permissions nécessaires pour gérer les délégations.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateDelegation = async () => {
    try {
      if (!formData.to_user_id || !formData.permission_key || !formData.starts_at || !formData.ends_at) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }

      if (formData.to_user_id === user?.id) {
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas vous déléguer des permissions à vous-même",
          variant: "destructive",
        });
        return;
      }

      const startsAt = new Date(formData.starts_at);
      const endsAt = new Date(formData.ends_at);

      if (endsAt <= startsAt) {
        toast({
          title: "Erreur",
          description: "La date de fin doit être après la date de début",
          variant: "destructive",
        });
        return;
      }

      await createDelegation.mutateAsync({
        ...formData,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      });

      toast({
        title: "Succès",
        description: "Délégation créée avec succès",
      });

      setIsCreateDialogOpen(false);
      setFormData({
        to_user_id: "",
        permission_key: "",
        starts_at: new Date().toISOString().slice(0, 16),
        ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        reason: "",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la délégation",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async (delegationId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir révoquer cette délégation ?")) {
      return;
    }

    try {
      await revokeDelegation.mutateAsync(delegationId);
      toast({
        title: "Succès",
        description: "Délégation révoquée",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de révoquer la délégation",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (delegation: any) => {
    const status = delegation.status || "active";
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      expired: "secondary",
      revoked: "destructive",
      pending: "outline",
    };

    const labels: Record<string, string> = {
      active: "Active",
      expired: "Expirée",
      revoked: "Révoquée",
      pending: "En attente",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Délégations temporaires</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les permissions temporaires déléguées aux utilisateurs
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer une délégation
        </Button>
      </div>

      {/* Liste des délégations */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : delegations.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune délégation</h3>
          <p className="text-muted-foreground mb-4">
            Aucune délégation n'a été créée pour le moment.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer la première délégation
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {delegations.map((delegation) => (
            <div
              key={delegation.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{delegation.permission_key}</h3>
                    {getStatusBadge(delegation)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>De: {delegation.from_user_email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>À: {delegation.to_user_email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(delegation.starts_at), "dd MMM yyyy", { locale: fr })} -{" "}
                        {format(new Date(delegation.ends_at), "dd MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  </div>
                  {delegation.reason && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <strong>Raison:</strong> {delegation.reason}
                    </p>
                  )}
                </div>
                {delegation.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(delegation.id)}
                    disabled={revokeDelegation.isPending}
                  >
                    {revokeDelegation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Révoquer
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de création */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une délégation</DialogTitle>
            <DialogDescription>
              Déléguez temporairement une permission à un utilisateur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to_user_id">Utilisateur bénéficiaire *</Label>
              <Select
                value={formData.to_user_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, to_user_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {companyUsers
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission_key">Permission *</Label>
              <Select
                value={formData.permission_key}
                onValueChange={(value) =>
                  setFormData({ ...formData, permission_key: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une permission" />
                </SelectTrigger>
                <SelectContent>
                  {DELEGATABLE_PERMISSIONS.map((perm) => (
                    <SelectItem key={perm.key} value={perm.key}>
                      {perm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Date de début *</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) =>
                    setFormData({ ...formData, starts_at: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends_at">Date de fin *</Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) =>
                    setFormData({ ...formData, ends_at: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Raison (optionnel)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Ex: Remplacement temporaire, congé..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createDelegation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateDelegation}
              disabled={createDelegation.isPending}
            >
              {createDelegation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Créer la délégation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
