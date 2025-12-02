import { useState } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { GlobalSearch } from "@/components/GlobalSearch";

interface GlobalSearchWrapperProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export const GlobalSearchWrapper = ({ query, onQueryChange }: GlobalSearchWrapperProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <GlobalSearch query={query} isOpen={isOpen} onSelect={() => setIsOpen(false)}>
      <div className="w-full">
        <SearchBar
          placeholder=""
          value={query}
          onSearch={(value) => {
            onQueryChange(value);
            setIsOpen(value.trim().length >= 2);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 200);
          }}
          className="w-full"
        />
      </div>
    </GlobalSearch>
  );
};

