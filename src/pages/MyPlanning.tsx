import { useState, useEffect, useMemo, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Building2, User, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/components/ui/use-toast";
import { useProjects } from "@/hooks/useProjects";
import { useSyncPlanningWithGoogle } from "@/hooks/usePlanningSync";
import { useGoogleCalendarConnection } from "@/hooks/useGoogleCalendar";
import { useSyncPlanningToCalendar } from "@/hooks/usePlanningCalendarSync";
import { format } from "date-fns";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { FAKE_EMPLOYEES } from "@/fakeData/employees";
import { FAKE_ASSIGNMENTS } from "@/fakeData/planning";

interface Assignment {
  id: string;
  project_id?: string;
  title?: string; // Titre personnalisé si pas de chantier
  jour: string;
  heures: number;
  date: string;
  heure_debut?: string; // Format HH:mm (ex: "08:00")
  heure_fin?: string; // Format HH:mm (ex: "17:00")
  project?: {
    name: string;
    location?: string;
  };
}

const joursSemaine = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];

interface MyPlanningProps {
  /** Quand true, le composant est affiché sans PageLayout (ex: dans Calendar) */
  embedded?: boolean;
}

const MyPlanning = ({ embedded = false }: MyPlanningProps = {}) => {
  const { user, currentCompanyId, isAdmin } = useAuth();
  const { companyId } = useCompanyId();
  const effectiveCompanyId = currentCompanyId || companyId;
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();
  const { data: projects = [] } = useProjects();
  const { data: googleConnection } = useGoogleCalendarConnection();
  const syncPlanning = useSyncPlanningWithGoogle();
  const syncToCalendar = useSyncPlanningToCalendar();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editingHours, setEditingHours] = useState<{ 
    assignmentId: string; 
    heures: number;
    heure_debut?: string;
    heure_fin?: string;
  } | null>(null);
  const [editAssignmentDialog, setEditAssignmentDialog] = useState<{
    open: boolean;
    jour?: string;
    date?: string;
    assignment?: Assignment;
  }>({ open: false });
  const [assignmentDetailDialog, setAssignmentDetailDialog] = useState<{
    open: boolean;
    assignment?: Assignment;
    date?: Date;
  }>({ open: false });
  const [assignmentForm, setAssignmentForm] = useState({
    project_id: "",
    title: "",
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    temps_pause: 60,
  });

  // Calculer les dates de la semaine avec useMemo pour éviter les recalculs
  const weekDates = useMemo(() => {
    const date = new Date(currentWeek);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour lundi
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    const week = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  }, [currentWeek]);

  // Mémoriser la fonction de fetch pour éviter les re-créations
  // Ajout d'un timeout pour éviter les chargements infinis si le backend n'existe pas
  const fetchEmployeeData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Mode démo : charger les fausses données directement
    if (fakeDataEnabled) {
      const fakeEmp = FAKE_EMPLOYEES[0];
      setEmployee(fakeEmp);
      // Filtrer les affectations du faux employé (fake-emp-1) et adapter au format attendu
      const mapped = FAKE_ASSIGNMENTS
        .filter((a) => a.employee_id === fakeEmp.id)
        .map((a) => ({
          id: a.id,
          project_id: a.project_id,
          jour: a.jour,
          heures: a.heures,
          date: a.date,
          heure_debut: a.heure_debut,
          heure_fin: a.heure_fin,
          project: a.projects ? { name: a.projects.name, location: a.projects.location } : undefined,
        }));
      setAssignments(mapped);
      setLoading(false);
      return;
    }

    // Timeout de 3 secondes pour éviter les chargements infinis
    const timeoutId = setTimeout(() => {
      setLoading(false);
      // Afficher un message informatif mais ne pas bloquer
      toast({
        title: "Données temporaires",
        description: "Le backend n'est pas disponible. Affichage en mode démo.",
        variant: "default",
      });
    }, 3000);

    try {
      setLoading(true);

      // 1. Récupérer l'employé (company_id prioritaire si dispo, sinon fallback par user_id)
      let employeeResult: { data: any; error: any } = { data: null, error: null };
      if (effectiveCompanyId) {
        employeeResult = await supabase
          .from("employees" as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("company_id", effectiveCompanyId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
      }
      if (employeeResult.error || !employeeResult.data) {
        // Fallback : fiche employé par user_id (company_id NULL, autre entreprise, ou effectiveCompanyId manquant)
        const fallback = await supabase
          .from("employees" as any)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!fallback.error && fallback.data) {
          employeeResult = fallback;
        }
      }

      if (employeeResult.error || !employeeResult.data) {
        setEmployee(null);
        setAssignments([]);
        setLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      clearTimeout(timeoutId);
      setEmployee(employeeResult.data);

      const employeeId = (employeeResult.data as any).id;
      const weekStartStr = format(weekDates[0], "yyyy-MM-dd");
      const weekEndStr = format(weekDates[4], "yyyy-MM-dd");

      // Récupérer les affectations de la semaine avec les infos de chantier intégrées
      const assignmentsPromise = supabase
        .from("employee_assignments" as any)
        .select(`
          *,
          project:projects (
            id,
            name,
            location
          )
        `)
        .eq("employee_id", employeeId)
        .gte("date", weekStartStr)
        .lte("date", weekEndStr)
        .order("date", { ascending: true });

      const assignmentsResult = await Promise.race([
        assignmentsPromise,
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "TIMEOUT" } }), 3000)
        ),
      ]);

      // Si la jointure échoue (ex: FK pas encore exposée), fallback sans jointure
      let rawAssignments: any[] = [];
      if (assignmentsResult.error) {
        // Tentative sans jointure
        const fallbackResult = await supabase
          .from("employee_assignments" as any)
          .select("*")
          .eq("employee_id", employeeId)
          .gte("date", weekStartStr)
          .lte("date", weekEndStr)
          .order("date", { ascending: true });
        rawAssignments = (fallbackResult.data as any[]) || [];
      } else {
        rawAssignments = (assignmentsResult.data as any[]) || [];
      }

      if (true) {
        const projectIds = [...new Set(rawAssignments.map((a: any) => a.project_id).filter(Boolean))];
        let projectsMap: Record<string, { name: string; location?: string }> = {};

        // Si les projets ne sont pas déjà intégrés via la jointure, les récupérer séparément
        const hasEmbeddedProjects = rawAssignments.some((a: any) => a.project && a.project.name);
        if (!hasEmbeddedProjects && projectIds.length > 0) {
          try {
            const query = supabase.from("projects").select("id, name, location");
            const { data: projectsData, error: projectsErr } = projectIds.length === 1
              ? await query.eq("id", projectIds[0])
              : await query.in("id", projectIds);
            if (!projectsErr && projectsData) {
              projectsMap = projectsData.reduce((acc: any, p: any) => {
                acc[p.id] = { name: p.name, location: p.location };
                return acc;
              }, {});
            }
          } catch {
            // Continue sans nom de chantier
          }
        }

        const mappedAssignments: Assignment[] = rawAssignments.map((item: any) => ({
          id: item.id,
          project_id: item.project_id || undefined,
          title: item.title || undefined,
          jour: item.jour,
          heures: item.heures || 0,
          date: item.date,
          heure_debut: item.heure_debut,
          heure_fin: item.heure_fin,
          project: item.project?.name
            ? { name: item.project.name, location: item.project.location }
            : item.project_id && projectsMap[item.project_id]
            ? { name: projectsMap[item.project_id].name, location: projectsMap[item.project_id].location }
            : undefined
        }));
        setAssignments(mappedAssignments);
      }
    } catch (error) {  // eslint-disable-line
      clearTimeout(timeoutId);
      // Ne pas bloquer en cas d'erreur
      setEmployee(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user, weekDates, toast, fakeDataEnabled, effectiveCompanyId]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  // Rafraîchir quand l'utilisateur revient sur la page (focus + visibility pour mobile)
  useEffect(() => {
    const onFocus = () => fetchEmployeeData();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchEmployeeData();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchEmployeeData]);

  // Écouter les modifications du planning par l'owner (synchro temps réel Supabase)
  useEffect(() => {
    if (!employee?.id || fakeDataEnabled) return;

    const channel = supabase
      .channel(`employee_assignments_${employee.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_assignments",
          filter: `employee_id=eq.${employee.id}`,
        },
        () => {
          fetchEmployeeData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id, fetchEmployeeData, fakeDataEnabled]);

  const getAssignmentsForDay = (day: string, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return assignments.filter(
      (a) => a.jour === day && a.date === dateStr
    );
  };

  const getTotalHoursForWeek = () => {
    return assignments.reduce((total, a) => total + (a.heures || 0), 0);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Formater les horaires HH:mm:ss -> HH:mm
  const formatHeure = (h?: string) => (h ? h.slice(0, 5) : "—");

  // Fonction pour calculer les heures à partir des horaires (avec pause optionnelle)
  const calculateHoursFromTime = (heure_debut?: string, heure_fin?: string, temps_pause: number = 0): number => {
    if (!heure_debut || !heure_fin) return 0;
    
    const [startHour, startMin] = heure_debut.split(':').map(Number);
    const [endHour, endMin] = heure_fin.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) return 0;
    
    const diffMinutes = endMinutes - startMinutes - temps_pause;
    return Math.max(0, Math.round((diffMinutes / 60) * 10) / 10);
  };

  const handleEditHours = (assignment: Assignment) => {
    setEditingHours({ 
      assignmentId: assignment.id, 
      heures: assignment.heures || 0, 
      heure_debut: assignment.heure_debut, 
      heure_fin: assignment.heure_fin 
    });
  };

  // Ouvrir le dialog pour créer/éditer une affectation
  const openAssignmentDialog = (jour?: string, date?: Date, assignment?: Assignment) => {
    // Déterminer le jour et la date à utiliser
    let selectedJour: string;
    let selectedDate: string;
    
    if (jour && date) {
      // Si jour et date sont fournis, les utiliser
      selectedJour = jour;
      selectedDate = format(date, "yyyy-MM-dd");
    } else if (weekDates.length > 0) {
      // Sinon, utiliser le premier jour de la semaine actuelle
      selectedJour = joursSemaine[0];
      selectedDate = format(weekDates[0], "yyyy-MM-dd");
    } else {
      // En dernier recours, utiliser aujourd'hui
      const today = new Date();
      const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convertir dimanche (0) à 6
      selectedJour = joursSemaine[dayIndex] || joursSemaine[0];
      selectedDate = format(today, "yyyy-MM-dd");
    }
    
    if (assignment) {
      const pause = (assignment as any).temps_pause ?? 60;
      setAssignmentForm({
        project_id: assignment.project_id || "",
        title: assignment.title || "",
        heures: assignment.heures || 8,
        heure_debut: assignment.heure_debut || "08:00",
        heure_fin: assignment.heure_fin || "17:00",
        temps_pause: pause,
      });
    } else {
      setAssignmentForm({
        project_id: "",
        title: "",
        heures: 8,
        heure_debut: "08:00",
        heure_fin: "17:00",
        temps_pause: 60,
      });
    }

    console.log("🔵 [openAssignmentDialog] Ouverture avec jour:", selectedJour, "date:", selectedDate);

    setEditAssignmentDialog({
      open: true,
      jour: selectedJour,
      date: selectedDate,
      assignment,
    });
  };

  // Sauvegarder une affectation (création ou modification)
  const saveAssignment = async () => {
    console.log("🔵 [saveAssignment] Début de la fonction");
    console.log("🔵 [saveAssignment] employee:", employee);
    console.log("🔵 [saveAssignment] editAssignmentDialog:", editAssignmentDialog);
    console.log("🔵 [saveAssignment] assignmentForm:", assignmentForm);
    console.log("🔵 [saveAssignment] weekDates:", weekDates);
    
    // Si pas d'enregistrement employee et que c'est un admin/dirigeant, créer automatiquement un enregistrement
    let employeeToUse = employee;
    
    if (!employee && isAdmin && user) {
      console.log("🔵 [saveAssignment] Création automatique d'un enregistrement employee pour le dirigeant");
      
      try {
        // Créer un enregistrement employee minimal pour le dirigeant
        // Utiliser les métadonnées utilisateur ou des valeurs par défaut
        const employeeData = {
          user_id: user.id,
          nom: user.user_metadata?.nom || user.user_metadata?.family_name || user.email?.split("@")[0]?.split(".")[0] || "Dirigeant" || "Utilisateur",
          prenom: user.user_metadata?.prenom || user.user_metadata?.given_name || user.email?.split("@")[0]?.split(".")[1] || "",
          email: user.email || `${user.id}@example.com`,
          poste: user.user_metadata?.poste || "Dirigeant",
          specialites: user.user_metadata?.specialites || [],
        };
        
        console.log("🔵 [saveAssignment] Données employee à créer:", employeeData);
        
        const { data: newEmployee, error: createError } = await supabase
          .from("employees")
          .insert(employeeData)
          .select("id, nom, prenom, email, poste, specialites")
          .single();
        
        if (createError) {
          console.error("❌ [saveAssignment] Erreur création employee:", createError);
          
          // Si l'erreur est "duplicate key", l'employé existe peut-être déjà, essayer de le récupérer
          if (createError.code === "23505") {
            console.log("🔵 [saveAssignment] Employee existe déjà (contrainte unique), tentative de récupération");
            const { data: existingEmployee, error: fetchError } = await supabase
              .from("employees")
              .select("id, nom, prenom, email, poste, specialites")
              .eq("user_id", user.id)
              .single();
            
            if (!fetchError && existingEmployee) {
              employeeToUse = existingEmployee;
              setEmployee(existingEmployee);
              console.log("✅ [saveAssignment] Employee récupéré:", existingEmployee);
            } else {
              console.error("❌ [saveAssignment] Impossible de récupérer l'employee existant:", fetchError);
              toast({
                title: "Erreur",
                description: "Un profil employé existe peut-être déjà mais n'est pas accessible. Veuillez contacter votre administrateur.",
                variant: "destructive",
              });
              return;
            }
          } else if (createError.code === "42501") {
            // Erreur de permission RLS
            console.error("❌ [saveAssignment] Erreur RLS - Permission refusée");
            
            // Essayer de récupérer l'employé existant avec maybeSingle()
            const { data: existingEmployee, error: fetchError } = await supabase
              .from("employees")
              .select("id, nom, prenom, email, poste, specialites")
              .eq("user_id", user.id)
              .maybeSingle();
            
            if (!fetchError && existingEmployee) {
              employeeToUse = existingEmployee;
              setEmployee(existingEmployee);
              console.log("✅ [saveAssignment] Employee récupéré après erreur RLS:", existingEmployee);
            } else {
              console.error("❌ [saveAssignment] Impossible de récupérer l'employee (RLS):", fetchError);
              
              // Si erreur 406 (Not Acceptable), la table n'est pas accessible
              if (fetchError?.code === "PGRST301" || fetchError?.code === "406" || fetchError?.message?.includes("Not Acceptable")) {
                toast({
                  title: "Table non accessible",
                  description: "La table employees n'est pas accessible. Veuillez vérifier les permissions dans Supabase Dashboard → Authentication → Policies.",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Permission refusée",
                  description: "Les politiques de sécurité ne permettent pas de créer automatiquement votre profil employé. Veuillez contacter votre administrateur pour exécuter le script SQL 'ALLOW-USERS-CREATE-OWN-EMPLOYEE.sql' ou créer votre profil manuellement dans les paramètres.",
                  variant: "destructive",
                });
              }
              return;
            }
          } else {
            throw createError;
          }
        } else if (newEmployee) {
          employeeToUse = newEmployee;
          setEmployee(newEmployee);
          console.log("✅ [saveAssignment] Employee créé automatiquement:", newEmployee);
        }
      } catch (error: any) {
        console.error("❌ [saveAssignment] Erreur lors de la création de l'employee:", error);
        toast({
          title: "Erreur",
          description: error.message || "Impossible de créer votre profil employé automatiquement. Veuillez contacter votre administrateur.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Vérifier que l'employé est maintenant chargé
    // Si on a toujours pas d'employee après toutes les tentatives, essayer une dernière fois de récupérer
    if (!employeeToUse) {
      console.warn("⚠️ [saveAssignment] Employee toujours null, dernière tentative de récupération");
      
        if (user) {
          // Dernière tentative : récupérer l'employee directement avec maybeSingle()
          const { data: finalEmployee, error: finalError } = await supabase
            .from("employees")
            .select("id, nom, prenom, email, poste, specialites")
            .eq("user_id", user.id)
            .maybeSingle();
          
          // Si erreur 406, la table n'est pas accessible
          if (finalError && (finalError.code === "PGRST301" || finalError.code === "406" || finalError.message?.includes("Not Acceptable"))) {
            console.error("❌ [saveAssignment] Table employees non accessible (406)");
            toast({
              title: "Table non accessible",
              description: "La table employees n'est pas accessible via l'API REST. Veuillez vérifier que la table est bien exposée dans Supabase Dashboard → Table Editor → employees → Expose via API.",
              variant: "destructive",
            });
            return;
          }
        
        if (!finalError && finalEmployee) {
          employeeToUse = finalEmployee;
          setEmployee(finalEmployee);
          console.log("✅ [saveAssignment] Employee récupéré lors de la dernière tentative:", finalEmployee);
        } else {
          console.error("❌ [saveAssignment] Impossible de récupérer l'employee même après toutes les tentatives:", finalError);
          
          // Si c'est un admin et qu'on ne peut pas créer/récupérer l'employee,
          // on ne peut pas créer d'affectation car employee_id est requis dans la table
          toast({
            title: "Profil employé requis",
            description: "Impossible d'accéder à votre profil employé. Veuillez contacter votre administrateur pour créer votre profil employé dans les paramètres RH.",
            variant: "destructive",
          });
          return;
        }
      } else {
        console.error("❌ [saveAssignment] Pas d'utilisateur connecté");
        toast({
          title: "Erreur",
          description: "Vous n'êtes pas connecté. Veuillez vous reconnecter.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Récupérer la date et le jour du dialog, ou utiliser des valeurs par défaut
    const dateStr = editAssignmentDialog.date || (weekDates.length > 0 ? format(weekDates[0], "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    const jourStr = editAssignmentDialog.jour || (weekDates.length > 0 ? joursSemaine[0] : joursSemaine[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
    
    console.log("🔵 [saveAssignment] Date utilisée:", dateStr);
    console.log("🔵 [saveAssignment] Jour utilisé:", jourStr);
    
    if (!dateStr || !jourStr) {
      console.error("❌ [saveAssignment] Date ou jour manquant");
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date et un jour",
        variant: "destructive",
      });
      return;
    }
    
    // Mettre à jour le dialog avec les valeurs correctes si elles étaient manquantes
    if (!editAssignmentDialog.date || !editAssignmentDialog.jour) {
      setEditAssignmentDialog({
        ...editAssignmentDialog,
        date: dateStr,
        jour: jourStr,
      });
    }

    let heures = assignmentForm.heures;
    if (assignmentForm.heure_debut && assignmentForm.heure_fin) {
      heures = calculateHoursFromTime(assignmentForm.heure_debut, assignmentForm.heure_fin, assignmentForm.temps_pause ?? 60);
    }
    
    console.log("🔵 [saveAssignment] Heures calculées:", heures);

    try {
      let assignmentId: string;

      if (editAssignmentDialog.assignment) {
        // Mise à jour
        const updateData: any = {
          heures,
        };
        
        // Ajouter les horaires si fournis
        if (assignmentForm.heure_debut) {
          updateData.heure_debut = assignmentForm.heure_debut;
        } else {
          updateData.heure_debut = null;
        }
        
        if (assignmentForm.heure_fin) {
          updateData.heure_fin = assignmentForm.heure_fin;
        } else {
          updateData.heure_fin = null;
        }
        
        updateData.temps_pause = assignmentForm.temps_pause ?? 60;
        
        // Ajouter project_id seulement s'il est fourni
        if (assignmentForm.project_id) {
          updateData.project_id = assignmentForm.project_id;
        } else {
          // Permettre de retirer le project_id (mettre à null)
          updateData.project_id = null;
        }
        
        console.log("📝 [saveAssignment] Données de mise à jour:", updateData);
        
        const { error } = await supabase
          .from("employee_assignments")
          .update(updateData)
          .eq("id", editAssignmentDialog.assignment.id);

        if (error) {
          console.error("❌ [saveAssignment] Erreur mise à jour:", error);
          
          if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
            throw new Error("Vous n'avez pas la permission de modifier cette affectation.");
          }
          
          throw error;
        }
        assignmentId = editAssignmentDialog.assignment.id;
      } else {
        // Création
        const insertData: any = {
          employee_id: employeeToUse.id,
          jour: jourStr,
          date: dateStr,
          heures,
        };
        
        // Ajouter les horaires si fournis
        if (assignmentForm.heure_debut) {
          insertData.heure_debut = assignmentForm.heure_debut;
        }
        if (assignmentForm.heure_fin) {
          insertData.heure_fin = assignmentForm.heure_fin;
        }
        insertData.temps_pause = assignmentForm.temps_pause ?? 60;
        
        // Ajouter project_id seulement s'il est fourni (la colonne peut être nullable)
        // Note: La contrainte UNIQUE(employee_id, project_id, jour, date) nécessite un project_id pour fonctionner correctement
        // Si pas de projet, on peut quand même créer l'affectation mais il faudra gérer les NULL dans la contrainte UNIQUE
        if (assignmentForm.project_id) {
          insertData.project_id = assignmentForm.project_id;
        } else {
          // Si pas de projet, on peut créer quand même mais la contrainte UNIQUE peut poser problème
          // Pour l'instant, on permet de créer sans projet
          insertData.project_id = null;
        }
        
        // Note: Si title existe dans la DB, on pourrait faire: if (assignmentForm.title) insertData.title = assignmentForm.title;
        
        // Ajouter company_id si disponible (vérifier si la colonne existe)
        // Note: company_id peut ne pas exister dans toutes les versions de la table
        // On ne l'ajoute pas ici pour éviter les erreurs
        
        console.log("📝 [saveAssignment] Données d'insertion:", insertData);
        
        const { data: newAssignment, error } = await supabase
          .from("employee_assignments")
          .insert(insertData)
          .select("id")
          .single();
        
        if (error) {
          console.error("❌ [saveAssignment] Erreur insertion:", error);
          
          // Messages d'erreur plus explicites
          if (error.code === "23505") {
            throw new Error("Une affectation existe déjà pour ce jour et ce chantier.");
          } else if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
            throw new Error("Vous n'avez pas la permission de créer des affectations. Les employés ne peuvent modifier que leurs horaires. Contactez votre administrateur pour créer une affectation.");
          } else if (error.code === "23503") {
            throw new Error("Le chantier sélectionné n'existe pas ou n'est plus disponible.");
          }
          
          throw error;
        }
        
        assignmentId = newAssignment.id;
      }

      // 🔄 SYNCHRONISATION AUTOMATIQUE AVEC LE CALENDRIER
      // Créer/mettre à jour automatiquement un événement dans le calendrier
      try {
        await syncToCalendar.mutateAsync({
          assignmentId,
          action: editAssignmentDialog.assignment ? "update" : "create",
        });
        console.log("✅ [saveAssignment] Synchronisation calendrier réussie");
      } catch (syncError) {
        console.error("⚠️ [saveAssignment] Erreur synchronisation calendrier:", syncError);
        // Ne pas bloquer si la synchro échoue
      }

      // Synchroniser avec Google Calendar si connecté
      if (googleConnection && googleConnection.sync_planning_enabled && assignmentId) {
        try {
          await syncPlanning.mutateAsync({
            action: editAssignmentDialog.assignment ? "update" : "create",
            assignmentId,
          });
        } catch (syncError) {
          console.error("Erreur synchronisation Google Calendar:", syncError);
        }
      }

      toast({
        title: "Succès",
        description: "Affectation enregistrée et synchronisée avec le calendrier",
      });

      setEditAssignmentDialog({ open: false });
      fetchEmployeeData();
    } catch (error: any) {
      console.error("Error saving assignment:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer l'affectation",
        variant: "destructive",
      });
    }
  };

  // Supprimer une affectation
  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette affectation ?")) return;

    try {
      // 🔄 SYNCHRONISATION: Supprimer l'événement lié dans le calendrier
      try {
        await syncToCalendar.mutateAsync({
          assignmentId,
          action: "delete",
        });
        console.log("✅ [deleteAssignment] Événement supprimé du calendrier");
      } catch (syncError) {
        console.error("⚠️ [deleteAssignment] Erreur suppression calendrier:", syncError);
        // Ne pas bloquer si la synchro échoue
      }

      const { error } = await supabase
        .from("employee_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      // Synchroniser avec Google Calendar
      if (googleConnection && googleConnection.sync_planning_enabled) {
        try {
          await syncPlanning.mutateAsync({
            action: "delete",
            assignmentId,
          });
        } catch (syncError) {
          console.error("Erreur synchronisation Google Calendar:", syncError);
        }
      }

      toast({
        title: "Succès",
        description: "Affectation supprimée du planning et du calendrier",
      });

      fetchEmployeeData();
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'affectation",
        variant: "destructive",
      });
    }
  };

  const handleSaveHours = async () => {
    if (!editingHours) return;

    let heures = editingHours.heures;
    
    // Si des horaires sont fournis, calculer automatiquement les heures
    if (editingHours.heure_debut && editingHours.heure_fin) {
      heures = calculateHoursFromTime(editingHours.heure_debut, editingHours.heure_fin);
    } else {
      // Sinon, utiliser le nombre d'heures saisi (limiter entre 0 et 24h)
      heures = Math.max(0, Math.min(24, editingHours.heures));
    }

    try {
      // Sauvegarder dans la base de données
      const { error } = await supabase
        .from("employee_assignments")
        .update({
          heures,
          heure_debut: editingHours.heure_debut || undefined,
          heure_fin: editingHours.heure_fin || undefined,
        })
        .eq("id", editingHours.assignmentId);

      if (error) throw error;

      // 🔄 SYNCHRONISATION AUTOMATIQUE: Mettre à jour l'événement dans le calendrier
      try {
        await syncToCalendar.mutateAsync({
          assignmentId: editingHours.assignmentId,
          action: "update",
        });
        console.log("✅ [handleSaveHours] Événement calendrier mis à jour");
      } catch (syncError) {
        console.error("⚠️ [handleSaveHours] Erreur synchronisation calendrier:", syncError);
        // Ne pas bloquer si la synchro échoue
      }

      // Synchroniser avec Google Calendar
      if (googleConnection && googleConnection.sync_planning_enabled) {
        try {
          await syncPlanning.mutateAsync({
            action: "update",
            assignmentId: editingHours.assignmentId,
          });
        } catch (syncError) {
          console.error("Erreur synchronisation Google Calendar:", syncError);
        }
      }

      // Mettre à jour l'affectation localement pour un feedback immédiat
      setAssignments(assignments.map(assignment => 
        assignment.id === editingHours.assignmentId 
          ? { 
              ...assignment, 
              heures,
              heure_debut: editingHours.heure_debut || undefined,
              heure_fin: editingHours.heure_fin || undefined,
            }
          : assignment
      ));

      setEditingHours(null);
      toast({
        title: "Horaires enregistrés et synchronisés",
        description: editingHours.heure_debut && editingHours.heure_fin
          ? `${editingHours.heure_debut} - ${editingHours.heure_fin} (${heures}h)`
          : `${heures}h enregistrées`,
      });
    } catch (error: any) {
      console.error("Error saving hours:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer les horaires",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    const content = (
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
    
    return embedded ? content : <PageLayout>{content}</PageLayout>;
  }

  const content = (
    <div className={`space-y-4 sm:space-y-6 ${embedded ? "pt-0" : "p-4 sm:p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8"}`}>
        {/* En-tête */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Mon Planning
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isAdmin ? "Consultez et gérez vos affectations" : "Consultez vos affectations définies par votre responsable"}
          </p>
        </div>

        {/* Informations employé */}
        {employee && (
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-semibold">Mes Informations</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-semibold text-lg">
                    {employee.prenom} {employee.nom}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Poste</p>
                  <p className="font-semibold text-lg">{employee.poste === 'Membre' ? 'Employé' : employee.poste}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-lg">{employee.email}</p>
                </div>
              </div>
              {employee.specialites && employee.specialites.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Spécialités</p>
                  <div className="flex flex-wrap gap-2">
                    {employee.specialites.map((spec: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Statistiques de la semaine */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-semibold">Statistiques de la semaine</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-border/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total heures</p>
                <p className="text-2xl font-bold">{getTotalHoursForWeek()}h</p>
              </div>
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-border/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Affectations</p>
                <p className="text-2xl font-bold">{assignments.length}</p>
              </div>
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-border/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Chantiers</p>
                <p className="text-2xl font-bold">
                  {new Set(assignments.map((a) => a.project_id)).size}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Planning hebdomadaire */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">Planning de la semaine</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Semaine du {formatDate(weekDates[0])} au {formatDate(weekDates[4])}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchEmployeeData()}
                className="gap-2 rounded-xl sm:hidden"
                title="Rafraîchir le planning"
              >
                <RefreshCw className="h-4 w-4" />
                Rafraîchir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prevWeek = new Date(currentWeek);
                  prevWeek.setDate(prevWeek.getDate() - 7);
                  setCurrentWeek(prevWeek);
                }}
                className="gap-2 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Semaine précédente</span>
                <span className="sm:hidden">Préc.</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
                className="rounded-xl"
              >
                Aujourd'hui
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextWeek = new Date(currentWeek);
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setCurrentWeek(nextWeek);
                }}
                className="gap-2 rounded-xl"
              >
                <span className="hidden sm:inline">Semaine suivante</span>
                <span className="sm:hidden">Suiv.</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-border p-3 text-left bg-muted/50 font-semibold min-w-[150px]">
                        Jour
                      </th>
                      {joursSemaine.map((jour, idx) => (
                        <th
                          key={jour}
                          className="border border-border p-3 text-center bg-muted/50 font-semibold min-w-[200px] capitalize"
                        >
                          <div>{jour}</div>
                          <div className="text-xs font-normal text-muted-foreground">
                            {formatDate(weekDates[idx])}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-border p-3 font-semibold">
                        Chantiers
                      </td>
                      {joursSemaine.map((jour, idx) => {
                        const dayAssignments = getAssignmentsForDay(jour, weekDates[idx]);
                        return (
                          <td
                            key={jour}
                            className={`border border-border p-2 text-center align-top min-h-[100px] ${isAdmin ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
                            onClick={isAdmin ? () => openAssignmentDialog(jour, weekDates[idx]) : undefined}
                            title={isAdmin ? "Cliquer pour ajouter une affectation" : undefined}
                          >
                            {dayAssignments.length > 0 ? (
                              <div className="space-y-2">
                                {dayAssignments.map((assignment) => {
                                  const hasHoraires = assignment.heure_debut && assignment.heure_fin;
                                  return (
                                    <div
                                      key={assignment.id}
                                      className="p-2 bg-primary/20 border border-primary/30 rounded text-xs relative group/assignment cursor-pointer hover:bg-primary/30 hover:border-primary/50 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssignmentDetailDialog({
                                          open: true,
                                          assignment,
                                          date: weekDates[idx],
                                        });
                                      }}
                                      title="Cliquer pour voir le détail"
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="flex-1 min-w-0">
                                          {/* Nom du chantier – toujours visible en priorité */}
                                          <div className="font-semibold text-foreground leading-tight truncate">
                                            {assignment.project?.name
                                              ? (
                                                <span className="flex items-center gap-1">
                                                  <Building2 className="h-3 w-3 shrink-0 text-primary" />
                                                  {assignment.project.name}
                                                </span>
                                              )
                                              : assignment.title
                                              ? assignment.title
                                              : <span className="text-muted-foreground italic">Chantier non renseigné</span>
                                            }
                                          </div>
                                          {assignment.project?.location && (
                                            <div className="text-muted-foreground text-xs mt-0.5 truncate">
                                              📍 {assignment.project.location}
                                            </div>
                                          )}
                                        </div>
                                        {isAdmin && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 opacity-0 group-hover/assignment:opacity-100 transition-opacity text-destructive shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteAssignment(assignment.id);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                      <div 
                                        className={`flex items-center justify-center gap-1 mt-1 rounded px-1 py-0.5 bg-background/40 ${isAdmin ? "cursor-pointer hover:bg-primary/30 transition-colors" : ""}`}
                                        onClick={isAdmin ? (e) => {
                                          e.stopPropagation();
                                          handleEditHours(assignment);
                                        } : undefined}
                                        title={isAdmin ? "Cliquer pour modifier les horaires" : undefined}
                                      >
                                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span className="font-semibold">
                                          {hasHoraires 
                                            ? `${formatHeure(assignment.heure_debut)} – ${formatHeure(assignment.heure_fin)} (${assignment.heures || 0}h)`
                                            : `${assignment.heures || 0}h`}
                                        </span>
                                        {isAdmin && <Edit2 className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/assignment:opacity-100 transition-opacity ml-1" />}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs py-2 opacity-50">
                                {isAdmin ? "Cliquer pour ajouter" : "—"}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
          </div>
        </GlassCard>

        {/* Bouton flottant pour créer une affectation (patron uniquement) */}
        {isAdmin && (
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            onClick={() => openAssignmentDialog()}
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        {/* Dialog pour créer/éditer une affectation */}
        <Dialog open={editAssignmentDialog.open} onOpenChange={(open) => setEditAssignmentDialog({ ...editAssignmentDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editAssignmentDialog.assignment ? "Modifier l'affectation" : "Nouvelle affectation"}
              </DialogTitle>
              <DialogDescription>
                {editAssignmentDialog.assignment 
                  ? "Modifiez les informations de cette affectation"
                  : "Ajoutez une nouvelle affectation à votre planning"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project">Chantier (optionnel)</Label>
                <Select
                  value={assignmentForm.project_id || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setAssignmentForm({ ...assignmentForm, project_id: "", title: "" });
                    } else {
                      setAssignmentForm({ ...assignmentForm, project_id: value, title: "" });
                    }
                  }}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Sélectionner un chantier (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun chantier</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} {project.location ? `- ${project.location}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!assignmentForm.project_id && (
                <div className="grid gap-2">
                  <Label htmlFor="title">Titre personnalisé (si pas de chantier)</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Ex: Formation, Congé, Réunion..."
                    value={assignmentForm.title}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Saisissez un titre personnalisé si vous n'avez pas sélectionné de chantier
                  </p>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Jour et date</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={editAssignmentDialog.jour ? editAssignmentDialog.jour.charAt(0).toUpperCase() + editAssignmentDialog.jour.slice(1) : ""}
                    disabled
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={editAssignmentDialog.date || ""}
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value);
                      const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
                      const dayIndex = selectedDate.getDay();
                      setEditAssignmentDialog({
                        ...editAssignmentDialog,
                        date: e.target.value,
                        jour: joursSemaine.includes(dayNames[dayIndex]) ? dayNames[dayIndex] : editAssignmentDialog.jour,
                      });
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="heure_debut_assignment">Heure de début</Label>
                  <Input
                    id="heure_debut_assignment"
                    type="time"
                    value={assignmentForm.heure_debut}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAssignmentForm((prev) => ({
                        ...prev,
                        heure_debut: v,
                        heures: calculateHoursFromTime(v, prev.heure_fin, prev.temps_pause ?? 60) || prev.heures,
                      }));
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="heure_fin_assignment">Heure de fin</Label>
                  <Input
                    id="heure_fin_assignment"
                    type="time"
                    value={assignmentForm.heure_fin}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAssignmentForm((prev) => ({
                        ...prev,
                        heure_fin: v,
                        heures: calculateHoursFromTime(prev.heure_debut, v, prev.temps_pause ?? 60) || prev.heures,
                      }));
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Temps de pause</Label>
                <Select
                  value={String(assignmentForm.temps_pause ?? 60)}
                  onValueChange={(value) => {
                    const p = parseInt(value, 10);
                    setAssignmentForm((prev) => ({
                      ...prev,
                      temps_pause: p,
                      heures: calculateHoursFromTime(prev.heure_debut, prev.heure_fin, p) || prev.heures,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 h</SelectItem>
                    <SelectItem value="90">1 h 30</SelectItem>
                    <SelectItem value="120">2 h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="heures_assignment">Nombre d'heures (si horaires non spécifiés)</Label>
                <Input
                  id="heures_assignment"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={assignmentForm.heures}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setAssignmentForm({ ...assignmentForm, heures: Math.max(0, Math.min(24, value)) });
                  }}
                  disabled={!!(assignmentForm.heure_debut && assignmentForm.heure_fin)}
                />
                {assignmentForm.heure_debut && assignmentForm.heure_fin && (
                  <p className="text-xs text-muted-foreground">
                    Calcul automatique: {calculateHoursFromTime(assignmentForm.heure_debut, assignmentForm.heure_fin, assignmentForm.temps_pause ?? 60)}h
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAssignmentDialog({ open: false })}>
                Annuler
              </Button>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("🔵 [Button] Clic sur le bouton Créer/Modifier");
                  saveAssignment();
                }}
                disabled={!editAssignmentDialog.date || !editAssignmentDialog.jour}
              >
                {editAssignmentDialog.assignment ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

          {/* Dialog pour éditer les horaires */}
          <Dialog open={editingHours !== null} onOpenChange={() => setEditingHours(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier les horaires</DialogTitle>
                <DialogDescription>
                  Saisissez les horaires de travail ou le nombre d'heures pour cette affectation
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="heure_debut">Heure de début</Label>
                    <Input
                      id="heure_debut"
                      type="time"
                      value={editingHours?.heure_debut || ""}
                      onChange={(e) => {
                        setEditingHours(editingHours ? { ...editingHours, heure_debut: e.target.value } : null);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Format HH:mm (ex: 08:00)
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="heure_fin">Heure de fin</Label>
                    <Input
                      id="heure_fin"
                      type="time"
                      value={editingHours?.heure_fin || ""}
                      onChange={(e) => {
                        setEditingHours(editingHours ? { ...editingHours, heure_fin: e.target.value } : null);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Format HH:mm (ex: 17:00)
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="heures">Nombre d'heures (si horaires non spécifiés)</Label>
                  <Input
                    id="heures"
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    placeholder="Ex: 8"
                    value={editingHours?.heures || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setEditingHours(editingHours ? { ...editingHours, heures: Math.max(0, Math.min(24, value)) } : null);
                    }}
                    disabled={!!(editingHours?.heure_debut && editingHours?.heure_fin)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingHours?.heure_debut && editingHours?.heure_fin
                      ? `Calcul automatique: ${calculateHoursFromTime(editingHours.heure_debut, editingHours.heure_fin)}h`
                      : "Valeur entre 0 et 24 heures"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingHours(null)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveHours}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Dialog affichage détaillé de l'affectation (clic sur la carte) */}
        <Dialog
          open={assignmentDetailDialog.open}
          onOpenChange={(open) => setAssignmentDetailDialog({ ...assignmentDetailDialog, open })}
        >
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">Détail de l'affectation</DialogTitle>
              <DialogDescription>
                {assignmentDetailDialog.date && (
                  <span className="text-base font-medium text-foreground">
                    {assignmentDetailDialog.date.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            {assignmentDetailDialog.assignment && (
              <div className="space-y-6 py-4">
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-6 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Chantier</p>
                    <p className="text-xl font-semibold">
                      {assignmentDetailDialog.assignment.project?.name ||
                        assignmentDetailDialog.assignment.title ||
                        "Affectation"}
                    </p>
                  </div>
                  {assignmentDetailDialog.assignment.project?.location && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Lieu</p>
                      <p className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {assignmentDetailDialog.assignment.project.location}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Horaires</p>
                    <p className="text-2xl font-bold flex items-center gap-2">
                      <Clock className="h-6 w-6 text-primary" />
                      {assignmentDetailDialog.assignment.heure_debut &&
                      assignmentDetailDialog.assignment.heure_fin
                        ? `${formatHeure(assignmentDetailDialog.assignment.heure_debut)} - ${formatHeure(assignmentDetailDialog.assignment.heure_fin)}`
                        : "—"}
                    </p>
                    <p className="text-lg text-muted-foreground mt-1">
                      Total : {assignmentDetailDialog.assignment.heures || 0} h
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setAssignmentDetailDialog({ open: false });
                        handleEditHours(assignmentDetailDialog.assignment!);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                      Modifier les horaires
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        setAssignmentDetailDialog({ open: false });
                        if (assignmentDetailDialog.assignment) {
                          deleteAssignment(assignmentDetailDialog.assignment.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
    
  return embedded ? content : <PageLayout>{content}</PageLayout>;
};

export default MyPlanning;

