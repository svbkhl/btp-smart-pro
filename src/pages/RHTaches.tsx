import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTachesRH, useCreateTacheRH, useUpdateTacheRH } from "@/hooks/useRH";
import { Search, Plus, ClipboardList, User, Calendar, AlertCircle, Loader2, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { safeAction } from "@/utils/safeAction";

const RHTaches = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const { data: taches, isLoading } = useTachesRH();
  const createTache = useCreateTacheRH();
  const updateTache = useUpdateTacheRH();

  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    type_tache: "autre" as const,
    priorite: "moyenne" as const,
    date_echeance: "",
  });

  const filteredTaches = (taches || []).filter((tache) => {
    if (!tache) return false;
    const matchesSearch =
      (tache.titre || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tache.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatut = statutFilter === "all" || tache.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  const getStatutBadge = (statut: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      en_cours: { variant: "default", label: "En cours" },
      en_attente: { variant: "outline", label: "En attente" },
      termine: { variant: "secondary", label: "Terminé" },
      annule: { variant: "destructive", label: "Annulé" },
    };
    const conf = config[statut] || config.en_cours;
    return <Badge variant={conf.variant}>{conf.label}</Badge>;
  };

  const getPrioriteBadge = (priorite: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      basse: { variant: "outline", label: "Basse" },
      moyenne: { variant: "default", label: "Moyenne" },
      haute: { variant: "secondary", label: "Haute" },
      urgente: { variant: "destructive", label: "Urgente" },
    };
    const conf = config[priorite] || config.moyenne;
    return <Badge variant={conf.variant}>{conf.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      validation: "Validation",
      entretien: "Entretien",
      mise_a_jour: "Mise à jour",
      formation: "Formation",
      autre: "Autre",
    };
    return labels[type] || type;
  };

  const handleCreate = async () => {
    if (!formData.titre) {
      return;
    }
    await safeAction(
      async () => {
        await createTache.mutateAsync({
          ...formData,
          statut: "en_cours",
          assigne_a: user?.id,
        });
        setIsFormOpen(false);
        setFormData({
          titre: "",
          description: "",
          type_tache: "autre",
          priorite: "moyenne",
          date_echeance: "",
        });
      },
      {
        successMessage: "Tâche créée avec succès",
        errorMessage: "Erreur lors de la création de la tâche",
      }
    );
  };

  const handleUpdateStatut = async (id: string, newStatut: string) => {
    await safeAction(
      async () => {
        await updateTache.mutateAsync({
          id,
          statut: newStatut as any,
        });
      },
      {
        successMessage: "Statut de la tâche mis à jour",
        errorMessage: "Erreur lors de la mise à jour du statut",
      }
    );
  };

  const completedTaches = (taches || []).filter(t => t.statut === "termine").length;
  const totalTaches = (taches || []).length;
  const tauxCompletion = totalTaches > 0 ? Math.round((completedTaches / totalTaches) * 100) : 0;

  // Ne pas bloquer l'affichage, utiliser des valeurs par défaut

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tâches RH</h1>
              <p className="text-muted-foreground mt-2">
                Gérez les tâches et le suivi RH
              </p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle tâche
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle tâche RH</DialogTitle>
                  <DialogDescription>
                    Créez une nouvelle tâche à suivre
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Titre *</Label>
                    <Input
                      value={formData.titre}
                      onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={formData.type_tache}
                        onValueChange={(value: any) => setFormData({ ...formData, type_tache: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="validation">Validation</SelectItem>
                          <SelectItem value="entretien">Entretien</SelectItem>
                          <SelectItem value="mise_a_jour">Mise à jour</SelectItem>
                          <SelectItem value="formation">Formation</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priorité</Label>
                      <Select
                        value={formData.priorite}
                        onValueChange={(value: any) => setFormData({ ...formData, priorite: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basse">Basse</SelectItem>
                          <SelectItem value="moyenne">Moyenne</SelectItem>
                          <SelectItem value="haute">Haute</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Date d'échéance</Label>
                    <Input
                      type="date"
                      value={formData.date_echeance}
                      onChange={(e) => setFormData({ ...formData, date_echeance: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate} disabled={createTache.isPending}>
                    {createTache.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Tâches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTaches}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tâches Complétées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedTaches}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Taux de Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tauxCompletion}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tableau */}
          <Card>
            <CardHeader>
              <CardTitle>Tâches ({filteredTaches?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTaches.length > 0 ? (
                    filteredTaches.map((tache) => (
                      <TableRow key={tache.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tache.titre}</div>
                            {tache.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {tache.description.substring(0, 50)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeLabel(tache.type_tache)}</TableCell>
                        <TableCell>{getPrioriteBadge(tache.priorite)}</TableCell>
                        <TableCell>{getStatutBadge(tache.statut)}</TableCell>
                        <TableCell>
                          {tache.date_echeance
                            ? format(new Date(tache.date_echeance), "dd MMM yyyy", { locale: fr })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={tache.statut}
                            onValueChange={(value) => handleUpdateStatut(tache.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en_cours">En cours</SelectItem>
                              <SelectItem value="en_attente">En attente</SelectItem>
                              <SelectItem value="termine">Terminé</SelectItem>
                              <SelectItem value="annule">Annulé</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucune tâche trouvée
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default RHTaches;

