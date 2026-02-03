import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  const [isPinned, setIsPinned] = useState(() => {
    const saved = safeLocalStorage.getItem("sidebar-pinned");
    return saved ? saved === "true" : true;
  });
  // Initialiser isVisible avec la même valeur que isPinned pour éviter les flashs
  const [isVisible, setIsVisible] = useState(() => {
    const saved = safeLocalStorage.getItem("sidebar-pinned");
    return saved ? saved === "true" : true;
  });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    safeLocalStorage.setItem("sidebar-pinned", isPinned.toString());
  }, [isPinned]);

  return (
    <SidebarContext.Provider value={{ isPinned, isVisible, isHovered, setIsPinned, setIsVisible, setIsHovered }}>
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


