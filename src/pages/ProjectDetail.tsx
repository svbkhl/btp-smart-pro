import { useParams, useNavigate, Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { safeAction } from "@/utils/safeAction";
import { ProjectForm } from "@/components/ProjectForm";
import { useState } from "react";
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

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "Non défini";
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const calculateDaysRemaining = (endDate: string | undefined) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Chargement du projet...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-2xl font-bold">Projet non trouvé</h2>
              <p className="text-muted-foreground">Le projet que vous recherchez n'existe pas ou a été supprimé.</p>
              <Button asChild>
                <Link to="/projects">Retour aux projets</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining(project.end_date);
  const isOverdue = daysRemaining !== null && daysRemaining < 0 && project.status !== "terminé";
  const imageUrl = project.image_url || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/projects">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{project.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusColor(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive">
                      En retard
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>

          {/* Image */}
          <Card className="overflow-hidden">
            <div className="relative h-64 md:h-96 overflow-hidden">
              <img 
                src={imageUrl} 
                alt={project.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Progression du projet</CardTitle>
                  <CardDescription>
                    {project.progress}% complété
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={project.progress} className="h-3" />
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Progression: {project.progress}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {project.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Détails du projet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.client && (
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Client</p>
                          <p className="text-sm text-muted-foreground">{project.client.name}</p>
                          {project.client.email && (
                            <p className="text-xs text-muted-foreground">{project.client.email}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {project.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Lieu</p>
                          <p className="text-sm text-muted-foreground">{project.location}</p>
                        </div>
                      </div>
                    )}

                    {project.budget && (
                      <div className="flex items-start gap-3">
                        <Euro className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Budget</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(project.budget)}</p>
                        </div>
                      </div>
                    )}

                    {project.start_date && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Date de début</p>
                          <p className="text-sm text-muted-foreground">{formatDate(project.start_date)}</p>
                        </div>
                      </div>
                    )}

                    {project.end_date && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Date de fin</p>
                          <p className="text-sm text-muted-foreground">{formatDate(project.end_date)}</p>
                          {daysRemaining !== null && (
                            <p className={`text-xs ${isOverdue ? 'text-destructive' : daysRemaining <= 7 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                              {isOverdue 
                                ? `${Math.abs(daysRemaining)} jour(s) de retard`
                                : daysRemaining === 0
                                ? "Aujourd'hui"
                                : `${daysRemaining} jour(s) restant(s)`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge variant={getStatusColor(project.status)} className="mt-1">
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Progression</p>
                    <p className="text-2xl font-bold mt-1">{project.progress}%</p>
                  </div>
                  {project.budget && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(project.budget)}</p>
                      </div>
                    </>
                  )}
                  {project.start_date && project.end_date && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Durée</p>
                        <p className="text-lg font-semibold mt-1">
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => setIsEditOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier le projet
                  </Button>
                  {project.client && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={`/clients`}>
                        <Users className="h-4 w-4 mr-2" />
                        Voir le client
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Créé le</span>
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modifié le</span>
                    <span>{formatDate(project.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <ProjectForm 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen}
        project={project}
      />

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le projet</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{project.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetail;

