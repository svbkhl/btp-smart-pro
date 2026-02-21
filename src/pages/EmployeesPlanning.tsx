import { useState, useEffect, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/ui/BackButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Clock,
  Users,
  Edit2,
  Loader2,
  Plus,
  Download,
  TrendingUp,
  UserPlus,
  Briefcase,
} from "lucide-react";
import { useSyncPlanningWithGoogle } from "@/hooks/usePlanningSync";
import { useGoogleCalendarConnection } from "@/hooks/useGoogleCalendar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { FAKE_EMPLOYEES } from "@/fakeData/employees";
import { FAKE_PROJECTS } from "@/fakeData/projects";
import { FAKE_ASSIGNMENTS } from "@/fakeData/planning";
import { exportPlanningPDF } from "@/services/planningPdfService";
import { useUserSettings } from "@/hooks/useUserSettings";

interface Employee {
  id: string;
  nom: string;
  prenom?: string;
  poste?: string;
  specialites?: string[];
}

interface Project {
  id: string;
  name: string;
  location?: string;
}

interface Assignment {
  id: string;
  employee_id: string;
  project_id: string;
  jour: string;
  heures: number;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
}

const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];

const EmployeesPlanning = () => {
  const { user, isAdmin, currentCompanyId } = useAuth();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();
  const { data: settings } = useUserSettings();
  const { data: googleConnection } = useGoogleCalendarConnection();
  const syncPlanning = useSyncPlanningWithGoogle();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    employeeId?: string;
    jour?: string;
    date?: string;
    assignment?: Assignment;
  }>({ open: false });
  const [editForm, setEditForm] = useState({
    project_id: "",
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
  });
  const [addEmployeeDialog, setAddEmployeeDialog] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    nom: "",
    prenom: "",
    poste: "",
    specialites: "",
  });

  // Calculer les dates de la semaine
  const weekDates = useMemo(() => {
    const monday = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return JOURS_SEMAINE.map((_, index) => addDays(monday, index));
  }, [currentWeek]);

  // Export PDF
  const handleExportPDF = async () => {
    try {
      const weekStart = weekDates[0];
      const weekEnd = weekDates[4];
      
      await exportPlanningPDF({
        employees,
        projects,
        assignments,
        weekStart,
        weekEnd,
        companyName: settings?.company_name || "BTP Smart Pro",
        companyLogo: settings?.company_logo_url,
      });
      
      toast({
        title: "PDF généré",
        description: "Le planning global a été exporté en PDF.",
      });
    } catch (error: any) {
      console.error("Erreur export PDF:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'exporter le PDF",
        variant: "destructive",
      });
    }
  };

  // Charger les données
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentWeek]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Mode démo : utiliser les données fake
      if (fakeDataEnabled) {
        setEmployees(FAKE_EMPLOYEES.map(emp => ({
          id: emp.id,
          nom: emp.nom,
          prenom: emp.prenom,
          poste: emp.poste,
          specialites: emp.specialites,
        })));
        setProjects(FAKE_PROJECTS.map(proj => ({
          id: proj.id,
          name: proj.name,
          location: proj.location,
        })));
        setAssignments(FAKE_ASSIGNMENTS);
        setLoading(false);
        return;
      }

      // Mode production : charger depuis Supabase
      // Récupérer les employés directement depuis la table employees
      console.log("🔵 [EmployeesPlanning] Récupération des employés");
      console.log("🔵 [EmployeesPlanning] - currentCompanyId:", currentCompanyId);
      console.log("🔵 [EmployeesPlanning] - isAdmin:", isAdmin);
      console.log("🔵 [EmployeesPlanning] - user.id:", user?.id);
      
      let query = supabase
        .from("employees")
        .select("id, user_id, nom, prenom, poste, specialites, email, company_id")
        .order("created_at", { ascending: false });

      // Si un company_id est défini, filtrer par celui-ci
      // Sinon, récupérer tous les employés (pour les admins sans entreprise)
      if (currentCompanyId) {
        console.log("🔵 [EmployeesPlanning] Filtre par company_id:", currentCompanyId);
        query = query.eq("company_id", currentCompanyId);
      } else {
        console.log("⚠️ [EmployeesPlanning] Pas de company_id défini - récupération de tous les employés");
      }

      const { data: employeesData, error: employeesError } = await query;

      console.log("🔵 [EmployeesPlanning] Résultat employees:", { 
        count: employeesData?.length, 
        employeesData, 
        employeesError 
      });

      if (employeesError) {
        console.error("❌ [EmployeesPlanning] Erreur récupération employees:", employeesError);
        throw employeesError;
      }
      
      // Mapper les données pour correspondre à l'interface Employee
      const mappedEmployees = (employeesData || []).map((emp: any) => ({
        id: emp.id,
        nom: emp.nom || emp.email,
        prenom: emp.prenom || '',
        poste: emp.poste || 'Employé',
        specialites: emp.specialites || []
      }));
      
      console.log("🔵 [EmployeesPlanning] Employés mappés:", mappedEmployees);
      console.log("🔵 [EmployeesPlanning] Nombre d'employés:", mappedEmployees.length);
      setEmployees(mappedEmployees);

      // Récupérer les projets (sans location, colonne optionnelle selon le schéma)
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", currentCompanyId)
        .order("name");

      if (projectsError) {
        console.error("Error fetching projects:", projectsError);
        setProjects([]);
      } else {
        const mappedProjects = (projectsData || []).map((proj: any) => ({
          id: proj.id,
          name: proj.name,
          location: proj.location || "",
        }));
        setProjects(mappedProjects);
      }

      // Récupérer les affectations de la semaine
      const weekStart = weekDates[0];
      const weekEnd = weekDates[4];

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("employee_assignments")
        .select("*")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Obtenir les affectations pour un employé et un jour
  const getAssignments = (employeeId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return assignments.filter(
      (a) => a.employee_id === employeeId && a.date === dateStr
    );
  };

  // Obtenir le projet d'une affectation
  const getProject = (projectId: string) => {
    return projects.find((p) => p.id === projectId);
  };

  // Ouvrir le dialog d'édition
  const openEditDialog = (
    employeeId: string,
    jour: string,
    date: Date,
    assignment?: Assignment
  ) => {
    if (assignment) {
      setEditForm({
        project_id: assignment.project_id,
        heures: assignment.heures,
        heure_debut: assignment.heure_debut || "08:00",
        heure_fin: assignment.heure_fin || "17:00",
      });
    } else {
      setEditForm({
        project_id: "",
        heures: 8,
        heure_debut: "08:00",
        heure_fin: "17:00",
      });
    }

    setEditDialog({
      open: true,
      employeeId,
      jour,
      date: format(date, "yyyy-MM-dd"),
      assignment,
    });
  };

  // Sauvegarder l'affectation
  const saveAssignment = async () => {
    if (!editDialog.employeeId || !editDialog.date || !editForm.project_id) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    try {
      let assignmentId: string;

      if (editDialog.assignment) {
        // Mise à jour
        const { error } = await supabase
          .from("employee_assignments")
          .update({
            project_id: editForm.project_id,
            heures: editForm.heures,
            heure_debut: editForm.heure_debut,
            heure_fin: editForm.heure_fin,
          })
          .eq("id", editDialog.assignment.id);

        if (error) throw error;
        assignmentId = editDialog.assignment.id;
      } else {
        // Création
        const { data: newAssignment, error } = await supabase.from("employee_assignments").insert({
          employee_id: editDialog.employeeId,
          project_id: editForm.project_id,
          jour: editDialog.jour!,
          date: editDialog.date,
          heures: editForm.heures,
          heure_debut: editForm.heure_debut,
          heure_fin: editForm.heure_fin,
          company_id: currentCompanyId, // Ajouter company_id
        }).select("id").single();

        if (error) throw error;
        assignmentId = newAssignment.id;
      }

      // Synchroniser avec Google Calendar si connecté et activé
      if (googleConnection && googleConnection.sync_planning_enabled && assignmentId) {
        try {
          await syncPlanning.mutateAsync({
            assignment_id: assignmentId,
            action: editDialog.assignment ? "update" : "create",
          });
        } catch (syncError) {
          console.error("Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer l'utilisateur si la sync échoue
        }
      }

      toast({
        title: "Succès",
        description: "Affectation enregistrée",
      });

      setEditDialog({ open: false });
      fetchData();
    } catch (error: any) {
      console.error("Error saving assignment:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'affectation",
        variant: "destructive",
      });
    }
  };

  // Supprimer une affectation
  const deleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("employee_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      // Synchroniser avec Google Calendar si connecté et sync planning activée
      if (
        googleConnection &&
        googleConnection.enabled &&
        googleConnection.sync_planning_enabled &&
        googleConnection.sync_direction !== "google_to_app"
      ) {
        try {
          await syncPlanning.mutateAsync({
            action: "delete",
            assignmentId,
          });
        } catch (syncError: any) {
          console.error("⚠️ [deleteAssignment] Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer l'opération si la sync échoue
        }
      }

      toast({
        title: "Succès",
        description: "Affectation supprimée",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'affectation",
        variant: "destructive",
      });
    }
  };

  // Filtrer les employés par projet
  const filteredEmployees = useMemo(() => {
    if (selectedProject === "all") return employees;

    return employees.filter((emp) => {
      return assignments.some(
        (a) => a.employee_id === emp.id && a.project_id === selectedProject
      );
    });
  }, [employees, assignments, selectedProject]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const weekStart = weekDates[0];
    const weekEnd = weekDates[4];
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const weekEndStr = format(weekEnd, "yyyy-MM-dd");

    const weekAssignments = assignments.filter(
      (a) => a.date >= weekStartStr && a.date <= weekEndStr
    );

    const totalHeures = weekAssignments.reduce((sum, a) => sum + a.heures, 0);
    const employeesCount = new Set(weekAssignments.map((a) => a.employee_id))
      .size;
    const projectsCount = new Set(weekAssignments.map((a) => a.project_id)).size;

    return {
      totalHeures,
      employeesCount,
      projectsCount,
    };
  }, [assignments, weekDates]);

  if (loading) {
    return (
      <PageLayout>
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          <GlassCard className="p-12">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Chargement du planning...</p>
            </div>
          </GlassCard>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Bouton retour */}
        <BackButton />
        
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Planning Employés
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Gérez les affectations des employés aux chantiers
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl"
              onClick={handleExportPDF}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exporter PDF</span>
            </Button>
            {isAdmin && (
              <Button 
                size="sm"
                className="gap-2 rounded-xl"
                onClick={() => setAddEmployeeDialog(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter employé</span>
              </Button>
            )}
          </div>
        </div>

        {/* Statistiques de la semaine */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{stats.totalHeures}h</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total heures</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{stats.employeesCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Employés actifs</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{stats.projectsCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Chantiers actifs</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Liste des employés */}
        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Employés ({employees.length})
            </h3>
            {employees.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {stats.employeesCount} actifs cette semaine
              </Badge>
            )}
          </div>
          
          {employees.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Aucun employé</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Commencez par ajouter des employés à votre équipe pour gérer leurs affectations sur les chantiers.
                </p>
                {isAdmin && (
                  <Button 
                    className="gap-2 rounded-xl"
                    onClick={() => setAddEmployeeDialog(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Ajouter votre premier employé
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                Cliquez sur un employé dans le planning pour créer ou modifier une affectation
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="p-3 sm:p-4 rounded-xl border border-white/20 dark:border-white/10 hover:border-primary/30 dark:hover:border-primary/20 transition-all cursor-pointer bg-transparent backdrop-blur-xl hover:bg-white/5 dark:hover:bg-white/5 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm sm:text-base">
                            {employee.prenom} {employee.nom}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {employee.poste}
                          </p>
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {employee.specialites && employee.specialites.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {employee.specialites.slice(0, 3).map((spec, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs px-2 py-0.5 rounded-md"
                          >
                            {spec}
                          </Badge>
                        ))}
                        {employee.specialites.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            +{employee.specialites.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>

        {/* Planning hebdomadaire */}
        <GlassCard className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planning hebdomadaire
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                className="rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium px-3">
                Semaine du {format(weekDates[0], "d", { locale: fr })} au{" "}
                {format(weekDates[4], "d MMM", { locale: fr })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
                className="rounded-xl"
              >
                Aujourd'hui
              </Button>
              {selectedProject !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProject("all")}
                  className="rounded-xl text-xs"
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                  <Briefcase className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Aucune affectation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedProject !== "all" 
                    ? "Aucun employé n'est affecté à ce chantier cette semaine."
                    : "Aucun employé n'a d'affectation cette semaine."}
                </p>
                {selectedProject !== "all" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProject("all")}
                    className="rounded-xl"
                  >
                    Voir tous les employés
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 font-semibold min-w-[150px]">
                      Employé
                    </th>
                    {weekDates.map((date, index) => (
                      <th key={index} className="text-center p-3 font-semibold min-w-[120px]">
                        <div>
                          <div className="capitalize">
                            {format(date, "EEE", { locale: fr })}
                          </div>
                          <div className="text-xs text-muted-foreground font-normal">
                            {format(date, "d MMM", { locale: fr })}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {employee.prenom} {employee.nom}
                            </div>
                            {employee.poste && (
                              <div className="text-xs text-muted-foreground">
                                {employee.poste}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {weekDates.map((date, dayIndex) => {
                        const dayAssignments = getAssignments(employee.id, date);
                        const hasAssignments = dayAssignments.length > 0;

                        return (
                          <td
                            key={dayIndex}
                            className="p-2 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() =>
                              openEditDialog(
                                employee.id,
                                JOURS_SEMAINE[dayIndex],
                                date,
                                dayAssignments[0]
                              )
                            }
                          >
                            {hasAssignments ? (
                              <div className="space-y-1.5">
                                {dayAssignments.map((assignment) => {
                                  const project = getProject(assignment.project_id);
                                  return (
                                    <div
                                      key={assignment.id}
                                      className="text-xs p-2.5 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10 hover:bg-white/70 dark:hover:bg-black/30 hover:border-white/40 dark:hover:border-white/15 transition-all shadow-sm"
                                    >
                                      <div className="font-medium truncate">
                                        {project?.name || "Chantier"}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {assignment.heures}h
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground py-2">
                                Disponible
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Statistiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Heures par employé */}
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Heures par employé</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Total des heures travaillées cette semaine
            </p>
            <div className="space-y-2">
              {employees.map((employee) => {
                // Filtrer par employé ET par semaine en cours
                const weekStart = format(weekDates[0], "yyyy-MM-dd");
                const weekEnd = format(weekDates[4], "yyyy-MM-dd");
                const employeeAssignments = assignments.filter(
                  (a) =>
                    a.employee_id === employee.id &&
                    a.date >= weekStart &&
                    a.date <= weekEnd
                );
                const totalHeures = employeeAssignments.reduce(
                  (sum, a) => sum + a.heures,
                  0
                );
                
                // Ne pas afficher si 0 heures cette semaine
                if (totalHeures === 0) return null;
                
                return (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">
                          {employee.prenom} {employee.nom}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employee.poste}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-semibold">
                      {totalHeures}h
                    </Badge>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Heures par chantier */}
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Heures par chantier</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Total des heures investies par projet
            </p>
            <div className="space-y-2">
              {projects.map((project) => {
                // Filtrer par projet ET par semaine en cours
                const weekStart = format(weekDates[0], "yyyy-MM-dd");
                const weekEnd = format(weekDates[4], "yyyy-MM-dd");
                const projectAssignments = assignments.filter(
                  (a) =>
                    a.project_id === project.id &&
                    a.date >= weekStart &&
                    a.date <= weekEnd
                );
                const totalHeures = projectAssignments.reduce(
                  (sum, a) => sum + a.heures,
                  0
                );
                
                // Ne pas afficher si 0 heures cette semaine
                if (totalHeures === 0) return null;
                
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{project.name}</p>
                        {project.location && (
                          <p className="text-xs text-muted-foreground">
                            {project.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-semibold">
                      {totalHeures}h
                    </Badge>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Dialog d'ajout d'employé */}
        <Dialog open={addEmployeeDialog} onOpenChange={setAddEmployeeDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ajouter un employé</DialogTitle>
              <DialogDescription>
                Créez un nouvel employé pour le planning
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input
                    value={employeeForm.prenom}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, prenom: e.target.value })
                    }
                    placeholder="Ex: Jean"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={employeeForm.nom}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, nom: e.target.value })
                    }
                    placeholder="Ex: Dupont"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Poste *</Label>
                <Input
                  value={employeeForm.poste}
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, poste: e.target.value })
                  }
                  placeholder="Ex: Maçon, Plombier, Électricien..."
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Spécialités</Label>
                <Input
                  value={employeeForm.specialites}
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, specialites: e.target.value })
                  }
                  placeholder="Séparées par des virgules (ex: Maçonnerie, Enduit, Carrelage)"
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Séparez les spécialités par des virgules
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddEmployeeDialog(false);
                  setEmployeeForm({
                    nom: "",
                    prenom: "",
                    poste: "",
                    specialites: "",
                  });
                }}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  if (!employeeForm.nom || !employeeForm.prenom || !employeeForm.poste) {
                    toast({
                      title: "Champs requis",
                      description: "Veuillez remplir tous les champs obligatoires",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    if (fakeDataEnabled) {
                      // Mode démo : ajouter localement
                      const newEmployee: Employee = {
                        id: `emp-${Date.now()}`,
                        nom: employeeForm.nom,
                        prenom: employeeForm.prenom,
                        poste: employeeForm.poste,
                        specialites: employeeForm.specialites
                          .split(",")
                          .map((s) => s.trim())
                          .filter((s) => s),
                      };
                      setEmployees([...employees, newEmployee]);
                      toast({
                        title: "Employé ajouté",
                        description: `${newEmployee.prenom} ${newEmployee.nom} a été ajouté avec succès`,
                      });
                    } else {
                      // Mode production : sauvegarder dans Supabase
                      const specialitesArray = employeeForm.specialites
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s);

                      const { data, error } = await supabase
                        .from("employees")
                        .insert([
                          {
                            user_id: user?.id,
                            nom: employeeForm.nom,
                            prenom: employeeForm.prenom,
                            poste: employeeForm.poste,
                            specialites: specialitesArray,
                          },
                        ])
                        .select()
                        .single();

                      if (error) throw error;

                      setEmployees([...employees, data]);
                      toast({
                        title: "Employé ajouté",
                        description: `${data.prenom} ${data.nom} a été ajouté avec succès`,
                      });
                    }

                    setAddEmployeeDialog(false);
                    setEmployeeForm({
                      nom: "",
                      prenom: "",
                      poste: "",
                      specialites: "",
                    });
                  } catch (error) {
                    console.error("Error adding employee:", error);
                    toast({
                      title: "Erreur",
                      description: "Impossible d'ajouter l'employé",
                      variant: "destructive",
                    });
                  }
                }}
                className="rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog d'édition d'affectation */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open })}>
          <DialogContent className="sm:max-w-[500px] z-[60]">
            <DialogHeader>
              <DialogTitle>
                {editDialog.assignment ? "Modifier" : "Ajouter"} une affectation
              </DialogTitle>
              <DialogDescription>
                {editDialog.jour && `Pour ${editDialog.jour}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Chantier</Label>
                <Select
                  value={editForm.project_id}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, project_id: value })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner un chantier" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Heure début</Label>
                  <Input
                    type="time"
                    value={editForm.heure_debut}
                    onChange={(e) =>
                      setEditForm({ ...editForm, heure_debut: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Heure fin</Label>
                  <Input
                    type="time"
                    value={editForm.heure_fin}
                    onChange={(e) =>
                      setEditForm({ ...editForm, heure_fin: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nombre d'heures</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={editForm.heures}
                  onChange={(e) =>
                    setEditForm({ ...editForm, heures: parseInt(e.target.value) || 0 })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialog({ open: false })}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button onClick={saveAssignment} className="rounded-xl">
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default EmployeesPlanning;
