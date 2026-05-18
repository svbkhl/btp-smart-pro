/**
 * Input avec autocomplete pour les titres de sections
 * Permet la saisie libre + suggestions automatiques
 */

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { useSearchQuoteSectionLibrary } from "@/hooks/useQuoteSectionLibrary";

interface SectionTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SectionTitleInput = ({
  value,
  onChange,
  placeholder = "Titre de la section (ex: Plâtrerie - Isolation)",
  className,
}: SectionTitleInputProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rechercher uniquement si on a au moins 2 caractères
  const searchQuery = value.trim().length >= 2 ? value.trim() : "";
  const { data: libraryResults = [] } = useSearchQuoteSectionLibrary(searchQuery);

  // Ouvrir popover si résultats disponibles
  useEffect(() => {
    if (libraryResults.length > 0 && searchQuery.length >= 2) {
      setPopoverOpen(true);
    } else {
      setPopoverOpen(false);
    }
  }, [libraryResults.length, searchQuery.length]);

  // Auto-resize du textarea
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => {
    if (inputRef.current) autoResize(inputRef.current);
  }, [value]);

  const handleSelect = (title: string) => {
    onChange(title);
    setPopoverOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Textarea
        ref={inputRef}
        value={value}
        rows={1}
        onChange={(e) => {
          onChange(e.target.value);
          autoResize(e.target);
        }}
        onFocus={() => {
          if (libraryResults.length > 0 && searchQuery.length >= 2) {
            setPopoverOpen(true);
          }
          if (inputRef.current) autoResize(inputRef.current);
        }}
        onBlur={(e) => {
          // Ne pas fermer si on clique sur le popover
          if (containerRef.current?.contains(e.relatedTarget as Node)) {
            return;
          }
          // Petit délai pour permettre le clic sur le popover
          setTimeout(() => setPopoverOpen(false), 200);
        }}
        placeholder={placeholder}
        className={`bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10 resize-none overflow-hidden min-h-[44px] ${className || ""}`}
      />
      {popoverOpen && libraryResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 border rounded-md bg-popover shadow-md">
          <Command>
            <CommandList>
              <CommandEmpty>Aucun titre trouvé</CommandEmpty>
              <CommandGroup>
                {libraryResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(item.title)}
                    className="cursor-pointer"
                  >
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
