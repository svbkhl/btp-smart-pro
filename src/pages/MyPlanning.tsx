import { useState, useEffect, useMemo, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Building2, User, ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { FAKE_EMPLOYEES } from "@/fakeData/employees";
import { FAKE_ASSIGNMENTS } from "@/fakeData/planning";

interface Assignment {
  id: string;
  project_id: string;
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

const MyPlanning = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();
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

      // Récupérer les informations de l'employé avec timeout
      const employeePromise = supabase
        .from("employees" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      const employeeResult = await Promise.race([
        employeePromise,
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "TIMEOUT" } }), 3000)
        ),
      ]);

      clearTimeout(timeoutId);

      if (employeeResult.error || !employeeResult.data) {
        // Ne pas bloquer, afficher une page vide avec message
        setEmployee(null);
        setAssignments([]);
        setLoading(false);
        return;
      }

      setEmployee(employeeResult.data);

      // Récupérer les affectations de la semaine avec timeout
      const weekStart = new Date(weekDates[0]);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekDates[4]);
      weekEnd.setHours(23, 59, 59, 999);

      const employeeId = (employeeResult.data as any).id;

      const assignmentsPromise = supabase
        .from("employee_assignments" as any)
        .select(`
          *,
          projects:project_id (
            id,
            name,
            location
          )
        `)
        .eq("employee_id", employeeId)
        .gte("date", weekStart.toISOString().split("T")[0])
        .lte("date", weekEnd.toISOString().split("T")[0])
        .order("date", { ascending: true });

      const assignmentsResult = await Promise.race([
        assignmentsPromise,
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "TIMEOUT" } }), 3000)
        ),
      ]);

      if (assignmentsResult.error) {
        // Ne pas bloquer si les affectations ne peuvent pas être chargées
        setAssignments([]);
      } else {
        // Mapper les données pour correspondre à l'interface Assignment
        const mappedAssignments: Assignment[] = ((assignmentsResult.data as any[]) || []).map((item: any) => ({
          id: item.id,
          project_id: item.project_id,
          jour: item.jour,
          heures: item.heures || 0,
          date: item.date,
          project: item.projects ? {
            name: item.projects.name,
            location: item.projects.location
          } : undefined
        }));
        setAssignments(mappedAssignments);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      // Ne pas bloquer en cas d'erreur
      setEmployee(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user, weekDates, toast, fakeDataEnabled]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

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

  // Fonction pour calculer les heures à partir des horaires
  const calculateHoursFromTime = (heure_debut?: string, heure_fin?: string): number => {
    if (!heure_debut || !heure_fin) return 0;
    
    const [startHour, startMin] = heure_debut.split(':').map(Number);
    const [endHour, endMin] = heure_fin.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) return 0; // Pas de calcul si fin <= début
    
    const diffMinutes = endMinutes - startMinutes;
    return Math.round((diffMinutes / 60) * 10) / 10; // Arrondir à 0.1h près
  };

  const handleEditHours = (assignment: Assignment) => {
    setEditingHours({ 
      assignmentId: assignment.id, 
      heures: assignment.heures || 0, 
      heure_debut: assignment.heure_debut, 
      heure_fin: assignment.heure_fin 
    });
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
      await updateAssignment.mutateAsync({
        id: editingHours.assignmentId,
        heures,
        heure_debut: editingHours.heure_debut || undefined,
        heure_fin: editingHours.heure_fin || undefined,
      });

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
        title: "Horaires enregistrés",
        description: editingHours.heure_debut && editingHours.heure_fin
          ? `${editingHours.heure_debut} - ${editingHours.heure_fin} (${heures}h)`
          : `${heures}h enregistrées`,
      });
    } catch (error) {
      // L'erreur est déjà gérée par le hook (toast)
      console.error("Error saving hours:", error);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-4 sm:p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* En-tête */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Mon Planning
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Consultez vos affectations et heures travaillées
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
                  <p className="font-semibold text-lg">{employee.poste}</p>
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
                            className="border border-border p-2 text-center align-top"
                          >
                            {dayAssignments.length > 0 ? (
                              <div className="space-y-2">
                                {dayAssignments.map((assignment) => {
                                  const hasHoraires = assignment.heure_debut && assignment.heure_fin;
                                  return (
                                    <div
                                      key={assignment.id}
                                      className="p-2 bg-primary/20 border border-primary/30 rounded text-xs"
                                    >
                                      <div className="font-medium mb-1">
                                        {assignment.project?.name || "Chantier"}
                                      </div>
                                      {assignment.project?.location && (
                                        <div className="text-muted-foreground text-xs mb-1">
                                          📍 {assignment.project.location}
                                        </div>
                                      )}
                                      <div 
                                        className="flex items-center justify-center gap-1 mt-1 cursor-pointer hover:bg-primary/30 rounded px-1 py-0.5 transition-colors group"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditHours(assignment);
                                        }}
                                        title="Cliquer pour modifier les horaires"
                                      >
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-semibold">
                                          {hasHoraires 
                                            ? `${assignment.heure_debut} - ${assignment.heure_fin} (${assignment.heures || 0}h)`
                                            : `${assignment.heures || 0}h`}
                                        </span>
                                        <Edit2 className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs py-2">
                                Aucune affectation
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
        </div>
      </PageLayout>
    );
  };

export default MyPlanning;

