import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, User, Calendar, Building2, X, Clock, Edit2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useProjects } from "@/hooks/useProjects";

interface Employee {
  id: number;
  nom: string;
  poste: string;
  specialites?: string[];
}

interface Chantier {
  id: number;
  nom: string;
}

interface PlanningEntry {
  id: string;
  employeeId: number;
  chantierId: number;
  jour: string; // "lundi", "mardi", etc.
  heures?: number; // Nombre d'heures travaillées (calculé automatiquement si horaires fournis)
  heure_debut?: string; // Format HH:mm (ex: "08:00")
  heure_fin?: string; // Format HH:mm (ex: "17:00")
}

const joursSemaine = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];

const EmployeesPlanning = () => {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Récupérer les vraies données depuis les hooks
  // Les hooks utilisent queryWithTimeout qui gère automatiquement le fallback
  // Si fake data activé → les hooks retournent fake data
  // Si fake data désactivé → les hooks retournent vraies données (même si vide) ou tableau vide en cas d'erreur
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  
  // Calculer les dates de la semaine avec useMemo
  const weekDates = useMemo(() => {
    const date = new Date(currentWeek);
    const day = date.getDay();
    // Ajuster pour lundi (1) comme premier jour
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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
  
  // Fonction pour formater les dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };
  
  // Transformer les données des hooks en format attendu par le composant
  const employees = useMemo(() => {
    if (!employeesData || employeesData.length === 0) return [];
    return employeesData.map((emp, index) => ({
      id: index + 1, // ID numérique pour compatibilité avec le code existant
      nom: `${emp.prenom || ""} ${emp.nom}`.trim() || emp.nom,
      poste: emp.poste,
      specialites: emp.specialites || [],
    }));
  }, [employeesData]);
  
  const chantiers = useMemo(() => {
    if (!projectsData || projectsData.length === 0) return [];
    return projectsData.map((proj, index) => ({
      id: index + 1, // ID numérique pour compatibilité avec le code existant
      nom: proj.name,
    }));
  }, [projectsData]);
  
  const [localEmployees, setLocalEmployees] = useState<Employee[]>([]);
  
  // Utiliser les données des hooks comme source principale
  // Les données locales sont utilisées pour les modifications temporaires (ajout d'employés, etc.)
  const displayEmployees = useMemo(() => {
    // Combiner les employés de la DB avec les employés locaux ajoutés
    const allEmployees = [...employees];
    // Ajouter les employés locaux qui ne sont pas déjà dans la liste
    localEmployees.forEach(localEmp => {
      if (!allEmployees.find(e => e.nom === localEmp.nom && e.poste === localEmp.poste)) {
        allEmployees.push(localEmp);
      }
    });
    return allEmployees;
  }, [employees, localEmployees]);
  const [planning, setPlanning] = useState<PlanningEntry[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<number | "all">("all");
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingHours, setEditingHours] = useState<{ 
    entryId: string; 
    heures: number;
    heure_debut?: string;
    heure_fin?: string;
  } | null>(null);
  
  // Formulaire nouvel employé
  const [newEmployee, setNewEmployee] = useState({
    nom: "",
    poste: "",
    specialites: "",
  });

  const handleAddEmployee = () => {
    if (!newEmployee.nom || !newEmployee.poste) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir au moins le nom et le poste",
        variant: "destructive",
      });
      return;
    }

    const specialites = newEmployee.specialites
      ? newEmployee.specialites.split(",").map(s => s.trim()).filter(s => s)
      : [];

    const newEmp: Employee = {
      id: displayEmployees.length + 1,
      nom: newEmployee.nom,
      poste: newEmployee.poste,
      specialites: specialites.length > 0 ? specialites : undefined,
    };

    // Ajouter à la liste locale (pas à la DB directement depuis cette page)
    setLocalEmployees([...localEmployees, newEmp]);
    setNewEmployee({ nom: "", poste: "", specialites: "" });
    setIsAddEmployeeOpen(false);
    
    toast({
      title: "Employé ajouté",
      description: `${newEmp.nom} a été ajouté à l'équipe`,
    });
  };

  const handleAssignEmployee = (employeeId: number, jour: string) => {
    if (selectedChantier === "all") {
      toast({
        title: "Sélectionnez un chantier",
        description: "Veuillez d'abord sélectionner un chantier pour affecter l'employé",
        variant: "destructive",
      });
      return;
    }

    // Vérifier si l'employé est déjà affecté ce jour-là
    const existing = planning.find(
      p => p.employeeId === employeeId && p.jour === jour
    );

    if (existing) {
      // Retirer l'affectation
      setPlanning(planning.filter(p => p.id !== existing.id));
      toast({
        title: "Affectation retirée",
        description: "L'employé a été retiré de ce jour",
      });
    } else {
      // Ajouter l'affectation avec 0 heures par défaut
      const newEntry: PlanningEntry = {
        id: `${employeeId}-${jour}-${Date.now()}`,
        employeeId,
        chantierId: selectedChantier as number,
        jour,
        heures: 0,
      };
      setPlanning([...planning, newEntry]);
      
      const employee = displayEmployees.find(e => e.id === employeeId);
      const chantier = chantiers.find(c => c.id === selectedChantier);
      
      toast({
        title: "Employé affecté",
        description: `${employee?.nom} affecté au ${chantier?.nom} le ${jour}`,
      });
    }
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

  const handleEditHours = (entryId: string, currentHours: number = 0, heure_debut?: string, heure_fin?: string) => {
    setEditingHours({ entryId, heures: currentHours, heure_debut, heure_fin });
  };

  const handleSaveHours = () => {
    if (!editingHours) return;

    let heures = editingHours.heures;
    
    // Si des horaires sont fournis, calculer automatiquement les heures
    if (editingHours.heure_debut && editingHours.heure_fin) {
      heures = calculateHoursFromTime(editingHours.heure_debut, editingHours.heure_fin);
    } else {
      // Sinon, utiliser le nombre d'heures saisi (limiter entre 0 et 24h)
      heures = Math.max(0, Math.min(24, editingHours.heures));
    }

    setPlanning(planning.map(entry => 
      entry.id === editingHours.entryId 
        ? { 
            ...entry, 
            heures,
            heure_debut: editingHours.heure_debut || undefined,
            heure_fin: editingHours.heure_fin || undefined,
          }
        : entry
    ));

    setEditingHours(null);
    toast({
      title: "Horaires enregistrés",
      description: editingHours.heure_debut && editingHours.heure_fin
        ? `${editingHours.heure_debut} - ${editingHours.heure_fin} (${heures}h)`
        : `${heures}h enregistrées`,
    });
  };

  const getTotalHoursForEmployee = (employeeId: number) => {
    return planning
      .filter(p => p.employeeId === employeeId && p.heures)
      .reduce((total, p) => total + (p.heures || 0), 0);
  };

  const getTotalHoursForChantier = (chantierId: number) => {
    return planning
      .filter(p => p.chantierId === chantierId && p.heures)
      .reduce((total, p) => total + (p.heures || 0), 0);
  };

  const handleRemoveAssignment = (entryId: string) => {
    setPlanning(planning.filter(p => p.id !== entryId));
    toast({
      title: "Affectation supprimée",
      description: "L'affectation a été retirée",
    });
  };

  const getEmployeeAssignments = (employeeId: number, jour: string) => {
    return planning.filter(
      p => p.employeeId === employeeId && p.jour === jour
    );
  };

  const filteredPlanning = selectedChantier === "all"
    ? planning
    : planning.filter(p => p.chantierId === selectedChantier);

  const getChantierName = (chantierId: number) => {
    return chantiers.find(c => c.id === chantierId)?.nom || "Chantier inconnu";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* En-tête */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                <Calendar className="h-6 w-6 md:h-8 md:w-8" />
                Planning Employés
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gérez les affectations des employés aux chantiers
              </p>
            </div>
            
            <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un employé
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvel employé</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouvel employé à l'équipe
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      placeholder="Ex: Jean Dupont"
                      value={newEmployee.nom}
                      onChange={(e) => setNewEmployee({ ...newEmployee, nom: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="poste">Poste *</Label>
                    <Input
                      id="poste"
                      placeholder="Ex: Maçon, Électricien..."
                      value={newEmployee.poste}
                      onChange={(e) => setNewEmployee({ ...newEmployee, poste: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="specialites">Spécialités (séparées par des virgules)</Label>
                    <Input
                      id="specialites"
                      placeholder="Ex: Maçonnerie, Enduit, Carrelage"
                      value={newEmployee.specialites}
                      onChange={(e) => setNewEmployee({ ...newEmployee, specialites: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddEmployee}>
                    Ajouter
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filtre par chantier */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <Label htmlFor="chantier-filter" className="flex items-center gap-2 whitespace-nowrap">
                  <Building2 className="h-4 w-4" />
                  Filtrer par chantier :
                </Label>
                <Select
                  value={selectedChantier === "all" ? "all" : selectedChantier.toString()}
                  onValueChange={(value) => setSelectedChantier(value === "all" ? "all" : parseInt(value))}
                >
                  <SelectTrigger id="chantier-filter" className="w-full md:w-[300px]">
                    <SelectValue placeholder="Sélectionner un chantier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les chantiers</SelectItem>
                    {chantiers.map((chantier) => (
                      <SelectItem key={chantier.id} value={chantier.id.toString()}>
                        {chantier.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Liste des employés */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Liste des employés ({displayEmployees.length})
              </CardTitle>
              <CardDescription>
                Cliquez sur un jour dans le planning pour affecter/désaffecter un employé
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeesLoading ? (
                  <div className="col-span-full flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : displayEmployees.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <p>Aucun employé trouvé</p>
                  </div>
                ) : (
                  displayEmployees.map((employee) => (
                    <Card key={employee.id} className="border-2">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{employee.nom}</h3>
                            <p className="text-sm text-muted-foreground">{employee.poste}</p>
                          </div>
                          <Badge variant="secondary">{employee.id}</Badge>
                        </div>
                        {employee.specialites && employee.specialites.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {employee.specialites.map((spec, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Planning hebdomadaire */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Planning hebdomadaire
                  </CardTitle>
                  <CardDescription>
                    {selectedChantier !== "all" 
                      ? `Affectations pour : ${getChantierName(selectedChantier as number)}`
                      : "Toutes les affectations"}
                    <br />
                    Semaine du {formatDate(weekDates[0])} au {formatDate(weekDates[4])}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const prevWeek = new Date(currentWeek);
                      prevWeek.setDate(prevWeek.getDate() - 7);
                      setCurrentWeek(prevWeek);
                    }}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Semaine précédente</span>
                    <span className="sm:hidden">Préc.</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(new Date())}
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
                    className="gap-2"
                  >
                    <span className="hidden sm:inline">Semaine suivante</span>
                    <span className="sm:hidden">Suiv.</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-border p-3 text-left bg-muted/50 font-semibold min-w-[200px]">
                        Employé
                      </th>
                      {joursSemaine.map((jour, idx) => (
                        <th
                          key={jour}
                          className="border border-border p-3 text-center bg-muted/50 font-semibold min-w-[150px] capitalize"
                        >
                          <div>{jour}</div>
                          <div className="text-xs font-normal text-muted-foreground mt-1">
                            {formatDate(weekDates[idx])}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(employeesLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                        </td>
                      </tr>
                    ) : displayEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          <p>Aucun employé trouvé</p>
                        </td>
                      </tr>
                    ) : (
                      displayEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-muted/30">
                        <td className="border border-border p-3">
                          <div>
                            <div className="font-semibold">{employee.nom}</div>
                            <div className="text-sm text-muted-foreground">{employee.poste}</div>
                          </div>
                        </td>
                        {joursSemaine.map((jour) => {
                          const assignments = getEmployeeAssignments(employee.id, jour);
                          const isAssigned = assignments.length > 0;
                          
                          return (
                            <td
                              key={jour}
                              className="border border-border p-2 text-center align-top cursor-pointer hover:bg-primary/10 transition-colors"
                              onClick={() => handleAssignEmployee(employee.id, jour)}
                              title={isAssigned ? "Cliquer pour retirer l'affectation" : "Cliquer pour affecter au chantier sélectionné"}
                            >
                              {assignments.map((assignment) => {
                                const chantier = chantiers.find(c => c.id === assignment.chantierId);
                                const heures = assignment.heures || 0;
                                const hasHoraires = assignment.heure_debut && assignment.heure_fin;
                                return (
                                  <div
                                    key={assignment.id}
                                    className="mb-1 p-2 bg-primary/20 border border-primary/30 rounded text-xs group"
                                  >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-medium truncate">{chantier?.nom}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveAssignment(assignment.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-3 w-3 text-destructive" />
                                      </button>
                                    </div>
                                    <div 
                                      className="flex items-center gap-1 cursor-pointer hover:bg-primary/30 rounded px-1 py-0.5 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditHours(assignment.id, heures, assignment.heure_debut, assignment.heure_fin);
                                      }}
                                      title="Cliquer pour modifier les horaires"
                                    >
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span className={heures > 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                                        {hasHoraires 
                                          ? `${assignment.heure_debut} - ${assignment.heure_fin} (${heures}h)`
                                          : heures > 0 
                                            ? `${heures}h` 
                                            : "0h"}
                                      </span>
                                      <Edit2 className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                );
                              })}
                              {!isAssigned && (
                                <div className="text-muted-foreground text-xs py-2">
                                  Disponible
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Résumé des affectations */}
          {filteredPlanning.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Résumé des affectations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredPlanning.map((entry) => {
                    const employee = displayEmployees.find(e => e.id === entry.employeeId);
                    const chantier = chantiers.find(c => c.id === entry.chantierId);
                    const heures = entry.heures || 0;
                    const hasHoraires = entry.heure_debut && entry.heure_fin;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-semibold">{employee?.nom}</span>
                            <span className="text-muted-foreground mx-2">→</span>
                            <span>{chantier?.nom}</span>
                            <span className="text-muted-foreground mx-2">•</span>
                            <span className="capitalize">{entry.jour}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className={heures > 0 ? "font-semibold" : "text-muted-foreground"}>
                              {hasHoraires 
                                ? `${entry.heure_debut} - ${entry.heure_fin} (${heures}h)`
                                : `${heures}h`}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => handleEditHours(entry.id, heures, entry.heure_debut, entry.heure_fin)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAssignment(entry.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistiques des heures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Total heures par employé */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Heures par employé
                </CardTitle>
                <CardDescription>
                  Total des heures travaillées cette semaine
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {displayEmployees.map((employee) => {
                    const totalHours = getTotalHoursForEmployee(employee.id);
                    return (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <div className="font-semibold">{employee.nom}</div>
                          <div className="text-sm text-muted-foreground">{employee.poste}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold text-lg">{totalHours}h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Total heures par chantier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Heures par chantier
                </CardTitle>
                <CardDescription>
                  Total des heures travaillées par chantier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chantiers.map((chantier) => {
                    const totalHours = getTotalHoursForChantier(chantier.id);
                    return (
                      <div
                        key={chantier.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="font-semibold truncate flex-1">{chantier.nom}</div>
                        <div className="flex items-center gap-2 ml-4">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold text-lg">{totalHours}h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dialog pour éditer les heures */}
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
        </div>
      </main>
    </div>
  );
};

export default EmployeesPlanning;

