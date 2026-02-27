import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FakeDataState {
  fakeDataEnabled: boolean;
  toggleFakeData: () => void;
  setFakeDataEnabled: (enabled: boolean) => void;
  /** Mode vue employé pour les closers (démo visio) */
  closerEmployeeMode: boolean;
  setCloserEmployeeMode: (enabled: boolean) => void;
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
      fakeDataEnabled: false,
      closerEmployeeMode: false,
      
      toggleFakeData: () => {
        // Cette fonction n'est plus utilisée (toggle supprimé du Sidebar)
        // Conservée pour compatibilité mais ne devrait pas être appelée
        const currentState = get();
        const newState = !currentState.fakeDataEnabled;
        set({ fakeDataEnabled: newState });
      },
      
      setFakeDataEnabled: (enabled: boolean) => {
        console.log("🔄 setFakeDataEnabled appelé avec:", enabled);
        // Désactiver la vue employé quand on coupe le mode démo
        set({ fakeDataEnabled: enabled, ...(enabled === false ? { closerEmployeeMode: false } : {}) });
        console.log("✅ État mis à jour, nouveau fakeDataEnabled:", get().fakeDataEnabled);
      },

      setCloserEmployeeMode: (enabled: boolean) => {
        set({ closerEmployeeMode: enabled });
      },
    }),
    {
      name: "fake-data-storage", // Clé pour localStorage
    }
  )
);


