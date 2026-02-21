/**
 * Onglet Assistant - Choix entre Assistant (chat) et Estimateur (chantiers)
 * Même logique que l'onglet Devis avec Devis simple / Devis détaillé
 */

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { MessageSquare, Ruler, ArrowLeft } from "lucide-react";
import { AIAssistant } from "./AIAssistant";
import { ChantierAIEstimator } from "./ChantierAIEstimator";

type AssistantMode = "assistant" | "estimator" | null;

export default function AssistantTab() {
  const [mode, setMode] = useState<AssistantMode>(null);

  // Écran de choix (comme pour Devis simple / détaillé)
  if (!mode) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2 mb-1 sm:mb-2">
            <MessageSquare className="h-5 w-5 text-primary shrink-0" />
            Assistant IA
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Choisissez le type d&apos;assistance dont vous avez besoin
          </p>
        </div>

        {/* Choix : Assistant ou Estimateur */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Carte Assistant - Chat général */}
          <GlassCard
            className="p-4 sm:p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setMode("assistant")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-semibold">Assistant</h4>
                <p className="text-sm text-muted-foreground">
                  Chat général avec l&apos;IA. Posez vos questions sur le BTP, obtenez des conseils, 
                  de l&apos;aide (écrit, vocal ou avec images).
                </p>
              </div>
              <Button
                size="lg"
                className="w-full mt-4 group-hover:scale-105 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("assistant");
                }}
              >
                Ouvrir l&apos;assistant
              </Button>
            </div>
          </GlassCard>

          {/* Carte Estimateur - Estimation chantiers */}
          <GlassCard
            className="p-4 sm:p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setMode("estimator")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Ruler className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-semibold">Estimateur chantiers</h4>
                <p className="text-sm text-muted-foreground">
                  Estimation indicative pour vos chantiers. Décrivez à l&apos;écrit, au micro ou avec des photos.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full mt-4 group-hover:scale-105 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("estimator");
                }}
              >
                Ouvrir l&apos;estimateur
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Mode sélectionné - afficher le contenu avec bouton Retour
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMode(null)}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au choix
      </Button>
      {mode === "assistant" && <AIAssistant />}
      {mode === "estimator" && <ChantierAIEstimator defaultExpanded />}
    </div>
  );
}
