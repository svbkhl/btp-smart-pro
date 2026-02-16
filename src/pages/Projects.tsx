import { useState, useEffect, useMemo, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { KPIBlock } from "@/components/ui/KPIBlock";
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
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { usePermissions } from "@/hooks/usePermissions";
import { ProjectForm } from "@/components/ProjectForm";
import { Pagination } from "@/components/Pagination";
import { AdvancedFilters, AdvancedFiltersProps } from "@/components/AdvancedFilters";
import { useClients } from "@/hooks/useClients";
import { exportProjectsToCSV } from "@/services/exportService";
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
import { motion } from "framer-motion";

const ITEMS_PER_PAGE = 12;

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300); // Debounce 300ms
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersProps["filters"]>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const { isEmployee } = usePermissions();
  const deleteProject = useDeleteProject();
  
  const displayProjects = projects || [];

  const filteredProjects = useMemo(() => {
    if (!displayProjects || displayProjects.length === 0) return [];
    return displayProjects.filter(project => {
      const searchLower = debouncedSearchQuery.toLowerCase(); // Utilise la valeur debouncée
      const matchesSearch = 
        project.name.toLowerCase().includes(searchLower) ||
        project.location?.toLowerCase().includes(searchLower) ||
        project.client?.name.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      
      const matchesClient = !advancedFilters.clientId || project.client_id === advancedFilters.clientId;
      
      const matchesBudget = isEmployee
        ? true
        : ((!advancedFilters.minBudget || (project.budget && project.budget >= advancedFilters.minBudget)) &&
           (!advancedFilters.maxBudget || (project.budget && project.budget <= advancedFilters.maxBudget)));
      
      const matchesStartDate = !advancedFilters.startDate || 
        (project.start_date && project.start_date >= advancedFilters.startDate);
      
      const matchesEndDate = !advancedFilters.endDate || 
        (project.end_date && project.end_date <= advancedFilters.endDate);
      
      return matchesSearch && matchesStatus && matchesClient && matchesBudget && matchesStartDate && matchesEndDate;
    });
  }, [displayProjects, debouncedSearchQuery, statusFilter, advancedFilters, isEmployee]);

  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
    return { totalPages, paginatedProjects, startIndex, endIndex };
  }, [filteredProjects, currentPage]);
  
  const { totalPages, paginatedProjects, startIndex, endIndex } = paginationData;

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

  // Calculer les KPIs
  const stats = useMemo(() => {
    const active = filteredProjects.filter(p => p.status === "en_cours").length;
    const completed = filteredProjects.filter(p => p.status === "terminé").length;
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    return { active, completed, totalBudget, total: filteredProjects.length };
  }, [filteredProjects]);

  return (
    <PageLayout>
      <div className="w-full max-w-full px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-4 sm:space-y-6 md:space-y-8 bg-transparent">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              {isEmployee ? "Mes chantiers" : "Chantiers"}
            </h1>
            <p className="text-muted-foreground text-base">
              {isEmployee ? "Vos affectations de chantiers" : "Gérez tous vos chantiers en un seul endroit"}
            </p>
          </div>
          {!isEmployee && (
          <Button
            onClick={handleCreateNew}
            className="gap-2 rounded-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/30 hover:border-white/30 dark:hover:border-white/20 hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau chantier</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
          )}
        </motion.div>

        {/* KPI Stats — masqués pour les employés (pas de CA, nb chantiers, etc.) */}
        {!isEmployee && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-xl bg-card/50 backdrop-blur-xl border border-border/30 shadow-lg hover:shadow-xl transition-shadow duration-200 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total chantiers</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.total}</h3>
                <p className="text-xs text-muted-foreground mt-2">{stats.active} en cours</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-xl bg-card/50 backdrop-blur-xl border border-border/30 shadow-lg hover:shadow-xl transition-shadow duration-200 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">En cours</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.active}</h3>
                <p className="text-xs text-muted-foreground mt-2">Chantiers actifs</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="rounded-xl bg-card/50 backdrop-blur-xl border border-border/30 shadow-lg hover:shadow-xl transition-shadow duration-200 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Terminés</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.completed}</h3>
                <p className="text-xs text-muted-foreground mt-2">Chantiers complétés</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="rounded-xl bg-card/50 backdrop-blur-xl border border-border/30 shadow-lg hover:shadow-xl transition-shadow duration-200 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Budget total</p>
                <h3 className="text-3xl font-bold text-foreground">
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR', 
                    maximumFractionDigits: 0 
                  }).format(stats.totalBudget)}
                </h3>
                <p className="text-xs text-muted-foreground mt-2">Budget cumulé</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 flex items-center justify-center">
                <Euro className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </motion.div>
        </div>
        )}

        {/* Search and Filters */}
        <GlassCard delay={0.5} className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un chantier..." 
                className="pl-11 sm:pl-12 rounded-xl border-white/20 dark:border-gray-700/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 rounded-lg"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-auto min-w-[140px] sm:min-w-[180px] rounded-xl border-white/20 dark:border-gray-700/30">
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
                showBudgetFilter={!isEmployee}
              />
            </div>
          </div>
        </GlassCard>

        {/* Projects Grid */}
        {isLoading && filteredProjects.length === 0 ? (
          <GlassCard className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement des projets...</span>
            </div>
          </GlassCard>
        ) : filteredProjects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1600px]:grid-cols-6 gap-4 md:gap-5 lg:gap-6">
              {paginatedProjects.map((project, index) => {
                const imageUrl = project.image_url || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400";
                
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                  >
                    <GlassCard delay={0.6 + index * 0.05} className="overflow-hidden hover:scale-[1.02] transition-all">
                      <div className="relative h-48 overflow-hidden rounded-t-2xl">
                        <img 
                          src={imageUrl} 
                          alt={project.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-150 hover:scale-110"
                          style={{ willChange: 'transform' }}
                        />
                        <div className="absolute top-4 right-4 flex gap-2">
                          {!isEmployee && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleEdit(project);
                                }}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDeletingProjectId(project.id);
                                }}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Badge variant={getStatusColor(project.status)} className="backdrop-blur-sm rounded-lg">
                            {getStatusLabel(project.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <Link to={`/projects/${project.id}`}>
                            <h3 className="font-semibold text-lg text-foreground mb-2 hover:text-primary transition-colors cursor-pointer">
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
                            {!isEmployee && project.budget && (
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
                            <motion.div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${project.progress}%` }}
                              transition={{ duration: 0.2, delay: 0.7 + index * 0.05 }}
                            />
                          </div>
                        </div>

                        <Link to={`/projects/${project.id}`}>
                          <Button variant="outline" className="w-full gap-2">
                            Voir les détails
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </GlassCard>
                  </motion.div>
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
          <GlassCard className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <FolderKanban className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== "all" ? "Aucun projet trouvé" : "Aucun projet pour le moment"}
              </h3>
              {!searchQuery && statusFilter === "all" && (
                <Button variant="outline" className="mt-4 rounded-xl" onClick={handleCreateNew}>
                  Créer votre premier projet
                </Button>
              )}
            </div>
          </GlassCard>
        )}

        {/* Info sur la pagination */}
        {filteredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center text-sm text-muted-foreground bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl px-4 py-2 inline-block"
          >
            Affichage de {startIndex + 1} à {Math.min(endIndex, filteredProjects.length)} sur {filteredProjects.length} projet{filteredProjects.length > 1 ? "s" : ""}
          </motion.div>
        )}

        <ProjectForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen}
          project={editingProject || undefined}
        />

        <AlertDialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le projet</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingProjectId && handleDelete(deletingProjectId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
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

export default Projects;
