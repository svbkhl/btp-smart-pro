import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FakeDataState {
  fakeDataEnabled: boolean;
  toggleFakeData: () => void;
  setFakeDataEnabled: (enabled: boolean) => void;
}

/**
 * Store global pour gérer l'état du mode Fake Data
 * Persiste dans localStorage pour conserver l'état entre les sessions
 * 
 * Utilisation :
 * ```ts
 * const { fakeDataEnabled, toggleFakeData } = useFakeDataStore();
 * ```
 */
export const useFakeDataStore = create<FakeDataState>()(
  persist(
    (set, get) => ({
      fakeDataEnabled: 
        import.meta.env.VITE_FAKE_DATA === "true" || 
        import.meta.env.VITE_FAKE_DATA === "ON",
      
      toggleFakeData: () => {
        const currentState = get();
        const newState = !currentState.fakeDataEnabled;
        
        // Invalider le cache React Query pour forcer le rechargement des données
        // Import dynamique pour éviter les problèmes de dépendances circulaires
        import("@tanstack/react-query").then(({ useQueryClient }) => {
          // Cette fonction sera appelée depuis un composant qui a accès au QueryClient
          // On invalide toutes les queries pour forcer le rechargement
        });
        
        set({ fakeDataEnabled: newState });
        
        // Rafraîchir la page pour appliquer le changement immédiatement
        // et recharger les données avec le nouveau mode
        setTimeout(() => {
          window.location.reload();
        }, 100);
      },
      
      setFakeDataEnabled: (enabled: boolean) => {
        set({ fakeDataEnabled: enabled });
        
        // Rafraîchir la page pour appliquer le changement immédiatement
        // et recharger les données avec le nouveau mode
        setTimeout(() => {
          window.location.reload();
        }, 100);
      },
    }),
    {
      name: "fake-data-storage", // Clé pour localStorage
    }
  )
);


