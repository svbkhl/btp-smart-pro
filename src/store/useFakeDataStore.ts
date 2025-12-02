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
      // Par défaut, le fake data est désactivé
      // Il ne sera activé QUE par le mode démo de la landing page
      fakeDataEnabled: false,
      
      toggleFakeData: () => {
        // Cette fonction n'est plus utilisée (toggle supprimé du Sidebar)
        // Conservée pour compatibilité mais ne devrait pas être appelée
        const currentState = get();
        const newState = !currentState.fakeDataEnabled;
        set({ fakeDataEnabled: newState });
      },
      
      setFakeDataEnabled: (enabled: boolean) => {
        console.log("🔄 setFakeDataEnabled appelé avec:", enabled);
        set({ fakeDataEnabled: enabled });
        console.log("✅ État mis à jour, nouveau fakeDataEnabled:", get().fakeDataEnabled);
        // Ne pas rafraîchir la page automatiquement
        // Le rechargement sera géré par les composants qui utilisent ce store
      },
    }),
    {
      name: "fake-data-storage", // Clé pour localStorage
    }
  )
);


