import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { safeLocalStorage } from "@/utils/isBrowser";

const SIDEBAR_HAS_BEEN_STABLE_KEY = "sidebar-has-been-stable";

interface SidebarContextType {
  isPinned: boolean;
  isVisible: boolean;
  isHovered: boolean;
  hasBeenStable: boolean;
  setIsPinned: (pinned: boolean) => void;
  setIsVisible: (visible: boolean) => void;
  setIsHovered: (hovered: boolean) => void;
  setHasBeenStable: (stable: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isPinned, setIsPinnedState] = useState(() => {
    const saved = safeLocalStorage.getItem("sidebar-pinned");
    return saved ? saved === "true" : true;
  });
  // Initialiser isVisible avec la même valeur que isPinned pour éviter les flashs
  const [isVisible, setIsVisibleState] = useState(() => {
    const saved = safeLocalStorage.getItem("sidebar-pinned");
    return saved ? saved === "true" : true;
  });
  const [isHovered, setIsHoveredState] = useState(false);
  // Persister "sidebar déjà stable" pour ne jamais la faire disparaître au remontage (changement de page)
  const [hasBeenStable, setHasBeenStableState] = useState(() => {
    return safeLocalStorage.getItem(SIDEBAR_HAS_BEEN_STABLE_KEY) === "true";
  });

  useEffect(() => {
    safeLocalStorage.setItem("sidebar-pinned", isPinned.toString());
  }, [isPinned]);

  const setHasBeenStable = useCallback((stable: boolean) => {
    setHasBeenStableState(stable);
    safeLocalStorage.setItem(SIDEBAR_HAS_BEEN_STABLE_KEY, stable ? "true" : "false");
  }, []);

  // Stabiliser les références des setters avec useCallback
  const setIsPinned = useCallback((pinned: boolean) => setIsPinnedState(pinned), []);
  const setIsVisible = useCallback((visible: boolean) => setIsVisibleState(visible), []);
  const setIsHovered = useCallback((hovered: boolean) => setIsHoveredState(hovered), []);

  // Mémoriser le value - NE PAS mettre les setters en dépendances (déjà stables via useCallback)
  const value = useMemo(
    () => ({ isPinned, isVisible, isHovered, hasBeenStable, setIsPinned, setIsVisible, setIsHovered, setHasBeenStable }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPinned, isVisible, isHovered, hasBeenStable]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
};


