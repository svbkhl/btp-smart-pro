import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClients, useDeleteClient } from "@/hooks/useClients";
import { ClientForm } from "@/components/ClientForm";
import { Plus, Search, Users, Mail, Phone, MapPin, Trash2, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { safeAction } from "@/utils/safeAction";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Clients = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Ouvrir le formulaire si action=create dans l'URL
  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setIsFormOpen(true);
      setEditingClient(null);
      // Nettoyer l'URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await safeAction(
      async () => {
        await deleteClient.mutateAsync(id);
        setDeleteDialogOpen(false);
        setClientToDelete(null);
      },
      {
        successMessage: "Client supprimé avec succès",
        errorMessage: "Erreur lors de la suppression du client",
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "actif":
        return "default";
      case "VIP":
        return "secondary";
      case "terminé":
        return "outline";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
            <p className="text-muted-foreground">Chargement des clients...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Clients
            </h1>
            <p className="text-muted-foreground">
              Gérez vos clients et leurs informations
            </p>
          </div>
          <Button onClick={() => {
            setEditingClient(null);
            setIsFormOpen(true);
          }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau client
          </Button>
        </div>

        {/* Barre de recherche */}
        <GlassCard className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </GlassCard>

        {/* Liste des clients */}
        {filteredClients.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Aucun client</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Aucun client ne correspond à votre recherche" : "Créez votre premier client pour commencer"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un client
              </Button>
            )}
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <GlassCard key={client.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{client.name}</h3>
                    <Badge variant={getStatusColor(client.status)} className="text-xs">
                      {client.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        setClientToDelete(client.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {client.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{client.location}</span>
                    </div>
                  )}
                  {client.total_spent !== undefined && (
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-foreground">
                        Total dépensé: {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(client.total_spent)}
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        <ClientForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          client={editingClient}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le client</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clientToDelete && handleDelete(clientToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  );
};

export default Clients;

