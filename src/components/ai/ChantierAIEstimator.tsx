/**
 * Estimateur IA pour chantiers
 * Estimation indicative uniquement (pas de devis) - avec saisie écrite, vocale ou photos
 * Historique comme les conversations IA quand mode standalone
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ruler, Wand2, ChevronDown, ChevronUp, Mic, MicOff, Loader2, ImagePlus, X } from "lucide-react";
import { callAIAssistant } from "@/services/aiService";
import { useToast } from "@/components/ui/use-toast";
import { useEstimations, useCreateEstimation, useUpdateEstimation } from "@/hooks/useEstimations";
import { EstimationsSidebar } from "./EstimationsSidebar";

const ESTIMATION_PROMPT = `Je souhaite obtenir une estimation indicative (pas un devis formel) pour le chantier suivant. 
En tant qu'expert BTP, donne-moi :
- Une fourchette de prix indicatif (HT et TTC)
- Les principaux postes de travaux
- Les matériaux à prévoir
- Tes recommandations et précautions

Description du chantier :`;

function generateTitle(description: string, imagesCount: number): string {
  const trimmed = description.trim();
  if (trimmed) {
    return trimmed.length > 60 ? trimmed.substring(0, 57) + "..." : trimmed;
  }
  return imagesCount > 0 ? `Estimation avec ${imagesCount} photo(s)` : "Nouvelle estimation";
}

interface ChantierAIEstimatorProps {
  /** Quand true, affiché en mode standalone avec historique à gauche */
  defaultExpanded?: boolean;
}

export const ChantierAIEstimator = ({ defaultExpanded = false }: ChantierAIEstimatorProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [description, setDescription] = useState("");
  const [estimation, setEstimation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedEstimationId, setSelectedEstimationId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: estimations = [] } = useEstimations();
  const createEstimation = useCreateEstimation();
  const updateEstimation = useUpdateEstimation();

  const selectedEstimation = estimations.find((e) => e.id === selectedEstimationId);

  useEffect(() => {
    if (selectedEstimation) {
      setDescription(selectedEstimation.description || "");
      setEstimation(selectedEstimation.estimation_result);
    } else {
      setDescription("");
      setEstimation(null);
      setUploadedImages([]);
    }
  }, [selectedEstimationId, selectedEstimation?.id]);

  const startVoiceInput = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Saisie vocale non supportée",
        description: "Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.",
        variant: "destructive",
      });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setDescription((prev) => (prev.endsWith(" ") || prev === "" ? prev : prev + " ") + transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        toast({
          title: "Erreur reconnaissance vocale",
          description: event.error === "no-speech" ? "Aucune parole détectée" : event.error,
          variant: "destructive",
        });
      }
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast({
      title: "Écoute en cours...",
      description: "Parlez pour décrire votre chantier. Cliquez sur le micro pour arrêter.",
    });
  }, [toast]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current && isRecording) recognitionRef.current.stop();
    setIsRecording(false);
  }, [isRecording]);

  const toggleVoice = () => {
    if (isRecording) stopVoiceInput();
    else startVoiceInput();
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImages((prev) => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) Array.from(files).forEach(handleImageUpload);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNewEstimation = () => {
    setSelectedEstimationId(null);
    setDescription("");
    setEstimation(null);
    setUploadedImages([]);
  };

  const handleEstimate = async () => {
    const trimmed = description.trim();
    const hasContent = trimmed || uploadedImages.length > 0;
    if (!hasContent) {
      toast({
        title: "Description ou photo requise",
        description: "Décrivez votre chantier (écrit, vocal ou photos) avant d'estimer.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setEstimation(null);

    const messageText = trimmed
      ? `${ESTIMATION_PROMPT}\n\n${trimmed}`
      : `${ESTIMATION_PROMPT}\n\n[L'utilisateur a joint ${uploadedImages.length} photo(s) du chantier. Analyse-les pour fournir une estimation.]`;

    try {
      const response = await callAIAssistant({
        message: messageText,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
        currentPage: "/ai",
        context: { type: "estimation_chantier" },
      });

      if (response?.response) {
        setEstimation(response.response);
        const title = generateTitle(trimmed, uploadedImages.length);
        try {
          const saved = await createEstimation.mutateAsync({
            title,
            description: trimmed || null,
            estimation_result: response.response,
            images_count: uploadedImages.length,
          });
          setSelectedEstimationId(saved.id);
        } catch (err) {
          toast({
            title: "Erreur",
            description: "L'estimation n'a pas pu être enregistrée dans l'historique",
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Réponse invalide");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'obtenir l'estimation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDescription("");
    setEstimation(null);
    setUploadedImages([]);
    setSelectedEstimationId(null);
    setFollowUpQuestion("");
  };

  const handleFollowUp = async () => {
    const q = followUpQuestion.trim();
    if (!q || !estimation || !selectedEstimationId) return;

    setFollowUpLoading(true);
    setFollowUpQuestion("");

    try {
      const trimmed = description.trim();
      const originalPrompt = trimmed
        ? `${ESTIMATION_PROMPT}\n\n${trimmed}`
        : `${ESTIMATION_PROMPT}\n\n[Photos du chantier jointes]`;

      const response = await callAIAssistant({
        message: q,
        history: [
          { role: "user", content: originalPrompt },
          { role: "assistant", content: estimation },
        ],
        currentPage: "/ai",
        context: { type: "estimation_chantier_followup" },
      });

      if (response?.response) {
        const appended = `${estimation}\n\n--- Suite de la conversation ---\n\n**Votre question :** ${q}\n\n**Réponse :**\n${response.response}`;
        setEstimation(appended);
        await updateEstimation.mutateAsync({
          id: selectedEstimationId,
          estimation_result: appended,
        });
      } else {
        throw new Error("Réponse invalide");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'obtenir la réponse",
        variant: "destructive",
      });
      setFollowUpQuestion(q);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const renderFormAndResult = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Décrivez votre chantier à l&apos;écrit, via le micro ou en ajoutant des photos. L&apos;IA vous
        donnera une estimation indicative (fourchette de prix, postes, matériaux).
      </p>

      {!selectedEstimation && (
        <>
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Photo ${index + 1}`}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-border/50"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="gap-2"
            >
              <ImagePlus className="h-4 w-4" />
              Ajouter des photos
            </Button>
          </div>

          <div className="relative [touch-action:manipulation]">
            <Textarea
              placeholder="Ex: Rénovation complète d'une salle de bain 8m², carrelage sol et murs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={(e) => e.target.scrollIntoView({ block: "nearest", behavior: "smooth" })}
              className="min-h-[100px] pr-12 [touch-action:manipulation]"
              disabled={loading}
              inputMode="text"
              autoComplete="off"
            />
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={toggleVoice}
              disabled={loading}
              className="absolute right-2 bottom-2 h-9 w-9"
              title={isRecording ? "Arrêter l'enregistrement" : "Décrire au micro"}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleEstimate}
              disabled={loading || (!description.trim() && uploadedImages.length === 0)}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {loading ? "Estimation en cours..." : "Obtenir l'estimation"}
            </Button>
            {(description || estimation || uploadedImages.length > 0) && (
              <Button variant="outline" onClick={reset} disabled={loading}>
                Recommencer
              </Button>
            )}
          </div>
        </>
      )}

      {estimation && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white/10 dark:bg-white/5 border border-border/50">
            <h5 className="font-medium mb-2 text-sm">Estimation indicative :</h5>
            <div className="text-sm whitespace-pre-wrap break-words text-foreground/90">
              {estimation}
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder="Poser une question de suivi à l'IA (ex: Peux-tu détailler le poste carrelage ?)"
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              disabled={followUpLoading}
              className="min-h-[60px] flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleFollowUp();
                }
              }}
            />
            <Button
              onClick={handleFollowUp}
              disabled={followUpLoading || !followUpQuestion.trim()}
              className="shrink-0"
            >
              {followUpLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Envoyer"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Vous pouvez continuer la conversation avec l&apos;IA pour obtenir des précisions.
          </p>
        </div>
      )}
    </div>
  );

  // Mode standalone avec sidebar historique (comme Assistant)
  if (defaultExpanded) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 h-[calc(100vh-320px)] sm:h-[600px] min-h-[500px]">
        <div className="w-full sm:w-64 flex-shrink-0">
          <EstimationsSidebar
            selectedEstimationId={selectedEstimationId}
            onSelectEstimation={setSelectedEstimationId}
            onNewEstimation={handleNewEstimation}
          />
        </div>
        <GlassCard className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border/50">
            <h3 className="font-semibold text-lg">Estimateur IA Chantiers</h3>
            <p className="text-sm text-muted-foreground">
              Estimation indicative (écrit, vocal ou photos)
            </p>
          </div>
          <ScrollArea className="flex-1 p-4 sm:p-6">
            {renderFormAndResult()}
          </ScrollArea>
        </GlassCard>
      </div>
    );
  }

  // Mode compact (carte repliable)
  return (
    <GlassCard className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Ruler className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-base sm:text-lg">Estimateur IA Chantiers</h4>
            <p className="text-sm text-muted-foreground">
              Estimation indicative (écrit, vocal ou photos)
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
      </button>
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 border-t border-border/50">
          {renderFormAndResult()}
        </div>
      )}
    </GlassCard>
  );
};
