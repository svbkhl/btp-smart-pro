import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  value?: string;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * Barre de recherche globale - Style moderne avec glassmorphism
 * Compatible avec toutes les pages
 */
export const SearchBar = ({
  placeholder = "Rechercher...",
  onSearch,
  onFocus,
  onBlur,
  value: controlledValue,
  className,
  variant = "default",
}: SearchBarProps) => {
  const [internalQuery, setInternalQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  
  // Utiliser la valeur contrôlée si fournie, sinon utiliser l'état interne
  const query = controlledValue !== undefined ? controlledValue : internalQuery;

  const handleSearch = useCallback((value: string) => {
    if (controlledValue === undefined) {
      setInternalQuery(value);
    }
    onSearch?.(value);
  }, [onSearch, controlledValue]);

  const handleClear = useCallback(() => {
    if (controlledValue === undefined) {
      setInternalQuery("");
    }
    onSearch?.("");
  }, [onSearch, controlledValue]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Délai pour permettre le clic sur les résultats avant de fermer
    setTimeout(() => {
      onBlur?.();
    }, 250);
  }, [onBlur]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("relative", className)}
    >
      <div
        className={cn(
          "relative flex items-center",
          "rounded-xl sm:rounded-2xl bg-white/70 dark:bg-gray-900/70",
          "backdrop-blur-xl border border-white/20 dark:border-gray-700/30",
          "shadow-lg shadow-black/5 dark:shadow-black/20",
          "transition-all duration-150",
          isFocused && "ring-2 ring-primary/20 shadow-xl",
          variant === "compact" 
            ? "h-9 sm:h-10 px-2 sm:px-3" 
            : "h-10 sm:h-11 md:h-12 px-3 sm:px-4 w-full"
        )}
      >
        <Search className={cn(
          "absolute text-muted-foreground transition-colors z-10",
          isFocused && "text-primary",
          variant === "compact" 
            ? "left-2.5 sm:left-3 h-4 w-4 sm:h-4 sm:w-4" 
            : "left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5"
        )} />
        <Input
          type="text"
          placeholder={placeholder || ""}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
            variant === "compact"
              ? "pl-10 sm:pl-11 pr-7 sm:pr-9 text-xs sm:text-sm"
              : "pl-11 sm:pl-12 pr-8 sm:pr-10 text-sm sm:text-base",
            "h-full",
            !placeholder && "placeholder:text-transparent"
          )}
        />
        <AnimatePresence>
          {query && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className={cn(
                  "absolute right-2 h-7 w-7 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50",
                  variant === "compact" && "h-6 w-6"
                )}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};






