import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEmployeesRH, useEmployeeRH } from "@/hooks/useRH";
import { Search, User, Mail, Phone, MapPin, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";

const RHEmployees = () => {
  const { data: employees, isLoading } = useEmployeesRH();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const { data: selectedEmployee, isLoading: selectedLoading } = useEmployeeRH(selectedEmployeeId || "");

  const filteredEmployees = employees?.filter((emp) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.nom?.toLowerCase().includes(searchLower) ||
      emp.prenom?.toLowerCase().includes(searchLower) ||
      emp.poste?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.telephone?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      actif: "default",
      inactif: "secondary",
      congé: "outline",
      suspension: "destructive",
    };
    return (
      <Badge variant={variants[statut] || "default"}>
        {statut === "actif" ? "Actif" : statut === "inactif" ? "Inactif" : statut === "congé" ? "En congé" : "Suspendu"}
      </Badge>
    );
  };

  const checkAlerts = (employee: any) => {
    const alerts = [];
    if (employee.date_fin_contrat) {
      const finContrat = new Date(employee.date_fin_contrat);
      const today = new Date();
      const daysUntilEnd = Math.ceil((finContrat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
        alerts.push(`Contrat se termine dans ${daysUntilEnd} jours`);
      }
    }
    return alerts;
  };

  // Ne pas bloquer l'affichage, utiliser des valeurs par défaut
  // Les hooks retournent déjà des données mock en cas de timeout (3 secondes)
  // Cette approche évite les chargements infinis en affichant toujours du contenu
  const displayEmployees = employees || [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* En-tête */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Employés</h1>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                Gérez vos employés et leurs informations
              </p>
            </div>
            <Link to="/admin/employees">
              <Button className="w-full sm:w-auto">
                <User className="mr-2 h-4 w-4" />
                Ajouter un employé
              </Button>
            </Link>
          </div>

          {/* Recherche */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un employé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tableau */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Employés</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && displayEmployees.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Chargement des employés...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead>Équipe</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date d'entrée</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee) => {
                      const alerts = checkAlerts(employee);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {employee.prenom || ""} {employee.nom || "N/A"}
                                </div>
                                {alerts.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                                    <span className="text-xs text-orange-500">{alerts[0]}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{employee.poste || "-"}</TableCell>
                          <TableCell>
                            {employee.team ? (
                              <Badge variant="outline">{employee.team.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatutBadge(employee.statut || "actif")}</TableCell>
                          <TableCell>
                            {employee.date_entree
                              ? format(new Date(employee.date_entree), "dd MMM yyyy", { locale: fr })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {employee.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {employee.email}
                                </div>
                              )}
                              {employee.telephone && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {employee.telephone}
                                </div>
                              )}
                              {!employee.email && !employee.telephone && (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEmployeeId(employee.id)}
                            >
                              Voir détails
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun employé trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialog détails employé */}
      <Dialog open={!!selectedEmployeeId} onOpenChange={() => setSelectedEmployeeId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'employé</DialogTitle>
            <DialogDescription>
              Informations complètes et historique
            </DialogDescription>
          </DialogHeader>
          {selectedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selectedEmployee ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nom complet</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.prenom || ""} {selectedEmployee.nom || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Poste</label>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.poste || "-"}</p>
                </div>
                {selectedEmployee.email && (
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
                  </div>
                )}
                {selectedEmployee.telephone && (
                  <div>
                    <label className="text-sm font-medium">Téléphone</label>
                    <p className="text-sm text-muted-foreground">{selectedEmployee.telephone}</p>
                  </div>
                )}
                {selectedEmployee.date_entree && (
                  <div>
                    <label className="text-sm font-medium">Date d'entrée</label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedEmployee.date_entree), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                )}
                {selectedEmployee.date_fin_contrat && (
                  <div>
                    <label className="text-sm font-medium">Fin de contrat</label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedEmployee.date_fin_contrat), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                )}
                {selectedEmployee.salaire_base && (
                  <div>
                    <label className="text-sm font-medium">Salaire de base</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.salaire_base.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                  </div>
                )}
              </div>
              {selectedEmployee.specialites && selectedEmployee.specialites.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Spécialités</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedEmployee.specialites.map((spec, idx) => (
                      <Badge key={idx} variant="outline">{spec}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune information disponible pour cet employé
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RHEmployees;

