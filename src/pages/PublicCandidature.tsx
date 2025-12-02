import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PublicCandidature = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvPreview, setCvPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    poste_souhaite: "",
    lettre_motivation: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Format invalide",
          description: "Veuillez uploader un fichier PDF ou Word (.pdf, .doc, .docx)",
          variant: "destructive",
        });
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "Le fichier ne doit pas dépasser 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setCvFile(file);
      setCvPreview(file.name);
    }
  };

  const handleRemoveFile = () => {
    setCvFile(null);
    setCvPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.nom || !formData.prenom || !formData.email || !formData.poste_souhaite) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires (*)",
        variant: "destructive",
      });
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let cvUrl: string | null = null;

      // Upload du CV si présent
      if (cvFile) {
        try {
          const fileExt = cvFile.name.split('.').pop();
          const fileName = `${Date.now()}_${formData.nom}_${formData.prenom}.${fileExt}`;
          const filePath = `candidatures/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('candidatures')
            .upload(filePath, cvFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            // Si le bucket n'existe pas, continuer sans CV
            console.warn("Erreur upload CV:", uploadError);
          } else {
            // Récupérer l'URL publique
            const { data: urlData } = supabase.storage
              .from('candidatures')
              .getPublicUrl(filePath);
            cvUrl = urlData.publicUrl;
          }
        } catch (uploadError) {
          // Continuer même si l'upload échoue
          console.warn("Erreur upload CV:", uploadError);
        }
      }

      // Créer la candidature via l'API publique
      const { data, error } = await supabase.functions.invoke('submit-candidature', {
        body: {
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone || null,
          poste_souhaite: formData.poste_souhaite,
          lettre_motivation: formData.lettre_motivation || null,
          cv_url: cvUrl,
        },
      });

      if (error) {
        throw error;
      }

      // Succès
      toast({
        title: "Candidature envoyée !",
        description: "Votre candidature a été reçue avec succès. Nous vous contacterons bientôt.",
      });

      // Réinitialiser le formulaire
      setFormData({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        poste_souhaite: "",
        lettre_motivation: "",
      });
      setCvFile(null);
      setCvPreview(null);

      // Optionnel : rediriger après 2 secondes
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'envoi de votre candidature. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-2xl p-6">
        <div className="text-center mb-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Postuler chez BTP Smart Pro</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Remplissez le formulaire ci-dessous pour nous envoyer votre candidature
          </p>
        </div>
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom et Prénom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">
                  Prénom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Email et Téléphone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Poste souhaité */}
            <div className="space-y-2">
              <Label htmlFor="poste_souhaite">
                Poste souhaité <span className="text-destructive">*</span>
              </Label>
              <Input
                id="poste_souhaite"
                value={formData.poste_souhaite}
                onChange={(e) => setFormData({ ...formData, poste_souhaite: e.target.value })}
                placeholder="Ex: Maçon, Électricien, Plombier..."
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Lettre de motivation */}
            <div className="space-y-2">
              <Label htmlFor="lettre_motivation">Lettre de motivation</Label>
              <Textarea
                id="lettre_motivation"
                value={formData.lettre_motivation}
                onChange={(e) => setFormData({ ...formData, lettre_motivation: e.target.value })}
                rows={5}
                placeholder="Décrivez votre motivation, votre expérience, vos compétences..."
                disabled={isSubmitting}
              />
            </div>

            {/* Upload CV */}
            <div className="space-y-2">
              <Label htmlFor="cv">CV (PDF ou Word - max 5MB)</Label>
              {!cvPreview ? (
                <div className="flex items-center gap-4">
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{cvPreview}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Formats acceptés : PDF, DOC, DOCX (max 5MB)
              </p>
            </div>

            {/* Bouton de soumission */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Envoyer ma candidature
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                disabled={isSubmitting}
                size="lg"
              >
                Retour
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              En soumettant ce formulaire, vous acceptez que vos données soient traitées dans le cadre du processus de recrutement.
            </p>
          </form>
        </div>
      </GlassCard>
    </div>
  );
};

export default PublicCandidature;


