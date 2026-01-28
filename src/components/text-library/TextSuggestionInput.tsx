import { useState, useEffect, useRef } from "react";
import { Lightbulb, Copy, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTextSuggestions, useIncrementSnippetUsage, useCreateTextSnippet } from "@/hooks/useTextLibrary";
import type { TextSnippet } from "@/types/textLibrary";
import { cn } from "@/lib/utils";

interface TextSuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  category?: TextSnippet['category'];
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  autoSave?: boolean; // Auto-enregistrer le texte si suffisamment long
}

export const TextSuggestionInput = ({
  value,
  onChange,
  category,
  placeholder,
  rows = 4,
  className,
  label,
  autoSave = false,
}: TextSuggestionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const suggestions = useTextSuggestions(value, category);
  const incrementUsage = useIncrementSnippetUsage();
  const createSnippet = useCreateTextSnippet();

  // Afficher les suggestions quand l'utilisateur tape
  useEffect(() => {
    if (value.length > 10 && suggestions.length > 0) {
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, suggestions.length]);

  // Appliquer une suggestion
  const applySuggestion = (snippet: TextSnippet) => {
    onChange(snippet.content);
    incrementUsage.mutate(snippet.id);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  // Auto-enregistrer le texte si assez long
  const handleSaveText = () => {
    if (value.length < 20) {
      return; // Trop court pour être enregistré
    }

    const title = value.substring(0, 50) + (value.length > 50 ? '...' : '');
    
    createSnippet.mutate({
      category: category || 'custom',
      title,
      content: value,
    });
  };

  // Gestion du clavier
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex].snippet);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{label}</label>
          {autoSave && value.length >= 20 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSaveText}
              disabled={createSnippet.isPending}
            >
              <Plus className="h-3 w-3 mr-1" />
              Enregistrer ce texte
            </Button>
          )}
        </div>
      )}
      
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={className}
        />
        
        {/* Indicateur de suggestions disponibles */}
        {suggestions.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            <Lightbulb className={cn(
              "h-4 w-4",
              showSuggestions ? "text-yellow-500" : "text-muted-foreground"
            )} />
            <span className="ml-1 text-xs">{suggestions.length}</span>
          </Button>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="p-2 space-y-1">
          <div className="flex items-center gap-2 mb-2 px-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">
              Suggestions de textes ({suggestions.length})
            </span>
            <Badge variant="secondary" className="ml-auto text-xs">
              Ctrl+Enter pour utiliser
            </Badge>
          </div>
          
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.snippet.id}
              className={cn(
                "p-2 rounded-md cursor-pointer transition-colors",
                index === selectedIndex
                  ? "bg-primary/10 border border-primary"
                  : "hover:bg-accent"
              )}
              onClick={() => applySuggestion(suggestion.snippet)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {suggestion.snippet.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(suggestion.relevance * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {suggestion.snippet.content}
                  </p>
                  <span className="text-xs text-muted-foreground mt-1">
                    {suggestion.reason}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    applySuggestion(suggestion.snippet);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Aide */}
      {showSuggestions && (
        <div className="text-xs text-muted-foreground">
          💡 Utilisez ↑↓ pour naviguer, Ctrl+Enter pour appliquer, Échap pour fermer
        </div>
      )}
    </div>
  );
};
