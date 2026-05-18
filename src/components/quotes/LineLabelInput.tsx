/**
 * Input avec autocomplete pour les labels de lignes (prestations)
 * Permet la saisie libre + suggestions automatiques
 */

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { useSearchQuoteLineLibrary } from "@/hooks/useQuoteLineLibrary";
import { formatCurrency } from "@/utils/quoteCalculations";

interface LineLabelInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: { label: string; unit?: string; price?: number }) => void;
  placeholder?: string;
  className?: string;
}

export const LineLabelInput = ({
  value,
  onChange,
  onSelect,
  placeholder = "Prestation",
  className,
}: LineLabelInputProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rechercher uniquement si on a au moins 2 caractères
  const searchQuery = value.trim().length >= 2 ? value.trim() : "";
  const { data: libraryResults = [] } = useSearchQuoteLineLibrary(searchQuery);

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

  const handleSelect = (item: { label: string; default_unit?: string | null; default_unit_price_ht?: number | null }) => {
    onChange(item.label);
    setPopoverOpen(false);
    inputRef.current?.blur();

    if (onSelect) {
      onSelect({
        label: item.label,
        unit: item.default_unit || undefined,
        price: item.default_unit_price_ht || undefined,
      });
    }
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
        <div className="absolute z-50 w-full mt-1 border rounded-md bg-popover shadow-md max-h-[300px] overflow-auto">
          <Command>
            <CommandList>
              <CommandEmpty>Aucune prestation trouvée</CommandEmpty>
              <CommandGroup>
                {libraryResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                    className="cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.default_unit_price_ht && item.default_unit && (
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.default_unit_price_ht)} / {item.default_unit}
                        </div>
                      )}
                    </div>
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
