import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { onboardingSteps, type OnboardingStep } from "@/config/onboarding-steps";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/config/admin";

interface OnboardingTourProps {
  steps?: OnboardingStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const defaultSteps = onboardingSteps;

export function OnboardingTour({
  steps = defaultSteps,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  // Ne jamais afficher le guide pour les comptes admin : fermer et nettoyer l'URL dès le montage
  useEffect(() => {
    if (isAdmin) {
      onSkip();
      setSearchParams(
        (p) => {
          const next = new URLSearchParams(p);
          next.delete("onboarding_step");
          return next;
        },
        { replace: true }
      );
    }
  }, [isAdmin, onSkip, setSearchParams]);

  if (isAdmin) return null;

  // Persister l'étape dans l'URL pour survivre aux remontages (chaque page a son propre PageLayout)
  const stepFromUrl = parseInt(searchParams.get("onboarding_step") ?? "0", 10);
  const safeStepIndex = Math.min(Math.max(0, stepFromUrl), steps.length - 1);
  const stepIndex = safeStepIndex;

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const setStepIndex = useCallback((next: number) => {
    const clamped = Math.min(Math.max(0, next), steps.length - 1);
    setSearchParams(
      (p) => {
        const nextParams = new URLSearchParams(p);
        nextParams.set("onboarding_step", String(clamped));
        return nextParams;
      },
      { replace: true }
    );
  }, [steps.length, setSearchParams]);

  // Navigation page par page : aller sur la route de l'étape courante
  useEffect(() => {
    const step = steps[stepIndex];
    if (!step?.path) return;
    const targetPath = step.path.split("?")[0];
    if (location.pathname !== targetPath) {
      navigate(`${targetPath}?onboarding_step=${stepIndex}`, { replace: true });
    }
  }, [stepIndex, steps, navigate, location.pathname]);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const updateTargetRect = useCallback(() => {
    if (!step) return;
    if (step.target === "center") {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    // Délai plus long après navigation pour laisser le layout se stabiliser
    const delay = step?.path && step?.target !== "center" ? 350 : 100;
    const t = setTimeout(updateTargetRect, delay);
    return () => clearTimeout(t);
  }, [updateTargetRect, stepIndex, step?.path, step?.target]);

  useEffect(() => {
    const observer = new ResizeObserver(updateTargetRect);
    const el = step?.target !== "center" ? document.querySelector(step?.target ?? "") : null;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [step?.target, stepIndex, updateTargetRect]);

  useEffect(() => {
    window.addEventListener("scroll", updateTargetRect, true);
    window.addEventListener("resize", updateTargetRect);
    return () => {
      window.removeEventListener("scroll", updateTargetRect, true);
      window.removeEventListener("resize", updateTargetRect);
    };
  }, [updateTargetRect]);

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
    }
  };

  const handlePrev = () => {
    if (isFirst) return;
    setStepIndex(stepIndex - 1);
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!step) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] pointer-events-auto"
        aria-modal="true"
        role="dialog"
        aria-label="Guide de bienvenue"
      >
        {/* Overlay avec trou (spotlight) */}
        <div className="absolute inset-0">
          {targetRect ? (
            <>
              {/* 4 bandes pour créer le "trou" autour de l'élément */}
              <div
                className="absolute bg-black/70 transition-[top,left,width,height] duration-300"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  height: targetRect.top,
                }}
              />
              <div
                className="absolute bg-black/70 transition-[top,left,width,height] duration-300"
                style={{
                  top: targetRect.top,
                  left: 0,
                  width: targetRect.left,
                  height: targetRect.height,
                }}
              />
              <div
                className="absolute bg-black/70 transition-[top,left,width,height] duration-300"
                style={{
                  top: targetRect.top,
                  left: targetRect.left + targetRect.width,
                  right: 0,
                  height: targetRect.height,
                }}
              />
              <div
                className="absolute bg-black/70 transition-[top,left,width,height] duration-300"
                style={{
                  top: targetRect.top + targetRect.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              {/* Bordure highlight autour de l'élément */}
              <div
                className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none transition-[top,left,width,height] duration-300"
                style={{
                  top: targetRect.top - 4,
                  left: targetRect.left - 4,
                  width: targetRect.width + 8,
                  height: targetRect.height + 8,
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-black/70" />
          )}
        </div>

        {/* Carte flottante (contenu du step) */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "pointer-events-auto w-full max-w-md rounded-2xl border bg-card shadow-xl p-6",
              "border-border/50 backdrop-blur-sm"
            )}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  Étape {stepIndex + 1} sur {steps.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={handleSkip}
                aria-label="Fermer le guide"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <h2 className="text-lg font-semibold text-foreground mb-2">{step.title}</h2>
            <p className="text-sm text-muted-foreground mb-6">{step.content}</p>

            <Progress value={progress} className="h-1.5 mb-6 rounded-full" />

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                Passer le guide
              </Button>
              <div className="flex gap-2">
                {!isFirst && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {isLast ? "C'est parti" : "Suivant"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
