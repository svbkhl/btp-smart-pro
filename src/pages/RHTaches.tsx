import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTachesRH, useEmployeesRH } from "@/hooks/useRH";
import { Search, CheckSquare, Calendar, Clock, Loader2, Plus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useFakeDataStore } from "@/store/useFakeDataStore";

const RHTaches = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();
  const { data: taches, isLoading } = useTachesRH();
  const { data: employees } = useEmployeesRH();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const [createDialog, setCreateDialog] = useState(false);
  const [tacheForm, setTacheForm] = useState({
    titre: "",
    description: "",
    priorite: "normale",
    statut: "en_attente",
    date_echeance: "",
    employe_id: "",
  });

  const filteredTaches = taches?.filter((tache) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      tache.titre?.toLowerCase().includes(searchLower) ||
      tache.description?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      en_attente: "outline",
      en_cours: "secondary",
      termine: "default",
      annule: "destructive",
    };
    const labels: Record<string, string> = {
      en_attente: "En attente",
      en_cours: "En cours",
      termine: "Terminé",
      annule: "Annulé",
    };
    return (
      <Badge variant={variants[statut] || "outline"} className="text-xs">
        {labels[statut] || statut}
      </Badge>
    );
  };

  const getPriorite = (priorite: string) => {
    const colors: Record<string, string> = {
      basse: "text-green-600 dark:text-green-400",
      normale: "text-blue-600 dark:text-blue-400",
      haute: "text-orange-600 dark:text-orange-400",
      urgente: "text-red-600 dark:text-red-400",
    };
    const labels: Record<string, string> = {
      basse: "Basse",
      normale: "Normale",
      haute: "Haute",
      urgente: "Urgente",
    };
    return (
      <span className={`text-sm font-medium ${colors[priorite] || colors.normale}`}>
        {labels[priorite] || priorite}
      </span>
    );
  };

  const checkUrgency = (tache: any) => {
    if (tache.statut === "termine" || tache.statut === "annule") return null;
    if (!tache.date_echeance) return null;
    
    const echeance = new Date(tache.date_echeance);
    const today = new Date();
    const daysUntilDeadline = Math.ceil((echeance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
      return `Échéance dans ${daysUntilDeadline} jour${daysUntilDeadline > 1 ? "s" : ""}`;
    }
    return null;
  };

  const displayTaches = taches || [];

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Tâches RH
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gérez les tâches et missions de vos équipes
            </p>
          </div>
          <Button 
            className="w-full sm:w-auto rounded-xl gap-2"
            onClick={() => setCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>

        {/* Recherche */}
        <GlassCard className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une tâche (titre, description)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base"
            />
          </div>
        </GlassCard>

        {/* Liste des tâches */}
        {isLoading && displayTaches.length === 0 ? (
          <GlassCard className="p-12">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">
                Chargement des tâches...
              </p>
            </div>
          </GlassCard>
        ) : filteredTaches.length === 0 ? (
          <GlassCard className="p-12">
            <div className="text-center py-8">
              <CheckSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Aucune tâche trouvée</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {searchQuery ? "Aucune tâche ne correspond à votre recherche." : "Aucune tâche enregistrée pour le moment."}
              </p>
              {!searchQuery && (
                <Button 
                  className="gap-2 rounded-xl"
                  onClick={() => setCreateDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Créer une tâche
                </Button>
              )}
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Vue mobile/tablette : Cartes */}
            {isMobile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {filteredTaches.map((tache) => {
                  const urgency = checkUrgency(tache);
                  return (
                    <GlassCard key={tache.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
                      <div className="space-y-4">
                        {/* En-tête de la carte */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                              <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg line-clamp-2">
                                {tache.titre || "Tâche"}
                              </h3>
                              {tache.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {tache.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Statut et priorité */}
                        <div className="flex items-center gap-2">
                          {getStatutBadge(tache.statut || "en_attente")}
                          {getPriorite(tache.priorite || "normale")}
                        </div>

                        {/* Alerte urgence */}
                        {urgency && (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                              {urgency}
                            </span>
                          </div>
                        )}

                        {/* Informations */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          {tache.date_echeance && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">
                                Échéance : {format(new Date(tache.date_echeance), "dd MMM yyyy", { locale: fr })}
                              </span>
                            </div>
                          )}
                          {tache.created_at && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">
                                Créée le {format(new Date(tache.created_at), "dd MMM yyyy", { locale: fr })}
                              </span>
                            </div>
                          )}
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
                  <h2 className="text-lg sm:text-xl font-semibold">Liste des Tâches</h2>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[250px]">Tâche</TableHead>
                          <TableHead className="min-w-[100px]">Statut</TableHead>
                          <TableHead className="min-w-[100px]">Priorité</TableHead>
                          <TableHead className="min-w-[120px]">Échéance</TableHead>
                          <TableHead className="min-w-[120px]">Créée le</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTaches.map((tache) => {
                          const urgency = checkUrgency(tache);
                          return (
                            <TableRow key={tache.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                    <CheckSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{tache.titre || "Tâche"}</div>
                                    {tache.description && (
                                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                        {tache.description}
                                      </div>
                                    )}
                                    {urgency && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <AlertCircle className="h-3 w-3 text-orange-500" />
                                        <span className="text-xs text-orange-500">{urgency}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{getStatutBadge(tache.statut || "en_attente")}</TableCell>
                              <TableCell>{getPriorite(tache.priorite || "normale")}</TableCell>
                              <TableCell>
                                {tache.date_echeance
                                  ? format(new Date(tache.date_echeance), "dd MMM yyyy", { locale: fr })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {tache.created_at
                                  ? format(new Date(tache.created_at), "dd MMM yyyy", { locale: fr })
                                  : "-"}
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

        {/* Dialog de création de tâche */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche RH</DialogTitle>
              <DialogDescription>
                Créez une nouvelle tâche à assigner à votre équipe
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={tacheForm.titre}
                  onChange={(e) =>
                    setTacheForm({ ...tacheForm, titre: e.target.value })
                  }
                  placeholder="Ex: Préparer les contrats"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={tacheForm.description}
                  onChange={(e) =>
                    setTacheForm({ ...tacheForm, description: e.target.value })
                  }
                  placeholder="Détails de la tâche..."
                  className="rounded-xl min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select
                    value={tacheForm.priorite}
                    onValueChange={(value) =>
                      setTacheForm({ ...tacheForm, priorite: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basse">Basse</SelectItem>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={tacheForm.statut}
                    onValueChange={(value) =>
                      setTacheForm({ ...tacheForm, statut: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="termine">Terminé</SelectItem>
                      <SelectItem value="annule">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date d'échéance</Label>
                  <Input
                    type="date"
                    value={tacheForm.date_echeance}
                    onChange={(e) =>
                      setTacheForm({ ...tacheForm, date_echeance: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assigner à</Label>
                  <Select
                    value={tacheForm.employe_id}
                    onValueChange={(value) =>
                      setTacheForm({ ...tacheForm, employe_id: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Sélectionner un employé" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.prenom} {emp.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialog(false);
                  setTacheForm({
                    titre: "",
                    description: "",
                    priorite: "normale",
                    statut: "en_attente",
                    date_echeance: "",
                    employe_id: "",
                  });
                }}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  if (!tacheForm.titre) {
                    toast({
                      title: "Champ requis",
                      description: "Veuillez saisir un titre pour la tâche",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    if (fakeDataEnabled) {
                      // Mode démo : simuler l'ajout
                      toast({
                        title: "Tâche créée",
                        description: `La tâche "${tacheForm.titre}" a été créée avec succès`,
                      });
                    } else {
                      // Mode production : sauvegarder dans Supabase
                      const { error } = await supabase
                        .from("taches_rh")
                        .insert([
                          {
                            user_id: user?.id,
                            titre: tacheForm.titre,
                            description: tacheForm.description,
                            priorite: tacheForm.priorite,
                            statut: tacheForm.statut,
                            date_echeance: tacheForm.date_echeance || null,
                            employe_id: tacheForm.employe_id || null,
                          },
                        ]);

                      if (error) throw error;

                      toast({
                        title: "Tâche créée",
                        description: `La tâche "${tacheForm.titre}" a été créée avec succès`,
                      });
                    }

                    setCreateDialog(false);
                    setTacheForm({
                      titre: "",
                      description: "",
                      priorite: "normale",
                      statut: "en_attente",
                      date_echeance: "",
                      employe_id: "",
                    });
                    
                    // Rafraîchir la page (ou invalider le cache)
                    window.location.reload();
                  } catch (error) {
                    console.error("Error creating task:", error);
                    toast({
                      title: "Erreur",
                      description: "Impossible de créer la tâche",
                      variant: "destructive",
                    });
                  }
                }}
                className="rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer la tâche
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default RHTaches;
