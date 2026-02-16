import { useParams, useNavigate, Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Users,
  Euro,
  MapPin,
  FileText,
  Loader2,
  FolderKanban,
  TrendingUp,
  Clock
} from "lucide-react";
import { useProject, useDeleteProject } from "@/hooks/useProjects";
import { usePermissions } from "@/hooks/usePermissions";
import { safeAction } from "@/utils/safeAction";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectTimeline } from "@/components/ProjectTimeline";
import { ProjectComments } from "@/components/ProjectComments";
import { ProjectAssignEmployees } from "@/components/ProjectAssignEmployees";
import { useState, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isEmployee } = usePermissions();
  const { data: project, isLoading, error } = useProject(id);
  const deleteProject = useDeleteProject();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    await safeAction(
      async () => {
        await deleteProject.mutateAsync(id);
        navigate("/projects");
      },
      {
        successMessage: "Projet supprimé avec succès",
        errorMessage: "Erreur lors de la suppression du projet",
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_cours": return "default";
      case "en_attente": return "secondary";
      case "terminé": return "outline";
      case "planifié": return "secondary";
      case "annulé": return "destructive";
      default: return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "en_cours": return "En cours";
      case "en_attente": return "En attente";
      case "terminé": return "Terminé";
      case "planifié": return "Planifié";
      case "annulé": return "Annulé";
      default: return status;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const daysRemaining = useMemo(() => {
    if (!project?.end_date) return null;
    const endDate = new Date(project.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [project?.end_date]);

  const isOverdue = useMemo(() => {
    if (!project?.end_date || project.status === "terminé" || project.status === "annulé") return false;
    return new Date(project.end_date) < new Date();
  }, [project?.end_date, project?.status]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (error || !project) {
    return (
      <PageLayout>
        <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8">
          <GlassCard className="p-12">
            <div className="text-center">
              <FolderKanban className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-2xl font-semibold mb-2">Projet non trouvé</h2>
              <p className="text-muted-foreground mb-4">
                Le projet que vous recherchez n'existe pas ou a été supprimé.
              </p>
              <Link to="/projects">
                <Button className="rounded-xl">Retour aux projets</Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </PageLayout>
    );
  }

  const progress = project.progress || 0;
  const imageUrl = project.image_url || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800";

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Link to="/projects">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                {project.name}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(project.status)} className="rounded-lg">
                  {getStatusLabel(project.status)}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="rounded-lg">
                    En retard
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {!isEmployee && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </div>
          )}
        </motion.div>

        {/* KPI Stats — Budget masqué pour employés */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPIBlock
            title="Progression"
            value={`${progress}%`}
            icon={TrendingUp}
            description="Avancement du projet"
            delay={0.1}
            gradient="blue"
          />
          {!isEmployee && (
          <KPIBlock
            title="Budget"
            value={new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR', 
              maximumFractionDigits: 0 
            }).format(project.budget || 0)}
            icon={Euro}
            description="Budget alloué"
            delay={0.2}
            gradient="green"
          />
          )}
          <KPIBlock
            title={daysRemaining !== null ? (daysRemaining > 0 ? "Jours restants" : "Jours de retard") : "Date de fin"}
            value={daysRemaining !== null ? Math.abs(daysRemaining).toString() : formatDate(project.end_date)}
            icon={Clock}
            description={project.end_date ? formatDate(project.end_date) : "Non définie"}
            delay={0.3}
            gradient={isOverdue ? "orange" : "purple"}
          />
          <KPIBlock
            title="Client"
            value={typeof project.client === "string" ? project.client : project.client?.name || "Non assigné"}
            icon={Users}
            description="Client assigné"
            delay={isEmployee ? 0.2 : 0.4}
            gradient="orange"
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Image & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Image */}
            <GlassCard delay={0.5} className="overflow-hidden p-0">
              <img 
                src={imageUrl} 
                alt={project.name}
                loading="lazy"
                decoding="async"
                className="w-full h-64 md:h-96 object-cover"
              />
            </GlassCard>

            {/* Project Details */}
            <GlassCard delay={0.6} className="p-6">
              <h2 className="text-xl font-semibold mb-4">Détails du projet</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="w-4 h-4" />
                    Localisation
                  </div>
                  <p className="font-medium">{project.location || "Non spécifiée"}</p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    Dates
                  </div>
                  <div className="space-y-1">
                    <p><strong>Début:</strong> {formatDate(project.start_date)}</p>
                    <p><strong>Fin prévue:</strong> {formatDate(project.end_date)}</p>
                  </div>
                </div>
                {project.description && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Description</div>
                      <p className="text-sm whitespace-pre-line">{project.description}</p>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>

            {/* Progress */}
            <GlassCard delay={0.7} className="p-6">
              <h2 className="text-xl font-semibold mb-4">Progression</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avancement</span>
                  <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                {isOverdue && (
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      ⚠️ Ce projet est en retard. La date de fin prévue est dépassée.
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            {/* Affecter des employés (owner uniquement) */}
            {!isEmployee && (
              <ProjectAssignEmployees projectId={project.id} />
            )}

            {project.client && (
              <GlassCard delay={0.8} className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Client
                </h3>
                <div className="space-y-2">
                  <p className="font-medium">
                    {typeof project.client === "string" ? project.client : project.client.name}
                  </p>
                  {typeof project.client !== "string" && project.client.email && (
                    <p className="text-sm text-muted-foreground">{project.client.email}</p>
                  )}
                  {typeof project.client !== "string" && project.client.location && (
                    <p className="text-sm text-muted-foreground">{project.client.location}</p>
                  )}
                  <Link to={`/clients`}>
                    <Button variant="outline" size="sm" className="w-full mt-4 rounded-xl">
                      Voir le client
                    </Button>
                  </Link>
                </div>
              </GlassCard>
            )}

            {/* Quick Actions */}
            <GlassCard delay={0.9} className="p-6">
              <h3 className="font-semibold mb-4">Actions rapides</h3>
              <div className="space-y-2">
                <Link to={`/facturation`}>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    {isEmployee ? "Mes devis" : "Voir les devis"}
                  </Button>
                </Link>
                {!isEmployee && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier le projet
                </Button>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Timeline et Commentaires */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectTimeline projectId={project.id} />
          <ProjectComments projectId={project.id} />
        </div>

        <ProjectForm
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          project={project}
        />

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
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
                onClick={handleDelete}
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

export default ProjectDetail;
