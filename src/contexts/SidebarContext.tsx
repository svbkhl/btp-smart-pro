import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
    const saved = localStorage.getItem("sidebar-pinned");
    return saved ? saved === "true" : true;
  });
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebar-pinned", isPinned.toString());
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


