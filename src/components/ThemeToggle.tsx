import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "./ThemeProvider";
import { useDecorativeBackground } from "@/contexts/DecorativeBackgroundContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ThemeToggle({ 
  className, 
  variant = "ghost", 
  size = "icon" 
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { enabled: decorativeBackgroundEnabled, setEnabled: setDecorativeBackground } = useDecorativeBackground();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "shrink-0 min-w-[2.75rem] min-h-[2.75rem] w-9 h-9 sm:min-w-10 sm:min-h-10 sm:w-10 sm:h-10 rounded-xl touch-manipulation",
            className
          )}
          aria-label="Changer le thème et les options d'affichage"
        >
          <Sun className="h-[1.1rem] w-[1.1rem] sm:h-[1.2rem] sm:w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] sm:h-[1.2rem] sm:w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Changer le thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="min-w-[11rem] sm:min-w-[12.5rem] w-auto max-w-[calc(100vw-2rem)] p-1.5 sm:p-1"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "cursor-pointer flex items-center gap-2 py-2.5 sm:py-2 px-2 sm:px-2 rounded-lg",
            theme === "light" && "bg-accent"
          )}
        >
          <Sun className="h-4 w-4 shrink-0" />
          <span>Clair</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "cursor-pointer flex items-center gap-2 py-2.5 sm:py-2 px-2 sm:px-2 rounded-lg",
            theme === "dark" && "bg-accent"
          )}
        >
          <Moon className="h-4 w-4 shrink-0" />
          <span>Sombre</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "cursor-pointer flex items-center gap-2 py-2.5 sm:py-2 px-2 sm:px-2 rounded-lg",
            theme === "system" && "bg-accent"
          )}
        >
          <Monitor className="h-4 w-4 shrink-0" />
          <span>Système</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="cursor-pointer flex items-center gap-2 py-2.5 sm:py-2 px-2 sm:px-2 rounded-lg min-h-[2.75rem] sm:min-h-0 focus:bg-accent/50"
        >
          <Palette className="h-4 w-4 shrink-0" />
          <span
            className="min-w-0 flex-1"
            onClick={() => setDecorativeBackground(!decorativeBackgroundEnabled)}
          >
            Fond coloré
          </span>
          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Switch
              checked={decorativeBackgroundEnabled}
              onCheckedChange={setDecorativeBackground}
              aria-label="Activer ou désactiver le fond coloré"
            />
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

