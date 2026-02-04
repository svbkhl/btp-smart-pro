import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface OnboardingContextType {
  /** True si l'utilisateur a demandé à revoir le guide (sans modifier la BDD) */
  replayRequested: boolean;
  /** Demande d'afficher à nouveau le guide (session en cours uniquement) */
  requestReplay: () => void;
  /** Annule la demande de replay (appelé à la fin du guide en mode replay) */
  clearReplay: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [replayRequested, setReplayRequested] = useState(false);
  const requestReplay = useCallback(() => setReplayRequested(true), []);
  const clearReplay = useCallback(() => setReplayRequested(false), []);

  return (
    <OnboardingContext.Provider value={{ replayRequested, requestReplay, clearReplay }}>
      {children}
    </OnboardingContext.Provider>
  );
}

const FALLBACK = {
  replayRequested: false,
  requestReplay: () => {},
  clearReplay: () => {},
};

export function useOnboardingReplay() {
  const ctx = useContext(OnboardingContext);
  return ctx ?? FALLBACK;
}
