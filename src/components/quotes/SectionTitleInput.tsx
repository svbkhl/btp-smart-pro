/**
 * Input avec autocomplete pour les titres de sections
 * Permet la saisie libre + suggestions automatiques
 */

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
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
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleSelect = (title: string) => {
    onChange(title);
    setPopoverOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (libraryResults.length > 0 && searchQuery.length >= 2) {
            setPopoverOpen(true);
          }
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
        className={className}
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
