import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ServiceLine {
  description: string;
  quantity: number;
  unit_price: number;
}

interface ServiceLineGeneratorProps {
  lines: ServiceLine[];
  onChange: (lines: ServiceLine[]) => void;
}

export const ServiceLineGenerator = ({ lines, onChange }: ServiceLineGeneratorProps) => {
  const addLine = () => {
    onChange([...lines, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof ServiceLine, value: string | number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const total = lines.reduce((sum, line) => {
    return sum + (line.quantity * line.unit_price);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Lignes de service</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLine}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter une ligne
        </Button>
      </div>

      {lines.length > 0 ? (
        <ScrollArea className="h-64 border rounded-lg p-4">
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) => updateLine(index, "description", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Qté"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                  className="w-20"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Prix unit."
                  value={line.unit_price}
                  onChange={(e) => updateLine(index, "unit_price", parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                <div className="w-24 text-sm font-medium flex items-center">
                  {(line.quantity * line.unit_price).toFixed(2)}€
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p className="text-sm">Aucune ligne de service</p>
          <p className="text-xs mt-1">Cliquez sur "Ajouter une ligne" pour commencer</p>
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Total HT: </span>
            <span className="font-semibold">{total.toFixed(2)}€</span>
          </div>
        </div>
      )}
    </div>
  );
};












