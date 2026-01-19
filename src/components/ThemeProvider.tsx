import { createContext, useContext, useEffect, useState } from "react";
import { safeLocalStorage, isBrowser } from "@/utils/isBrowser";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "btp-smart-pro-theme",
  ...props
}: ThemeProviderProps) {
  // Éviter les erreurs d'hydratation en initialisant avec undefined côté serveur
  const [theme, setTheme] = useState<Theme>(() => {
    // Vérifier si on est côté client
    if (!isBrowser()) {
      return defaultTheme;
    }
    try {
      const stored = safeLocalStorage.getItem(storageKey);
      return (stored as Theme) || defaultTheme;
    } catch (e) {
      return defaultTheme;
    }
  });

  // Liste des pages publiques qui doivent toujours être en thème clair
  const publicPagesForLightTheme = [
    '/auth',
    '/forgot-password',
    '/reset-password',
    '/invite/accept',
    '/accept-invitation',
    '/auth/callback'
  ];

  // Vérifier si on est sur une page publique qui doit être en thème clair
  const isPublicAuthPage = () => {
    if (!isBrowser()) return false;
    const pathname = window.location.pathname;
    return publicPagesForLightTheme.some(page => pathname === page || pathname.startsWith(page));
  };

  // Appliquer le thème avec prise en compte des pages d'authentification
  useEffect(() => {
    if (!isBrowser()) return;
    
    const updateTheme = () => {
      const root = window.document.documentElement;
      const isPublicPage = isPublicAuthPage();

      // Supprimer les classes existantes
      root.classList.remove("light", "dark");

      let effectiveTheme: "light" | "dark";

      // Forcer le thème clair sur les pages d'authentification publiques
      if (isPublicPage) {
        effectiveTheme = "light";
      } else if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        effectiveTheme = systemTheme;
      } else {
        effectiveTheme = theme;
      }

      root.classList.add(effectiveTheme);
    };

    // Mettre à jour au chargement initial et lors des changements de thème
    updateTheme();

    // Écouter les changements de préférence système si le thème est "system" et qu'on n'est pas sur une page publique
    let mediaQuery: MediaQueryList | null = null;
    let handleSystemThemeChange: ((e: MediaQueryListEvent) => void) | null = null;

    if (theme === "system" && !isPublicAuthPage()) {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (!isPublicAuthPage()) {
          const root = window.document.documentElement;
          root.classList.remove("light", "dark");
          root.classList.add(e.matches ? "dark" : "light");
        }
      };
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    }

    // Écouter les changements de route via popstate (navigation navigate)
    const handlePopState = () => {
      updateTheme();
    };
    window.addEventListener('popstate', handlePopState);

    // Écouter aussi les changements de hash (pour les redirections Supabase)
    const handleHashChange = () => {
      updateTheme();
    };
    window.addEventListener('hashchange', handleHashChange);

    // Vérifier périodiquement (pour les redirections programmatiques via React Router)
    const intervalId = setInterval(updateTheme, 100);

    return () => {
      if (mediaQuery && handleSystemThemeChange) {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      }
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      clearInterval(intervalId);
    };
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      safeLocalStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

