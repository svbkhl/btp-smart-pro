import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { safeLocalStorage } from "@/utils/isBrowser";

interface SidebarContextType {
  isPinned: boolean;
  isVisible: boolean;
  isHovered: boolean;
  setIsPinned: (pinned: boolean) => void;
  setIsVisible: (visible: boolean) => void;
  setIsHovered: (hovered: boolean) => void;
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

  useEffect(() => {
    safeLocalStorage.setItem("sidebar-pinned", isPinned.toString());
  }, [isPinned]);

  // Stabiliser les références des setters avec useCallback
  const setIsPinned = useCallback((pinned: boolean) => setIsPinnedState(pinned), []);
  const setIsVisible = useCallback((visible: boolean) => setIsVisibleState(visible), []);
  const setIsHovered = useCallback((hovered: boolean) => setIsHoveredState(hovered), []);

  // Mémoriser le value pour éviter les re-renders inutiles
  const value = useMemo(
    () => ({ isPinned, isVisible, isHovered, setIsPinned, setIsVisible, setIsHovered }),
    [isPinned, isVisible, isHovered, setIsPinned, setIsVisible, setIsHovered]
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


