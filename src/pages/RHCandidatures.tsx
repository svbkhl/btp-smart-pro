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
import { useCandidatures, useCreateCandidature, useUpdateCandidature } from "@/hooks/useRH";
import { Search, Plus, FileText, Mail, Phone, TrendingUp, Loader2, CheckCircle2, XCircle, Clock, Upload, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { importCandidaturesFromCSV, generateCandidaturesCSVTemplate } from "@/services/importService";
import { useToast } from "@/components/ui/use-toast";

const RHCandidatures = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  const { data: candidatures, isLoading } = useCandidatures();
  const createCandidature = useCreateCandidature();
  const updateCandidature = useUpdateCandidature();

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    poste_souhaite: "",
    lettre_motivation: "",
    score_correspondance: 0,
    notes_internes: "",
  });

  const filteredCandidatures = (candidatures || []).filter((cand) => {
    if (!cand) return false;
    const matchesSearch =
      (cand.nom || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cand.prenom || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cand.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cand.poste_souhaite || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatut = statutFilter === "all" || cand.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  const getStatutBadge = (statut: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
      en_attente: { variant: "outline", icon: Clock, label: "En attente" },
      entretien: { variant: "default", icon: Clock, label: "Entretien" },
      accepte: { variant: "default", icon: CheckCircle2, label: "Accepté" },
      refuse: { variant: "destructive", icon: XCircle, label: "Refusé" },
      archive: { variant: "secondary", icon: FileText, label: "Archivé" },
    };
    const conf = config[statut] || config.en_attente;
    const Icon = conf.icon;
    return (
      <Badge variant={conf.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {conf.label}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 font-bold";
    if (score >= 60) return "text-yellow-600 font-semibold";
    return "text-red-600";
  };

  const handleCreate = async () => {
    if (!formData.nom || !formData.prenom || !formData.email || !formData.poste_souhaite) {
      return;
    }
    await createCandidature.mutateAsync({
      ...formData,
      recruteur_id: user?.id,
    });
    setIsFormOpen(false);
    setFormData({
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      poste_souhaite: "",
      lettre_motivation: "",
      score_correspondance: 0,
      notes_internes: "",
    });
  };

  const handleUpdateStatut = async (id: string, newStatut: string) => {
    await updateCandidature.mutateAsync({
      id,
      statut: newStatut as any,
    });
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier CSV",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const results = await importCandidaturesFromCSV(file, (current, total) => {
        setImportProgress({ current, total });
      });

      toast({
        title: "Import terminé",
        description: `${results.success} candidature(s) importée(s)${results.errors.length > 0 ? `, ${results.errors.length} erreur(s)` : ""}`,
        variant: results.errors.length > 0 ? "default" : "default",
      });

      if (results.errors.length > 0) {
        console.warn("Erreurs d'import:", results.errors);
      }
    } catch (error: any) {
      toast({
        title: "Erreur d'import",
        description: error.message || "Une erreur est survenue lors de l'import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
      // Reset file input
      e.target.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    generateCandidaturesCSVTemplate();
    toast({
      title: "Template téléchargé",
      description: "Le fichier template-candidatures.csv a été téléchargé",
    });
  };

  // Ne pas bloquer l'affichage, utiliser des valeurs par défaut

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Recrutement</h1>
              <p className="text-muted-foreground mt-2">
                Gérez les candidatures et le recrutement
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                disabled={isImporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Template CSV
              </Button>
              <div className="relative">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  disabled={isImporting}
                  className="hidden"
                  id="csv-import"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("csv-import")?.click()}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Import... ({importProgress.current}/{importProgress.total})
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importer CSV
                    </>
                  )}
                </Button>
              </div>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle candidature
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouvelle candidature</DialogTitle>
                  <DialogDescription>
                    Ajoutez une nouvelle candidature au système
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nom *</Label>
                      <Input
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Prénom *</Label>
                      <Input
                        value={formData.prenom}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input
                        value={formData.telephone}
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Poste souhaité *</Label>
                    <Input
                      value={formData.poste_souhaite}
                      onChange={(e) => setFormData({ ...formData, poste_souhaite: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Lettre de motivation</Label>
                    <Textarea
                      value={formData.lettre_motivation}
                      onChange={(e) => setFormData({ ...formData, lettre_motivation: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Score de correspondance (0-100)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.score_correspondance}
                      onChange={(e) => setFormData({ ...formData, score_correspondance: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Notes internes</Label>
                    <Textarea
                      value={formData.notes_internes}
                      onChange={(e) => setFormData({ ...formData, notes_internes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate} disabled={createCandidature.isPending}>
                    {createCandidature.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
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
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="entretien">Entretien</SelectItem>
                <SelectItem value="accepte">Accepté</SelectItem>
                <SelectItem value="refuse">Refusé</SelectItem>
                <SelectItem value="archive">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tableau */}
          <Card>
            <CardHeader>
              <CardTitle>Candidatures ({filteredCandidatures?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidatures.length > 0 ? (
                    filteredCandidatures.map((cand) => (
                      <TableRow key={cand.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{cand.prenom} {cand.nom}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {cand.email}
                            </div>
                            {cand.telephone && (
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                {cand.telephone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{cand.poste_souhaite}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${getScoreColor(cand.score_correspondance)}`}>
                            <TrendingUp className="h-4 w-4" />
                            {cand.score_correspondance}%
                          </div>
                        </TableCell>
                        <TableCell>{getStatutBadge(cand.statut)}</TableCell>
                        <TableCell>
                          {format(new Date(cand.date_candidature), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Select
                              value={cand.statut}
                              onValueChange={(value) => handleUpdateStatut(cand.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en_attente">En attente</SelectItem>
                                <SelectItem value="entretien">Entretien</SelectItem>
                                <SelectItem value="accepte">Accepté</SelectItem>
                                <SelectItem value="refuse">Refusé</SelectItem>
                                <SelectItem value="archive">Archivé</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCandidature(cand)}
                            >
                              Détails
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucune candidature trouvée
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialog détails */}
      {selectedCandidature && (
        <Dialog open={!!selectedCandidature} onOpenChange={() => setSelectedCandidature(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails de la candidature</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom complet</Label>
                  <p className="text-sm">{selectedCandidature.prenom} {selectedCandidature.nom}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedCandidature.email}</p>
                </div>
                <div>
                  <Label>Poste souhaité</Label>
                  <p className="text-sm">{selectedCandidature.poste_souhaite}</p>
                </div>
                <div>
                  <Label>Score</Label>
                  <p className={`text-sm font-semibold ${getScoreColor(selectedCandidature.score_correspondance)}`}>
                    {selectedCandidature.score_correspondance}%
                  </p>
                </div>
              </div>
              {selectedCandidature.lettre_motivation && (
                <div>
                  <Label>Lettre de motivation</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedCandidature.lettre_motivation}</p>
                </div>
              )}
              {selectedCandidature.notes_internes && (
                <div>
                  <Label>Notes internes</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedCandidature.notes_internes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RHCandidatures;

