import { createContext, useContext, useEffect, useState } from "react";
import { safeLocalStorage, isBrowser } from "@/utils/isBrowser";

const STORAGE_KEY = "btpsmartpro_decorative_background";

type DecorativeBackgroundContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const defaultValue: DecorativeBackgroundContextValue = {
  enabled: true,
  setEnabled: () => null,
};

const DecorativeBackgroundContext = createContext<DecorativeBackgroundContextValue>(defaultValue);

export function DecorativeBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (!isBrowser()) return true;
    try {
      const stored = safeLocalStorage.getItem(STORAGE_KEY);
      if (stored === "false") return false;
      if (stored === "true") return true;
      return true; // défaut: activé
    } catch {
      return true;
    }
  });

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    safeLocalStorage.setItem(STORAGE_KEY, String(value));
  };

  return (
    <DecorativeBackgroundContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </DecorativeBackgroundContext.Provider>
  );
}

export function useDecorativeBackground() {
  const ctx = useContext(DecorativeBackgroundContext);
  return ctx ?? defaultValue;
}
