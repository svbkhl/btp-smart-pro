import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployeesRH, useEmployeeRH } from "@/hooks/useRH";
import { Search, User, Mail, Phone, Calendar, AlertTriangle, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useCompany } from "@/hooks/useCompany";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const RHEmployees = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();
  const { data: company } = useCompany();
  const { data: employees, isLoading } = useEmployeesRH();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const { data: selectedEmployee, isLoading: selectedLoading } = useEmployeeRH(selectedEmployeeId || "");
  const isMobile = useIsMobile();
  const [employeeForm, setEmployeeForm] = useState({
    email: "",
    password: "",
    nom: "",
    prenom: "",
    telephone: "",
    adresse: "",
    poste: "",
    statut: "actif",
    date_entree: "",
    salaire_base: "",
    specialites: "",
  });

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
      <Badge variant={variants[statut] || "default"} className="text-xs">
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

  const displayEmployees = employees || [];

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Gestion des Employés
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gérez vos employés et leurs informations
            </p>
          </div>
          {company ? (
            <InviteUserDialog
              companyId={company.id}
              companyName={company.name}
              defaultRole="member"
              trigger={
                <Button className="w-full sm:w-auto rounded-xl gap-2">
                  <Plus className="h-4 w-4" />
                  Inviter un employé
                </Button>
              }
            />
          ) : (
            <Button 
              className="w-full sm:w-auto rounded-xl gap-2"
              disabled
            >
              <Plus className="h-4 w-4" />
              Inviter un employé
            </Button>
          )}
        </div>

        {/* Recherche */}
        <GlassCard className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un employé (nom, prénom, poste, email, téléphone)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base"
            />
          </div>
        </GlassCard>

        {/* Liste des employés */}
        {isLoading && displayEmployees.length === 0 ? (
          <GlassCard className="p-12">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">
                Chargement des employés...
              </p>
            </div>
          </GlassCard>
        ) : filteredEmployees.length === 0 ? (
          <GlassCard className="p-12">
            <div className="text-center py-8">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Aucun employé trouvé</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {searchQuery ? "Aucun employé ne correspond à votre recherche." : "Commencez par ajouter votre premier employé."}
              </p>
              {!searchQuery && (
                <Link to="/admin/employees">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter un employé
                  </Button>
                </Link>
              )}
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Vue mobile/tablette : Cartes */}
            {isMobile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {filteredEmployees.map((employee) => {
                  const alerts = checkAlerts(employee);
                  return (
                    <GlassCard key={employee.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
                      <div className="space-y-4">
                        {/* En-tête de la carte */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg truncate">
                                {employee.prenom || ""} {employee.nom || "N/A"}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {employee.poste || "-"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {getStatutBadge(employee.statut || "actif")}
                          </div>
                        </div>

                        {/* Alertes */}
                        {alerts.length > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                              {alerts[0]}
                            </span>
                          </div>
                        )}

                        {/* Informations */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          {employee.team && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Équipe :</span>
                              <Badge variant="outline" className="text-xs">
                                {employee.team.name}
                              </Badge>
                            </div>
                          )}
                          {employee.date_entree && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">
                                Entré le {format(new Date(employee.date_entree), "dd MMM yyyy", { locale: fr })}
                              </span>
                            </div>
                          )}
                          {employee.email && (
                            <div className="flex items-center gap-2 text-sm min-w-0">
                              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{employee.email}</span>
                            </div>
                          )}
                          {employee.telephone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">{employee.telephone}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-border/50">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setSelectedEmployeeId(employee.id)}
                          >
                            Voir détails
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            ) : (
              /* Vue desktop : Tableau */
              <GlassCard className="p-4 sm:p-6">
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold">Liste des Employés</h2>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Nom</TableHead>
                          <TableHead className="min-w-[150px]">Poste</TableHead>
                          <TableHead className="min-w-[120px]">Équipe</TableHead>
                          <TableHead className="min-w-[100px]">Statut</TableHead>
                          <TableHead className="min-w-[120px]">Date d'entrée</TableHead>
                          <TableHead className="min-w-[180px]">Contact</TableHead>
                          <TableHead className="min-w-[120px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => {
                          const alerts = checkAlerts(employee);
                          return (
                            <TableRow key={employee.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
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
                              <TableCell>
                                <span className="text-sm">{employee.poste || "-"}</span>
                              </TableCell>
                              <TableCell>
                                {employee.team ? (
                                  <Badge variant="outline" className="text-xs">
                                    {employee.team.name}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
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
                                      <Mail className="h-3 w-3 text-muted-foreground" />
                                      <span className="truncate max-w-[150px]">{employee.email}</span>
                                    </div>
                                  )}
                                  {employee.telephone && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      <span>{employee.telephone}</span>
                                    </div>
                                  )}
                                  {!employee.email && !employee.telephone && (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEmployeeId(employee.id)}
                                  className="rounded-lg"
                                >
                                  Voir détails
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </GlassCard>
            )}
          </>
        )}
      </div>

      {/* Dialog détails employé */}
      <Dialog open={!!selectedEmployeeId} onOpenChange={() => setSelectedEmployeeId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Détails de l'employé</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Informations complètes et historique
            </DialogDescription>
          </DialogHeader>
          {selectedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedEmployee ? (
            <div className="space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Nom complet</label>
                  <p className="text-sm sm:text-base font-semibold">
                    {selectedEmployee.prenom || ""} {selectedEmployee.nom || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Poste</label>
                  <p className="text-sm sm:text-base">{selectedEmployee.poste || "-"}</p>
                </div>
                {selectedEmployee.email && (
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm sm:text-base break-all">{selectedEmployee.email}</p>
                  </div>
                )}
                {selectedEmployee.telephone && (
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Téléphone</label>
                    <p className="text-sm sm:text-base">{selectedEmployee.telephone}</p>
                  </div>
                )}
                {selectedEmployee.date_entree && (
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Date d'entrée</label>
                    <p className="text-sm sm:text-base">
                      {format(new Date(selectedEmployee.date_entree), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                )}
                {selectedEmployee.date_fin_contrat && (
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Fin de contrat</label>
                    <p className="text-sm sm:text-base">
                      {format(new Date(selectedEmployee.date_fin_contrat), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                )}
                {selectedEmployee.salaire_base && (
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Salaire de base</label>
                    <p className="text-sm sm:text-base font-semibold">
                      {selectedEmployee.salaire_base.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Spécialités */}
              {selectedEmployee.specialites && selectedEmployee.specialites.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 block">
                    Spécialités
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.specialites.map((spec: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs sm:text-sm">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Aucune information disponible pour cet employé
            </div>
          )}
        </DialogContent>
      </Dialog>

    </PageLayout>
  );
};

export default RHEmployees;
