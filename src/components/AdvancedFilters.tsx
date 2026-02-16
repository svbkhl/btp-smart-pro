import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AdvancedFiltersProps {
  filters: {
    status?: string;
    minBudget?: number;
    maxBudget?: number;
    startDate?: string;
    endDate?: string;
    clientId?: string;
  };
  onFiltersChange: (filters: AdvancedFiltersProps["filters"]) => void;
  clients?: Array<{ id: string; name: string }>;
  showClientFilter?: boolean;
  showBudgetFilter?: boolean;
}

export const AdvancedFilters = ({
  filters,
  onFiltersChange,
  clients = [],
  showClientFilter = false,
  showBudgetFilter = true,
}: AdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== "" && value !== "all"
  ).length;

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setIsOpen(false);
  };

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtres avancés
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Filtres avancés</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>

          {showClientFilter && clients.length > 0 && (
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={filters.clientId || "all"}
                onValueChange={(value) =>
                  handleFilterChange("clientId", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showBudgetFilter && (
            <>
              <div className="space-y-2">
                <Label>Budget minimum (€)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minBudget || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "minBudget",
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Budget maximum (€)</Label>
                <Input
                  type="number"
                  placeholder="100000"
                  value={filters.maxBudget || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "maxBudget",
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Date de début</Label>
            <Input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date de fin</Label>
            <Input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Fermer
            </Button>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="ghost" className="flex-1">
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

