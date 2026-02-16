import { useState, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useCandidatures, useCreateCandidature } from "@/hooks/useRH";
import { Search, FileText, Mail, Phone, Calendar, Loader2, Plus, User, Upload, X, File } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const RHCandidatures = () => {
  const { data: candidatures, isLoading } = useCandidatures();
  const createCandidature = useCreateCandidature();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  
  const cvInputRef = useRef<HTMLInputElement>(null);
  const lettreInputRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [lettreFile, setLettreFile] = useState<File | null>(null);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [uploadingLettre, setUploadingLettre] = useState(false);
  
  const [candidatureForm, setCandidatureForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    poste_souhaite: "",
    cv_url: "",
    lettre_motivation: "",
    statut: "en_attente" as const,
  });

  const handleCVUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier PDF",
        variant: "destructive",
      });
      return;
    }

    setCvFile(file);
  };

  const handleLettreUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier PDF",
        variant: "destructive",
      });
      return;
    }

    setLettreFile(file);
  };

  const uploadFileToStorage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const filteredCandidatures = candidatures?.filter((cand) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cand.nom?.toLowerCase().includes(searchLower) ||
      cand.prenom?.toLowerCase().includes(searchLower) ||
      cand.poste_souhaite?.toLowerCase().includes(searchLower) ||
      cand.email?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      en_attente: "outline",
      entretien: "secondary",
      accepte: "default",
      refuse: "destructive",
    };
    const labels: Record<string, string> = {
      en_attente: "En attente",
      entretien: "Entretien",
      accepte: "Accepté",
      refuse: "Refusé",
    };
    return (
      <Badge variant={variants[statut] || "outline"} className="text-xs">
        {labels[statut] || statut}
      </Badge>
    );
  };

  const displayCandidatures = candidatures || [];

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Candidatures
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gérez les candidatures de vos recrutements
            </p>
          </div>
          <Button 
            className="w-full sm:w-auto rounded-xl gap-2"
            onClick={() => setCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvelle candidature
          </Button>
        </div>

        {/* Recherche */}
        <GlassCard className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une candidature (nom, poste, email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 sm:pl-12 bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10 text-sm sm:text-base"
            />
          </div>
        </GlassCard>

        {/* Liste des candidatures */}
        {isLoading && displayCandidatures.length === 0 ? (
          <GlassCard className="p-12">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">
                Chargement des candidatures...
              </p>
            </div>
          </GlassCard>
        ) : filteredCandidatures.length === 0 ? (
          <GlassCard className="p-12">
            <div className="text-center py-8">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Aucune candidature trouvée</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {searchQuery ? "Aucune candidature ne correspond à votre recherche." : "Aucune candidature enregistrée pour le moment."}
              </p>
              {!searchQuery && (
                <Button className="gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  Ajouter une candidature
                </Button>
              )}
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Vue mobile/tablette : Cartes */}
            {isMobile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {filteredCandidatures.map((candidature) => (
                  <GlassCard key={candidature.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
                    <div className="space-y-4">
                      {/* En-tête de la carte */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              {candidature.prenom || ""} {candidature.nom || "N/A"}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {candidature.poste_vise || "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatutBadge(candidature.statut || "en_attente")}
                        </div>
                      </div>

                      {/* Informations */}
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        {candidature.date_candidature && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {format(new Date(candidature.date_candidature), "dd MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                        )}
                        {candidature.email && (
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground truncate">{candidature.email}</span>
                          </div>
                        )}
                        {candidature.telephone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{candidature.telephone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              /* Vue desktop : Tableau */
              <GlassCard className="p-4 sm:p-6">
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold">Liste des Candidatures</h2>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Candidat</TableHead>
                          <TableHead className="min-w-[150px]">Poste visé</TableHead>
                          <TableHead className="min-w-[120px]">Date</TableHead>
                          <TableHead className="min-w-[100px]">Statut</TableHead>
                          <TableHead className="min-w-[180px]">Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCandidatures.map((candidature) => (
                          <TableRow key={candidature.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="font-medium">
                                  {candidature.prenom || ""} {candidature.nom || "N/A"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{candidature.poste_vise || "-"}</span>
                            </TableCell>
                            <TableCell>
                              {candidature.date_candidature
                                ? format(new Date(candidature.date_candidature), "dd MMM yyyy", { locale: fr })
                                : "-"}
                            </TableCell>
                            <TableCell>{getStatutBadge(candidature.statut || "en_attente")}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {candidature.email && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="truncate max-w-[150px]">{candidature.email}</span>
                                  </div>
                                )}
                                {candidature.telephone && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{candidature.telephone}</span>
                                  </div>
                                )}
                                {!candidature.email && !candidature.telephone && (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </GlassCard>
            )}
          </>
        )}

        {/* Dialog de création de candidature */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle candidature</DialogTitle>
              <DialogDescription>
                Enregistrez une nouvelle candidature reçue
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Informations personnelles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <User className="h-4 w-4" />
                  <span>Informations personnelles</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input
                      value={candidatureForm.prenom}
                      onChange={(e) =>
                        setCandidatureForm({ ...candidatureForm, prenom: e.target.value })
                      }
                      placeholder="Jean"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input
                      value={candidatureForm.nom}
                      onChange={(e) =>
                        setCandidatureForm({ ...candidatureForm, nom: e.target.value })
                      }
                      placeholder="Dupont"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={candidatureForm.email}
                      onChange={(e) =>
                        setCandidatureForm({ ...candidatureForm, email: e.target.value })
                      }
                      placeholder="jean.dupont@email.com"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      value={candidatureForm.telephone}
                      onChange={(e) =>
                        setCandidatureForm({ ...candidatureForm, telephone: e.target.value })
                      }
                      placeholder="+33 6 12 34 56 78"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Informations professionnelles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <FileText className="h-4 w-4" />
                  <span>Informations professionnelles</span>
                </div>
                <div className="space-y-2">
                  <Label>Poste souhaité *</Label>
                  <Input
                    value={candidatureForm.poste_souhaite}
                    onChange={(e) =>
                      setCandidatureForm({ ...candidatureForm, poste_souhaite: e.target.value })
                    }
                    placeholder="Maçon, Plombier, Électricien..."
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={candidatureForm.statut}
                    onValueChange={(value) =>
                      setCandidatureForm({ ...candidatureForm, statut: value as any })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="entretien">Entretien programmé</SelectItem>
                      <SelectItem value="accepte">Accepté</SelectItem>
                      <SelectItem value="refuse">Refusé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CV Upload */}
                <div className="space-y-2">
                  <Label>CV (PDF)</Label>
                  <input
                    ref={cvInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCVUpload(file);
                    }}
                    className="hidden"
                  />
                  {cvFile ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border/50">
                      <File className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1 truncate">{cvFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCvFile(null);
                          if (cvInputRef.current) cvInputRef.current.value = "";
                        }}
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cvInputRef.current?.click()}
                      className="w-full gap-2 rounded-xl"
                    >
                      <Upload className="h-4 w-4" />
                      Télécharger le CV (PDF)
                    </Button>
                  )}
                </div>

                {/* Lettre de motivation Upload */}
                <div className="space-y-2">
                  <Label>Lettre de motivation (PDF)</Label>
                  <input
                    ref={lettreInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLettreUpload(file);
                    }}
                    className="hidden"
                  />
                  {lettreFile ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border/50">
                      <File className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1 truncate">{lettreFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setLettreFile(null);
                          if (lettreInputRef.current) lettreInputRef.current.value = "";
                        }}
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => lettreInputRef.current?.click()}
                      className="w-full gap-2 rounded-xl"
                    >
                      <Upload className="h-4 w-4" />
                      Télécharger la lettre (PDF)
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialog(false);
                  setCandidatureForm({
                    nom: "",
                    prenom: "",
                    email: "",
                    telephone: "",
                    poste_souhaite: "",
                    cv_url: "",
                    lettre_motivation: "",
                    statut: "en_attente",
                  });
                  setCvFile(null);
                  setLettreFile(null);
                  if (cvInputRef.current) cvInputRef.current.value = "";
                  if (lettreInputRef.current) lettreInputRef.current.value = "";
                }}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  // Validation
                  if (!candidatureForm.prenom || !candidatureForm.nom || !candidatureForm.email || !candidatureForm.poste_souhaite) {
                    toast({
                      title: "Champs requis",
                      description: "Veuillez remplir tous les champs obligatoires (prénom, nom, email, poste)",
                      variant: "destructive",
                    });
                    return;
                  }

                  setIsSubmitting(true);
                  try {
                    let cvUrl = candidatureForm.cv_url;
                    let lettreUrl = candidatureForm.lettre_motivation;

                    // Upload CV si présent
                    if (cvFile) {
                      setUploadingCV(true);
                      const uploadedCvUrl = await uploadFileToStorage(cvFile, 'candidatures/cv');
                      if (uploadedCvUrl) {
                        cvUrl = uploadedCvUrl;
                      } else {
                        toast({
                          title: "Erreur upload CV",
                          description: "Impossible d'uploader le CV",
                          variant: "destructive",
                        });
                      }
                      setUploadingCV(false);
                    }

                    // Upload lettre de motivation si présente
                    if (lettreFile) {
                      setUploadingLettre(true);
                      const uploadedLettreUrl = await uploadFileToStorage(lettreFile, 'candidatures/lettres');
                      if (uploadedLettreUrl) {
                        lettreUrl = uploadedLettreUrl;
                      } else {
                        toast({
                          title: "Erreur upload lettre",
                          description: "Impossible d'uploader la lettre de motivation",
                          variant: "destructive",
                        });
                      }
                      setUploadingLettre(false);
                    }

                    await createCandidature.mutateAsync({
                      nom: candidatureForm.nom,
                      prenom: candidatureForm.prenom,
                      email: candidatureForm.email,
                      telephone: candidatureForm.telephone || undefined,
                      poste_souhaite: candidatureForm.poste_souhaite,
                      cv_url: cvUrl || undefined,
                      lettre_motivation: lettreUrl || undefined,
                      statut: candidatureForm.statut,
                      score_correspondance: 0,
                    });

                    toast({
                      title: "Candidature créée",
                      description: `La candidature de ${candidatureForm.prenom} ${candidatureForm.nom} a été enregistrée`,
                    });

                    setCreateDialog(false);
                    setCandidatureForm({
                      nom: "",
                      prenom: "",
                      email: "",
                      telephone: "",
                      poste_souhaite: "",
                      cv_url: "",
                      lettre_motivation: "",
                      statut: "en_attente",
                    });
                    setCvFile(null);
                    setLettreFile(null);
                  } catch (error: any) {
                    console.error("Error creating candidature:", error);
                    toast({
                      title: "Erreur",
                      description: error.message || "Impossible de créer la candidature",
                      variant: "destructive",
                    });
                  } finally {
                    setIsSubmitting(false);
                    setUploadingCV(false);
                    setUploadingLettre(false);
                  }
                }}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer la candidature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default RHCandidatures;
