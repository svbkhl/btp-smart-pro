import { create } from "zustand";

interface LandingDemoState {
  isDemoActive: boolean;
  activateDemo: () => void;
  deactivateDemo: () => void;
}

/**
 * Store local pour gérer le mode Démo de la landing page
 * Ce store est indépendant du mode fake data global et ne persiste pas
 * Le mode démo disparaît automatiquement dès qu'un utilisateur se connecte
 */
export const useLandingDemoStore = create<LandingDemoState>((set) => ({
  isDemoActive: false,
  
  activateDemo: () => {
    console.log("🎮 Activation du mode démo de la landing page");
    set({ isDemoActive: true });
  },
  
  deactivateDemo: () => {
    console.log("🔒 Désactivation du mode démo de la landing page");
    set({ isDemoActive: false });
  },
}));

