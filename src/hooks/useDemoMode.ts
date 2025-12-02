import { useFakeDataStore } from "@/store/useFakeDataStore";

/**
 * Hook pour détecter si on est en mode démo
 * Le mode démo est activé quand fakeDataEnabled est true
 */
export const useDemoMode = () => {
  const { fakeDataEnabled } = useFakeDataStore();
  
  return {
    isDemoMode: fakeDataEnabled,
    enableDemoMode: () => {},
    disableDemoMode: () => {},
  };
};

