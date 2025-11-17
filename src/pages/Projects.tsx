import { useState, useEffect, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Plus,
  Calendar,
  Users,
  Euro,
  MapPin,
  ArrowRight,
  Loader2,
  Edit,
  Trash2,
  FolderKanban,
  Download,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { ProjectForm } from "@/components/ProjectForm";
import { Pagination } from "@/components/Pagination";
import { AdvancedFilters, AdvancedFiltersProps } from "@/components/AdvancedFilters";
import { useClients } from "@/hooks/useClients";
import { exportProjectsToCSV, exportProjectsToJSON } from "@/services/exportService";
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

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersProps["filters"]>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  
  // Les hooks retournent déjà des données mock en cas de timeout (3 secondes)
  // Cette approche évite les chargements infinis en affichant toujours du contenu
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const deleteProject = useDeleteProject();
  
  // Utiliser des données par défaut pour éviter les chargements infinis
  const displayProjects = projects || [];

  // Filtrer les projets selon la recherche, le statut et les filtres avancés avec useMemo
  const filteredProjects = useMemo(() => {
    if (!displayProjects || displayProjects.length === 0) return [];
    return displayProjects.filter(project => {
      // Recherche
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        project.name.toLowerCase().includes(searchLower) ||
        project.location?.toLowerCase().includes(searchLower) ||
        project.client?.name.toLowerCase().includes(searchLower);
      
      // Statut
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      
      // Filtres avancés
      const matchesClient = !advancedFilters.clientId || project.client_id === advancedFilters.clientId;
      
      const matchesBudget = 
        (!advancedFilters.minBudget || (project.budget && project.budget >= advancedFilters.minBudget)) &&
        (!advancedFilters.maxBudget || (project.budget && project.budget <= advancedFilters.maxBudget));
      
      const matchesStartDate = !advancedFilters.startDate || 
        (project.start_date && project.start_date >= advancedFilters.startDate);
      
      const matchesEndDate = !advancedFilters.endDate || 
        (project.end_date && project.end_date <= advancedFilters.endDate);
      
      return matchesSearch && matchesStatus && matchesClient && matchesBudget && matchesStartDate && matchesEndDate;
    });
  }, [displayProjects, searchQuery, statusFilter, advancedFilters]);

  // Pagination avec useMemo
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
    return { totalPages, paginatedProjects, startIndex, endIndex };
  }, [filteredProjects, currentPage]);
  
  const { totalPages, paginatedProjects, startIndex, endIndex } = paginationData;

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, advancedFilters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_cours":
        return "default";
      case "en_attente":
        return "secondary";
      case "terminé":
        return "outline";
      case "planifié":
        return "secondary";
      case "annulé":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "en_cours":
        return "En cours";
      case "en_attente":
        return "En attente";
      case "terminé":
        return "Terminé";
      case "planifié":
        return "Planifié";
      case "annulé":
        return "Annulé";
      default:
        return status;
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    await safeAction(
      async () => {
        await deleteProject.mutateAsync(projectId);
        setDeletingProjectId(null);
      },
      {
        successMessage: "Projet supprimé avec succès",
        errorMessage: "Erreur lors de la suppression du projet",
      }
    );
  };

  const handleCreateNew = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Chantiers</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Gérez tous vos chantiers en un seul endroit
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {filteredProjects.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => safeAction(
                      () => exportProjectsToCSV(filteredProjects),
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
                </div>
              )}
              <Button className="gap-2 flex-1 sm:flex-initial" onClick={handleCreateNew}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau chantier</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un chantier..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3 md:gap-4 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="planifié">Planifié</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="terminé">Terminé</SelectItem>
                  <SelectItem value="annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>
              <AdvancedFilters
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                clients={clients?.map(c => ({ id: c.id, name: c.name })) || []}
                showClientFilter={true}
              />
            </div>
          </div>

          {/* Projects Grid */}
          {/* Afficher toujours le contenu, même pendant le chargement initial
              Les hooks retournent des données mock après 3 secondes de timeout
              Cela évite les chargements infinis */}
          {isLoading && filteredProjects.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement des projets...</span>
            </div>
          ) : filteredProjects.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {paginatedProjects.map((project) => {
                const imageUrl = project.image_url || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400";
                
                return (
                  <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 group">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            handleEdit(project);
                          }}
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeletingProjectId(project.id);
                          }}
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-destructive text-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Badge variant={getStatusColor(project.status)} className="backdrop-blur-sm">
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <Link to={`/projects/${project.id}`}>
                          <h3 className="font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors cursor-pointer">
                            {project.name}
                          </h3>
                        </Link>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {project.client && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {project.client.name}
                            </div>
                          )}
                          {project.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {project.location}
                            </div>
                          )}
                          {project.budget && (
                            <div className="flex items-center gap-2">
                              <Euro className="w-4 h-4" />
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(project.budget)}
                            </div>
                          )}
                          {(project.start_date || project.end_date) && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(project.start_date)} - {formatDate(project.end_date)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium text-foreground">{project.progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      <Link to={`/projects/${project.id}`}>
                        <Button variant="ghost" className="w-full gap-2 group-hover:bg-primary/10 group-hover:text-primary">
                          Voir les détails
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
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
              <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery || statusFilter !== "all" ? "Aucun projet trouvé" : "Aucun projet pour le moment"}</p>
              {!searchQuery && statusFilter === "all" && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew}>
                  Créer votre premier projet
                </Button>
              )}
            </div>
          )}

          {/* Info sur la pagination */}
          {filteredProjects.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredProjects.length)} sur {filteredProjects.length} projet{filteredProjects.length > 1 ? "s" : ""}
            </div>
          )}

          <ProjectForm 
            open={isFormOpen} 
            onOpenChange={setIsFormOpen}
            project={editingProject || undefined}
          />

          <AlertDialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le projet</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingProjectId && handleDelete(deletingProjectId)}
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

export default Projects;
