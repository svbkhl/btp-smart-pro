/**
 * Composant pour éditer les lignes d'un devis détaillé
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuoteLines, useCreateQuoteLine, useUpdateQuoteLine, useDeleteQuoteLine, QuoteLine } from "@/hooks/useQuoteLines";
import { useSearchQuoteLineLibrary, useUpsertQuoteLineLibrary } from "@/hooks/useQuoteLineLibrary";
import { estimateMaterialPrice } from "@/hooks/useMaterialsPriceCatalog";
import { useAuth } from "@/hooks/useAuth";
import { computeLineTotals, formatCurrency, formatTvaRate } from "@/utils/quoteCalculations";
import { Plus, Trash2, Edit2, Save, X, Search, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface QuoteLinesEditorProps {
  quoteId: string;
  tvaRate: number;
  onTotalsChange?: (totals: { subtotal_ht: number; total_tva: number; total_ttc: number }) => void;
}

export const QuoteLinesEditor = ({ quoteId, tvaRate, onTotalsChange }: QuoteLinesEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: lines = [], isLoading } = useQuoteLines(quoteId);
  const createLine = useCreateQuoteLine();
  const updateLine = useUpdateQuoteLine();
  const deleteLine = useDeleteQuoteLine();

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<Partial<QuoteLine> | null>(null);
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLine, setNewLine] = useState<Partial<QuoteLine>>({
    label: "",
    description: "",
    category: "other",
    unit: null,
    quantity: null,
    unit_price_ht: null,
    tva_rate: tvaRate,
  });

  // Autocomplete bibliothèque
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const { data: libraryResults = [] } = useSearchQuoteLineLibrary(librarySearchQuery);
  const upsertLibrary = useUpsertQuoteLineLibrary();
  const [libraryPopoverOpen, setLibraryPopoverOpen] = useState(false);

  // Calculer les totaux
  useEffect(() => {
    if (lines.length > 0 && onTotalsChange) {
      const totals = lines.reduce(
        (acc, line) => {
          const lineTotals = computeLineTotals({
            quantity: line.quantity ?? null,
            unit_price_ht: line.unit_price_ht ?? null,
            tva_rate: line.tva_rate,
          });
          return {
            subtotal_ht: acc.subtotal_ht + lineTotals.total_ht,
            total_tva: acc.total_tva + lineTotals.total_tva,
            total_ttc: acc.total_ttc + lineTotals.total_ttc,
          };
        },
        { subtotal_ht: 0, total_tva: 0, total_ttc: 0 }
      );
      onTotalsChange(totals);
    }
  }, [lines, onTotalsChange]);

  const handleStartEdit = (line: QuoteLine) => {
    setEditingLineId(line.id);
    setEditingLine({ ...line });
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setEditingLine(null);
  };

  const handleSaveEdit = async () => {
    if (!editingLineId || !editingLine) return;

    try {
      await updateLine.mutateAsync({
        id: editingLineId,
        ...editingLine,
      });
      setEditingLineId(null);
      setEditingLine(null);
      toast({
        title: "Ligne mise à jour",
        description: "La ligne a été mise à jour avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la ligne",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette ligne ?")) return;

    try {
      await deleteLine.mutateAsync({ id, quoteId });
      toast({
        title: "Ligne supprimée",
        description: "La ligne a été supprimée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la ligne",
        variant: "destructive",
      });
    }
  };

  const handleAddFromLibrary = async (libraryItem: any) => {
    if (!user) return;

    try {
      // Résoudre le prix selon l'ordre de priorité PRO
      // 1) Prix de la bibliothèque (priorité absolue)
      let resolvedPrice = await resolvePriceFromLibrary(libraryItem.id, user.id);
      
      // 2) Si pas de prix dans la bibliothèque, chercher dans catalogue/IA
      if (!resolvedPrice || !resolvedPrice.price) {
        resolvedPrice = await resolveLinePrice(
          libraryItem.label,
          libraryItem.default_category || null,
          libraryItem.default_unit || null,
          user.id,
          libraryItem.default_unit_price_ht // Passer le prix library s'il existe
        );
      }

      // Mapper la source vers le format attendu
      const priceSourceMap: Record<PriceSource, "manual" | "library" | "market_estimate" | "ai_estimate"> = {
        library: "library",
        catalog: "market_estimate",
        ai_estimate: "ai_estimate",
        manual: "manual",
      };

      await createLine.mutateAsync({
        quote_id: quoteId,
        label: libraryItem.label,
        description: null,
        category: libraryItem.default_category || "other",
        unit: libraryItem.default_unit || null,
        quantity: null, // L'utilisateur devra saisir
        unit_price_ht: resolvedPrice.price,
        tva_rate: tvaRate,
        price_source: priceSourceMap[resolvedPrice.source],
      });

      // Mettre à jour la bibliothèque (incrémenter times_used)
      await upsertLibrary.mutateAsync({
        label: libraryItem.label,
        default_unit: libraryItem.default_unit,
        default_unit_price_ht: unitPrice || libraryItem.default_unit_price_ht,
        default_category: libraryItem.default_category,
      });

      setLibraryPopoverOpen(false);
      setLibrarySearchQuery("");
      toast({
        title: "Ligne ajoutée",
        description: "La ligne a été ajoutée depuis la bibliothèque",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la ligne",
        variant: "destructive",
      });
    }
  };

  const handleAddNewLine = async () => {
    if (!newLine.label?.trim()) {
      toast({
        title: "Erreur",
        description: "Le libellé de la ligne est requis",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    try {
      // Résoudre le prix si non fourni manuellement
      let finalPrice = newLine.unit_price_ht;
      let finalPriceSource: "manual" | "library" | "market_estimate" | "ai_estimate" = "manual";

      if (!finalPrice && newLine.label.trim()) {
        const resolved = await resolveLinePrice(
          newLine.label.trim(),
          newLine.category || null,
          newLine.unit || null,
          user.id
        );
        finalPrice = resolved.price;
        
        const priceSourceMap: Record<PriceSource, "manual" | "library" | "market_estimate" | "ai_estimate"> = {
          library: "library",
          catalog: "market_estimate",
          ai_estimate: "ai_estimate",
          manual: "manual",
        };
        finalPriceSource = priceSourceMap[resolved.source];
      } else if (finalPrice) {
        // Prix saisi manuellement
        finalPriceSource = "manual";
      }

      await createLine.mutateAsync({
        quote_id: quoteId,
        ...newLine,
        unit_price_ht: finalPrice,
        tva_rate: newLine.tva_rate ?? tvaRate,
        price_source: finalPriceSource,
      });

      // Ajouter à la bibliothèque pour mémoriser
      if (newLine.label.trim()) {
        await upsertLibrary.mutateAsync({
          label: newLine.label.trim(),
          default_unit: newLine.unit || undefined,
          default_unit_price_ht: finalPrice || undefined,
          default_category: newLine.category || undefined,
        });
      }

      // Réinitialiser
      setNewLine({
        label: "",
        description: "",
        category: "other",
        unit: null,
        quantity: null,
        unit_price_ht: null,
        tva_rate: tvaRate,
      });
      setIsAddingLine(false);
      toast({
        title: "Ligne ajoutée",
        description: "La ligne a été ajoutée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la ligne",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Chargement des lignes...</div>;
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec bouton ajouter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lignes du devis</h3>
        <div className="flex gap-2">
          <Popover open={libraryPopoverOpen} onOpenChange={setLibraryPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Search className="h-4 w-4" />
                Depuis bibliothèque
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Rechercher dans la bibliothèque..."
                  value={librarySearchQuery}
                  onValueChange={setLibrarySearchQuery}
                />
                <CommandList>
                  <CommandEmpty>Aucun résultat trouvé</CommandEmpty>
                  <CommandGroup>
                    {libraryResults.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleAddFromLibrary(item)}
                        className="cursor-pointer"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.label}</div>
                          {item.default_unit_price_ht && (
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
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            onClick={() => setIsAddingLine(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter une ligne
          </Button>
        </div>
      </div>

      {/* Table des lignes */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Libellé</TableHead>
              <TableHead className="w-[100px]">Catégorie</TableHead>
              <TableHead className="w-[80px]">Unité</TableHead>
              <TableHead className="w-[100px]">Quantité</TableHead>
              <TableHead className="w-[120px]">Prix unitaire HT</TableHead>
              <TableHead className="w-[120px]">Total HT</TableHead>
              <TableHead className="w-[100px]">TVA</TableHead>
              <TableHead className="w-[120px]">Total TTC</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Aucune ligne. Cliquez sur "Ajouter une ligne" pour commencer.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => {
                const isEditing = editingLineId === line.id;
                const lineData = isEditing ? editingLine : line;
                const totals = computeLineTotals({
                  quantity: lineData?.quantity ?? null,
                  unit_price_ht: lineData?.unit_price_ht ?? null,
                  tva_rate: lineData?.tva_rate ?? tvaRate,
                });

                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={lineData?.label || ""}
                          onChange={(e) =>
                            setEditingLine({ ...lineData, label: e.target.value })
                          }
                          placeholder="Libellé"
                        />
                      ) : (
                        <div>
                          <div className="font-medium">{line.label}</div>
                          {line.description && (
                            <div className="text-xs text-muted-foreground">{line.description}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={lineData?.category || "other"}
                          onValueChange={(value) =>
                            setEditingLine({ ...lineData, category: value as any })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="labor">Main d'œuvre</SelectItem>
                            <SelectItem value="material">Matériaux</SelectItem>
                            <SelectItem value="service">Prestation</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">
                          {line.category === "labor" && "Main d'œuvre"}
                          {line.category === "material" && "Matériaux"}
                          {line.category === "service" && "Prestation"}
                          {line.category === "other" && "Autre"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={lineData?.unit || ""}
                          onValueChange={(value) =>
                            setEditingLine({ ...lineData, unit: value || null })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="m2">m²</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="h">h</SelectItem>
                            <SelectItem value="u">u</SelectItem>
                            <SelectItem value="forfait">Forfait</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        line.unit || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={lineData?.quantity ?? ""}
                          onChange={(e) =>
                            setEditingLine({
                              ...lineData,
                              quantity: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-20"
                        />
                      ) : (
                        line.quantity ?? "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={lineData?.unit_price_ht ?? ""}
                          onChange={(e) =>
                            setEditingLine({
                              ...lineData,
                              unit_price_ht: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-24"
                        />
                      ) : (
                        line.unit_price_ht ? formatCurrency(line.unit_price_ht) : "-"
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(totals.total_ht)}
                      {line.price_source && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {line.price_source === "library" && "📚 Bibliothèque"}
                          {line.price_source === "market_estimate" && "📊 Catalogue"}
                          {line.price_source === "ai_estimate" && "🤖 Estimation"}
                          {line.price_source === "manual" && "✏️ Manuel"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatTvaRate(lineData?.tva_rate ?? tvaRate)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(totals.total_ttc)}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveEdit}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(line)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(line.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}

            {/* Ligne d'ajout */}
            {isAddingLine && (
              <TableRow className="bg-muted/50">
                <TableCell>
                  <Input
                    value={newLine.label || ""}
                    onChange={(e) => setNewLine({ ...newLine, label: e.target.value })}
                    placeholder="Libellé"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newLine.category || "other"}
                    onValueChange={(value) =>
                      setNewLine({ ...newLine, category: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labor">Main d'œuvre</SelectItem>
                      <SelectItem value="material">Matériaux</SelectItem>
                      <SelectItem value="service">Prestation</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={newLine.unit || ""}
                    onValueChange={(value) =>
                      setNewLine({ ...newLine, unit: value || null })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m2">m²</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="h">h</SelectItem>
                      <SelectItem value="u">u</SelectItem>
                      <SelectItem value="forfait">Forfait</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newLine.quantity ?? ""}
                    onChange={(e) =>
                      setNewLine({
                        ...newLine,
                        quantity: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-20"
                    placeholder="Qty"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newLine.unit_price_ht ?? ""}
                    onChange={(e) =>
                      setNewLine({
                        ...newLine,
                        unit_price_ht: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-24"
                    placeholder="Prix"
                  />
                </TableCell>
                <TableCell>
                  {newLine.quantity && newLine.unit_price_ht ? (
                    <>
                      {formatCurrency(
                        computeLineTotals({
                          quantity: newLine.quantity,
                          unit_price_ht: newLine.unit_price_ht,
                          tva_rate: newLine.tva_rate ?? tvaRate,
                        }).total_ht
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        ✏️ À valider
                      </div>
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{formatTvaRate(newLine.tva_rate ?? tvaRate)}</TableCell>
                <TableCell>
                  {newLine.quantity && newLine.unit_price_ht
                    ? formatCurrency(
                        computeLineTotals({
                          quantity: newLine.quantity,
                          unit_price_ht: newLine.unit_price_ht,
                          tva_rate: newLine.tva_rate ?? tvaRate,
                        }).total_ttc
                      )
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={handleAddNewLine}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingLine(false);
                        setNewLine({
                          label: "",
                          description: "",
                          category: "other",
                          unit: null,
                          quantity: null,
                          unit_price_ht: null,
                          tva_rate: tvaRate,
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totaux */}
      {lines.length > 0 && (
        <div className="flex justify-end">
          <div className="space-y-2 w-64">
            <div className="flex justify-between text-sm">
              <span>Total HT:</span>
              <span className="font-medium">
                {formatCurrency(
                  lines.reduce(
                    (sum, line) =>
                      sum +
                      computeLineTotals({
                        quantity: line.quantity ?? null,
                        unit_price_ht: line.unit_price_ht ?? null,
                        tva_rate: line.tva_rate,
                      }).total_ht,
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total TVA:</span>
              <span className="font-medium">
                {formatCurrency(
                  lines.reduce(
                    (sum, line) =>
                      sum +
                      computeLineTotals({
                        quantity: line.quantity ?? null,
                        unit_price_ht: line.unit_price_ht ?? null,
                        tva_rate: line.tva_rate,
                      }).total_tva,
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total TTC:</span>
              <span>
                {formatCurrency(
                  lines.reduce(
                    (sum, line) =>
                      sum +
                      computeLineTotals({
                        quantity: line.quantity ?? null,
                        unit_price_ht: line.unit_price_ht ?? null,
                        tva_rate: line.tva_rate,
                      }).total_ttc,
                    0
                  )
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
