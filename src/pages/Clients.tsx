import { useState, useEffect, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FolderKanban,
  Euro,
  Loader2,
  Edit,
  Trash2,
  Users,
  Download
} from "lucide-react";
import { useClients, useDeleteClient } from "@/hooks/useClients";
import { ClientForm } from "@/components/ClientForm";
import { Pagination } from "@/components/Pagination";
import { AdvancedFilters, AdvancedFiltersProps } from "@/components/AdvancedFilters";
import { useProjects } from "@/hooks/useProjects";
import { exportClientsToCSV } from "@/services/exportService";
import { safeAction } from "@/utils/safeAction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ITEMS_PER_PAGE = 12;

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersProps["filters"]>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  
  // Les hooks retournent déjà des données mock en cas de timeout (3 secondes)
  // Cette approche évite les chargements infinis en affichant toujours du contenu
  const { data: clients, isLoading } = useClients();
  const { data: projects } = useProjects();
  const deleteClient = useDeleteClient();
  
  // Utiliser des données par défaut pour éviter les chargements infinis
  const displayClients = clients || [];

  // Compter les projets par client avec useMemo pour éviter les recalculs
  const clientProjectsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    projects?.forEach(p => {
      if (p.client_id) {
        map.set(p.client_id, (map.get(p.client_id) || 0) + 1);
      }
    });
    return map;
  }, [projects]);

  // Calculer le total dépensé par client avec useMemo
  const clientTotalSpentMap = useMemo(() => {
    const map = new Map<string, number>();
    projects?.forEach(p => {
      if (p.client_id && p.status === "terminé") {
        map.set(p.client_id, (map.get(p.client_id) || 0) + (Number(p.budget) || 0));
      }
    });
    return map;
  }, [projects]);

  // Mémoriser les fonctions avec useCallback
  const getClientProjectsCount = useCallback((clientId: string) => {
    return clientProjectsCountMap.get(clientId) || 0;
  }, [clientProjectsCountMap]);

  const getClientTotalSpent = useCallback((clientId: string) => {
    return clientTotalSpentMap.get(clientId) || 0;
  }, [clientTotalSpentMap]);

  // Filtrer les clients selon la recherche, statut et filtres avancés avec useMemo
  const filteredClients = useMemo(() => {
    if (!displayClients || displayClients.length === 0) return [];
    const searchLower = searchQuery.toLowerCase();
    return displayClients.filter(client => {
      // Recherche
      const matchesSearch = 
        client.name.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.location?.toLowerCase().includes(searchLower);
      
      // Statut
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      
      // Filtres avancés (pour clients, on peut filtrer par nombre de projets, total dépensé, etc.)
      const clientProjectsCount = getClientProjectsCount(client.id);
      
      const matchesMinProjects = !advancedFilters.minBudget || clientProjectsCount >= (advancedFilters.minBudget || 0);
      const matchesMaxProjects = !advancedFilters.maxBudget || clientProjectsCount <= (advancedFilters.maxBudget || 1000);
      
      return matchesSearch && matchesStatus && matchesMinProjects && matchesMaxProjects;
    });
  }, [clients, searchQuery, statusFilter, advancedFilters, getClientProjectsCount]);

  // Pagination avec useMemo
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedClients = filteredClients.slice(startIndex, endIndex);
    return { totalPages, paginatedClients, startIndex, endIndex };
  }, [filteredClients, currentPage]);
  
  const { totalPages, paginatedClients, startIndex, endIndex } = paginationData;

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, advancedFilters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "actif":
        return "default";
      case "VIP":
        return "default";
      case "terminé":
        return "secondary";
      case "planifié":
        return "outline";
      default:
        return "secondary";
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    await safeAction(
      async () => {
        await deleteClient.mutateAsync(clientId);
        setDeletingClientId(null);
      },
      {
        successMessage: "Client supprimé avec succès",
        errorMessage: "Erreur lors de la suppression du client",
      }
    );
  };

  const handleCreateNew = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clients</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Gérez votre portefeuille clients
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {filteredClients.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => safeAction(
                    () => exportClientsToCSV(filteredClients, projects || []),
                    {
                      successMessage: "Export CSV réussi",
                      errorMessage: "Erreur lors de l'export CSV",
                      showSuccessToast: false, // L'export ne nécessite pas de toast de succès
                    }
                  )}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>
              )}
              <Button className="gap-2 flex-1 sm:flex-initial" onClick={handleCreateNew}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau client</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </div>
          </div>

          {/* Search and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="lg:col-span-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un client..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="terminé">Terminé</SelectItem>
                    <SelectItem value="planifié">Planifié</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                  </SelectContent>
                </Select>
                <AdvancedFilters
                  filters={advancedFilters}
                  onFiltersChange={setAdvancedFilters}
                  showClientFilter={false}
                />
              </div>
            </div>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total clients</p>
                <p className="text-2xl font-bold text-foreground">{filteredClients.length}</p>
                {filteredClients.length !== clients?.length && (
                  <p className="text-xs text-muted-foreground mt-1">
                    sur {clients?.length || 0} total
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Clients Grid */}
          {/* Afficher toujours le contenu, même pendant le chargement initial
              Les hooks retournent des données mock après 3 secondes de timeout
              Cela évite les chargements infinis */}
          {isLoading && filteredClients.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement des clients...</span>
            </div>
          ) : filteredClients.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {paginatedClients.map((client) => {
                const projectsCount = getClientProjectsCount(client.id);
                const totalSpent = getClientTotalSpent(client.id);
                const avatarUrl = client.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(client.name)}`;
                
                return (
                  <Card key={client.id} className="hover:shadow-lg transition-all hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <img 
                            src={avatarUrl}
                            alt={client.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{client.name}</h3>
                            <Badge variant={getStatusColor(client.status)} className="mt-1 capitalize">
                              {client.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(client)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingClientId(client.id)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            {client.phone}
                          </div>
                        )}
                        {client.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {client.location}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <FolderKanban className="w-3 h-3" />
                              Chantiers
                            </div>
                            <p className="font-semibold text-foreground">{projectsCount}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Euro className="w-3 h-3" />
                              Total dépensé
                            </div>
                            <p className="font-semibold text-foreground">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalSpent)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? "Aucun client trouvé" : "Aucun client pour le moment"}</p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew}>
                  Créer votre premier client
                </Button>
              )}
            </div>
          )}

          {/* Info sur la pagination */}
          {filteredClients.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredClients.length)} sur {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""}
            </div>
          )}
          
          <ClientForm 
            open={isFormOpen} 
            onOpenChange={setIsFormOpen}
            client={editingClient || undefined}
          />

          <AlertDialog open={!!deletingClientId} onOpenChange={(open) => !open && setDeletingClientId(null)}>
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
                  onClick={() => deletingClientId && handleDelete(deletingClientId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default Clients;
