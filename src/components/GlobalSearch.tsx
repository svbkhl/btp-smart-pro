import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { useBTPConversations } from "@/hooks/useConversations";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Building2, Users, FileText, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  type: "project" | "client" | "quote" | "conversation";
  title: string;
  subtitle?: string;
  url: string;
}

interface GlobalSearchProps {
  query: string;
  isOpen: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
}

/**
 * Composant de recherche globale
 * Recherche dans les projets, clients, devis et conversations
 */
export const GlobalSearch = ({ query, isOpen, onSelect, children }: GlobalSearchProps) => {
  const navigate = useNavigate();

  // Récupérer les données
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes();
  // Dans la recherche globale, on cherche dans les conversations BTP uniquement
  const { data: conversations = [], isLoading: conversationsLoading } = useBTPConversations();

  const isLoading = projectsLoading || clientsLoading || quotesLoading || conversationsLoading;

  // Filtrer et formater les résultats
  const results = useMemo(() => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchLower = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Rechercher dans les projets
    projects.forEach((project) => {
      const matches =
        project.name?.toLowerCase().includes(searchLower) ||
        project.location?.toLowerCase().includes(searchLower) ||
        project.client?.name?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower);

      if (matches) {
        results.push({
          id: project.id,
          type: "project",
          title: project.name,
          subtitle: project.client?.name || project.location || undefined,
          url: `/projects/${project.id}`,
        });
      }
    });

    // Rechercher dans les clients
    clients.forEach((client) => {
      const matches =
        client.name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.location?.toLowerCase().includes(searchLower);

      if (matches) {
        results.push({
          id: client.id,
          type: "client",
          title: client.name,
          subtitle: client.email || client.location || undefined,
          url: `/clients`,
        });
      }
    });

    // Rechercher dans les devis
    quotes.forEach((quote) => {
      const matches =
        quote.client_name?.toLowerCase().includes(searchLower) ||
        quote.work_type?.toLowerCase().includes(searchLower);

      if (matches) {
        results.push({
          id: quote.id,
          type: "quote",
          title: `Devis ${quote.quote_number || quote.id.substring(0, 8)}`,
          subtitle: quote.client_name || quote.work_type || undefined,
          url: `/quotes`,
        });
      }
    });

    // Rechercher dans les conversations
    conversations.forEach((conversation) => {
      const matches = conversation.title?.toLowerCase().includes(searchLower);

      if (matches) {
        results.push({
          id: conversation.id,
          type: "conversation",
          title: conversation.title || "Conversation sans titre",
          subtitle: "Conversation IA",
          url: `/ai?conversation=${conversation.id}`,
        });
      }
    });

    return results.slice(0, 10); // Limiter à 10 résultats
  }, [query, projects, clients, quotes, conversations]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    onSelect?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onSelect?.();
    }
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "project":
        return Building2;
      case "client":
        return Users;
      case "quote":
        return FileText;
      case "conversation":
        return MessageSquare;
      default:
        return Building2;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "project":
        return "Chantier";
      case "client":
        return "Client";
      case "quote":
        return "Devis";
      case "conversation":
        return "Conversation";
      default:
        return "";
    }
  };

  const showResults = isOpen && query.trim().length >= 2;

  return (
    <Popover open={showResults} onOpenChange={() => {}}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      {showResults && (
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-xl border-white/20 dark:border-gray-700/30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl z-50"
          align="start"
          side="bottom"
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Ne pas fermer si on clique sur le trigger
            const target = e.target as HTMLElement;
            if (target.closest('[data-radix-popover-trigger]')) {
              e.preventDefault();
            }
          }}
        >
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && results.length === 0 && query.trim().length >= 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Aucun résultat trouvé
            </div>
          )}
          {!isLoading && results.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                Résultats de recherche
              </div>
              {results.map((result, index) => {
                const Icon = getIcon(result.type);
                return (
                  <motion.div
                    key={`${result.type}-${result.id}`}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                      "hover:bg-accent transition-colors",
                      "focus-within:bg-accent outline-none"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(result);
                    }}
                    onMouseDown={(e) => {
                      // Empêcher le blur du input
                      e.preventDefault();
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect(result);
                      }
                    }}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm truncate">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">{result.subtitle}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {getTypeLabel(result.type)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
      )}
    </Popover>
  );
};

