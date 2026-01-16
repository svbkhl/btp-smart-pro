/**
 * Composant pour éditer les sections et lignes d'un devis détaillé
 * Structure : Sections (corps de métier) + Lignes numérotées (1.1, 1.2, etc.)
 */

import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useQuoteSections, useCreateQuoteSection, useUpdateQuoteSection, useDeleteQuoteSection, QuoteSection } from "@/hooks/useQuoteSections";
import { useQuoteLines, useCreateQuoteLine, useUpdateQuoteLine, useDeleteQuoteLine, QuoteLine } from "@/hooks/useQuoteLines";
import { useSearchQuoteSectionLibrary, useUpsertQuoteSectionLibrary } from "@/hooks/useQuoteSectionLibrary";
import { useSearchQuoteLineLibrary, useUpsertQuoteLineLibrary } from "@/hooks/useQuoteLineLibrary";
import { useAuth } from "@/hooks/useAuth";
import { computeLineTotals, computeQuoteTotals, formatCurrency, formatTvaRate } from "@/utils/quoteCalculations";
import { resolveLinePrice, resolvePriceFromLibrary, PriceSource } from "@/utils/resolveLinePrice";
import { Plus, Trash2, Edit2, Save, X, Search, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuoteSectionsEditorProps {
  quoteId: string;
  tvaRate: number;
  tva293b: boolean;
  onTotalsChange?: (totals: { subtotal_ht: number; total_tva: number; total_ttc: number }) => void;
  onTva293bChange?: (value: boolean) => void;
}

interface SectionWithLines {
  section: QuoteSection;
  lines: QuoteLine[];
}

export const QuoteSectionsEditor = ({ 
  quoteId, 
  tvaRate, 
  tva293b,
  onTotalsChange,
  onTva293bChange 
}: QuoteSectionsEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: sections = [], isLoading: sectionsLoading } = useQuoteSections(quoteId);
  const { data: lines = [], isLoading: linesLoading } = useQuoteLines(quoteId);
  const createSection = useCreateQuoteSection();
  const updateSection = useUpdateQuoteSection();
  const deleteSection = useDeleteQuoteSection();
  const createLine = useCreateQuoteLine();
  const updateLine = useUpdateQuoteLine();
  const deleteLine = useDeleteQuoteLine();
  const upsertSectionLibrary = useUpsertQuoteSectionLibrary();
  const upsertLineLibrary = useUpsertQuoteLineLibrary();

  // Grouper lignes par section
  const sectionsWithLines = useMemo(() => {
    const grouped: SectionWithLines[] = [];
    const linesWithoutSection: QuoteLine[] = [];

    // Grouper par section
    sections.forEach((section) => {
      const sectionLines = lines
        .filter((line) => line.section_id === section.id)
        .sort((a, b) => a.position - b.position);
      grouped.push({ section, lines: sectionLines });
    });

    // Lignes sans section
    lines.forEach((line) => {
      if (!line.section_id) {
        linesWithoutSection.push(line);
      }
    });

    // Si des lignes sans section, créer une section virtuelle
    if (linesWithoutSection.length > 0) {
      grouped.push({
        section: {
          id: "__no_section__",
          quote_id: quoteId,
          company_id: "",
          position: sections.length,
          title: "Autres prestations",
          created_at: "",
          updated_at: "",
        },
        lines: linesWithoutSection.sort((a, b) => a.position - b.position),
      });
    }

    return grouped;
  }, [sections, lines, quoteId]);

  // États d'édition
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState<string>("");
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<Partial<QuoteLine> | null>(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState<string>("");
  const [isAddingLine, setIsAddingLine] = useState<string | null>(null); // section_id ou null
  const [newLine, setNewLine] = useState<Partial<QuoteLine>>({
    label: "",
    unit: null,
    quantity: null,
    unit_price_ht: null,
    tva_rate: tva293b ? 0 : tvaRate,
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Autocomplete
  const [sectionSearchQuery, setSectionSearchQuery] = useState("");
  const [lineSearchQuery, setLineSearchQuery] = useState("");
  const { data: sectionLibraryResults = [] } = useSearchQuoteSectionLibrary(sectionSearchQuery);
  const { data: lineLibraryResults = [] } = useSearchQuoteLineLibrary(lineSearchQuery);
  const [sectionPopoverOpen, setSectionPopoverOpen] = useState(false);
  const [linePopoverOpen, setLinePopoverOpen] = useState(false);
  const [linePopoverSectionId, setLinePopoverSectionId] = useState<string | null>(null);

  // Calculer les totaux
  useEffect(() => {
    if (lines.length > 0 && onTotalsChange) {
      const totals = computeQuoteTotals(
        lines.map((l) => ({
          quantity: l.quantity ?? null,
          unit_price_ht: l.unit_price_ht ?? null,
          tva_rate: tva293b ? 0 : (l.tva_rate ?? tvaRate),
        })),
        tva293b ? 0 : tvaRate,
        tva293b
      );
      onTotalsChange(totals);
    }
  }, [lines, tvaRate, tva293b, onTotalsChange]);

  // Calculer numérotation (1.1, 1.2, 2.1, etc.)
  const getLineNumber = (sectionIndex: number, lineIndex: number): string => {
    return `${sectionIndex + 1}.${lineIndex + 1}`;
  };

  // Gérer expansion/collapse sections
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Ajouter section
  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre de la section est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const section = await createSection.mutateAsync({
        quote_id: quoteId,
        title: newSectionTitle.trim(),
        position: sections.length,
      });

      // Ajouter à la bibliothèque
      await upsertSectionLibrary.mutateAsync({
        title: newSectionTitle.trim(),
      });

      setNewSectionTitle("");
      setIsAddingSection(false);
      setExpandedSections((prev) => new Set(prev).add(section.id));
      toast({
        title: "Section ajoutée",
        description: "La section a été ajoutée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la section",
        variant: "destructive",
      });
    }
  };

  // Modifier section
  const handleStartEditSection = (section: QuoteSection) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
  };

  const handleSaveSection = async () => {
    if (!editingSectionId || !editingSectionTitle.trim()) return;

    try {
      await updateSection.mutateAsync({
        id: editingSectionId,
        title: editingSectionTitle.trim(),
      });

      // Mettre à jour bibliothèque
      await upsertSectionLibrary.mutateAsync({
        title: editingSectionTitle.trim(),
      });

      setEditingSectionId(null);
      setEditingSectionTitle("");
      toast({
        title: "Section mise à jour",
        description: "La section a été mise à jour avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la section",
        variant: "destructive",
      });
    }
  };

  // Supprimer section
  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette section ? Les lignes associées seront également supprimées.")) return;

    try {
      await deleteSection.mutateAsync({ id: sectionId, quoteId });
      toast({
        title: "Section supprimée",
        description: "La section et ses lignes ont été supprimées",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la section",
        variant: "destructive",
      });
    }
  };

  // Ajouter ligne depuis bibliothèque
  const handleAddLineFromLibrary = async (libraryItem: any, sectionId: string | null) => {
    if (!user) return;

    try {
      // Résoudre le prix
      let resolvedPrice = await resolvePriceFromLibrary(libraryItem.id, user.id);
      if (!resolvedPrice || !resolvedPrice.price) {
        resolvedPrice = await resolveLinePrice(
          libraryItem.label,
          libraryItem.default_category || null,
          libraryItem.default_unit || null,
          user.id,
          libraryItem.default_unit_price_ht
        );
      }

      const priceSourceMap: Record<PriceSource, "manual" | "library" | "market_estimate" | "ai_estimate"> = {
        library: "library",
        catalog: "market_estimate",
        ai_estimate: "ai_estimate",
        manual: "manual",
      };

      // Trouver la position dans la section
      const sectionLines = lines.filter((l) => l.section_id === sectionId);
      const position = sectionLines.length;

      await createLine.mutateAsync({
        quote_id: quoteId,
        section_id: sectionId || undefined,
        position,
        label: libraryItem.label,
        unit: libraryItem.default_unit || null,
        quantity: null, // L'utilisateur devra saisir
        unit_price_ht: resolvedPrice.price,
        tva_rate: tva293b ? 0 : tvaRate,
        price_source: priceSourceMap[resolvedPrice.source],
      });

      // Mettre à jour bibliothèque
      await upsertLineLibrary.mutateAsync({
        label: libraryItem.label,
        default_unit: libraryItem.default_unit,
        default_unit_price_ht: resolvedPrice.price || libraryItem.default_unit_price_ht,
        default_category: libraryItem.default_category,
      });

      setLinePopoverOpen(false);
      setLineSearchQuery("");
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

  // Ajouter nouvelle ligne
  const handleAddNewLine = async (sectionId: string | null) => {
    if (!newLine.label?.trim()) {
      toast({
        title: "Erreur",
        description: "Le libellé de la ligne est requis",
        variant: "destructive",
      });
      return;
    }

    if (!newLine.unit) {
      toast({
        title: "Erreur",
        description: "L'unité est requise",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    try {
      // Résoudre le prix si non fourni
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
      }

      // Trouver la position
      const sectionLines = lines.filter((l) => l.section_id === sectionId);
      const position = sectionLines.length;

      await createLine.mutateAsync({
        quote_id: quoteId,
        section_id: sectionId || undefined,
        position,
        ...newLine,
        unit_price_ht: finalPrice,
        tva_rate: tva293b ? 0 : (newLine.tva_rate ?? tvaRate),
        price_source: finalPriceSource,
      });

      // Ajouter à la bibliothèque
      if (newLine.label.trim() && newLine.unit) {
        await upsertLineLibrary.mutateAsync({
          label: newLine.label.trim(),
          default_unit: newLine.unit,
          default_unit_price_ht: finalPrice || undefined,
          default_category: newLine.category || undefined,
        });
      }

      // Réinitialiser
      setNewLine({
        label: "",
        unit: null,
        quantity: null,
        unit_price_ht: null,
        tva_rate: tva293b ? 0 : tvaRate,
      });
      setIsAddingLine(null);
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

  // Modifier ligne
  const handleStartEditLine = (line: QuoteLine) => {
    setEditingLineId(line.id);
    setEditingLine({ ...line });
  };

  const handleSaveLine = async () => {
    if (!editingLineId || !editingLine) return;

    try {
      await updateLine.mutateAsync({
        id: editingLineId,
        ...editingLine,
        tva_rate: tva293b ? 0 : (editingLine.tva_rate ?? tvaRate),
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

  // Supprimer ligne
  const handleDeleteLine = async (id: string) => {
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

  if (sectionsLoading || linesLoading) {
    return <div className="p-4 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec options */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sections et lignes du devis</h3>
        <div className="flex items-center gap-4">
          {/* Checkbox 293B */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="tva_293b"
              checked={tva293b}
              onCheckedChange={(checked) => {
                if (onTva293bChange) {
                  onTva293bChange(checked === true);
                }
              }}
            />
            <Label htmlFor="tva_293b" className="text-sm cursor-pointer">
              TVA non applicable - Article 293 B du CGI
            </Label>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddingSection(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter une section
          </Button>
        </div>
      </div>

      {/* Ajout section */}
      {isAddingSection && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Popover open={sectionPopoverOpen} onOpenChange={setSectionPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Search className="h-4 w-4" />
                    Depuis bibliothèque
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Rechercher une section..."
                      value={sectionSearchQuery}
                      onValueChange={setSectionSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Aucun résultat</CommandEmpty>
                      <CommandGroup>
                        {sectionLibraryResults.map((item) => (
                          <CommandItem
                            key={item.id}
                            onSelect={() => {
                              setNewSectionTitle(item.title);
                              setSectionPopoverOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            {item.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Titre de la section (ex: Plâtrerie et isolation)"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddSection();
                  }
                }}
              />
              <Button size="sm" onClick={handleAddSection}>
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingSection(false);
                  setNewSectionTitle("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections avec lignes */}
      {sectionsWithLines.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune section. Cliquez sur "Ajouter une section" pour commencer.
          </CardContent>
        </Card>
      ) : (
        sectionsWithLines.map(({ section, lines: sectionLines }, sectionIndex) => {
          const isExpanded = expandedSections.has(section.id);
          const isEditing = editingSectionId === section.id;
          const isVirtualSection = section.id === "__no_section__";

          return (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection(section.id)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingSectionTitle}
                          onChange={(e) => setEditingSectionTitle(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveSection();
                            }
                          }}
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveSection}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingSectionId(null);
                            setEditingSectionTitle("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-lg">
                          {sectionIndex + 1}. {section.title}
                        </CardTitle>
                        {!isVirtualSection && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEditSection(section)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSection(section.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex gap-2">
                      <Popover
                        open={linePopoverOpen && linePopoverSectionId === section.id}
                        onOpenChange={(open) => {
                          setLinePopoverOpen(open);
                          if (open) setLinePopoverSectionId(section.id);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Search className="h-4 w-4" />
                            Prestation
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="end">
                          <Command>
                            <CommandInput
                              placeholder="Rechercher une prestation..."
                              value={lineSearchQuery}
                              onValueChange={setLineSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>Aucun résultat</CommandEmpty>
                              <CommandGroup>
                                {lineLibraryResults.map((item) => (
                                  <CommandItem
                                    key={item.id}
                                    onSelect={() => handleAddLineFromLibrary(item, isVirtualSection ? null : section.id)}
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
                        onClick={() => {
                          setIsAddingLine(isVirtualSection ? null : section.id);
                          setExpandedSections((prev) => new Set(prev).add(section.id));
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Ligne
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  {/* Table des lignes */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Réf</TableHead>
                          <TableHead className="w-[300px]">Désignation</TableHead>
                          <TableHead className="w-[80px]">Unité</TableHead>
                          <TableHead className="w-[100px]">Prix unitaire HT</TableHead>
                          <TableHead className="w-[100px]">Quantité</TableHead>
                          <TableHead className="w-[120px]">Prix HT</TableHead>
                          {!tva293b && <TableHead className="w-[80px]">TVA</TableHead>}
                          <TableHead className="w-[120px]">Total TTC</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectionLines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={tva293b ? 8 : 9} className="text-center text-muted-foreground py-4">
                              Aucune ligne. Cliquez sur "Ligne" pour ajouter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sectionLines.map((line, lineIndex) => {
                            const isEditing = editingLineId === line.id;
                            const lineData = isEditing ? editingLine : line;
                            const totals = computeLineTotals({
                              quantity: lineData?.quantity ?? null,
                              unit_price_ht: lineData?.unit_price_ht ?? null,
                              tva_rate: tva293b ? 0 : (lineData?.tva_rate ?? tvaRate),
                            });

                            return (
                              <TableRow key={line.id}>
                                <TableCell className="font-medium">
                                  {getLineNumber(sectionIndex, lineIndex)}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={lineData?.label || ""}
                                      onChange={(e) =>
                                        setEditingLine({ ...lineData, label: e.target.value })
                                      }
                                      placeholder="Désignation"
                                    />
                                  ) : (
                                    line.label
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
                                <TableCell className="font-medium">
                                  {formatCurrency(totals.total_ht)}
                                </TableCell>
                                {!tva293b && (
                                  <TableCell>
                                    {formatTvaRate(lineData?.tva_rate ?? tvaRate)}
                                  </TableCell>
                                )}
                                <TableCell className="font-medium">
                                  {formatCurrency(totals.total_ttc)}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" onClick={handleSaveLine}>
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingLineId(null);
                                          setEditingLine(null);
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleStartEditLine(line)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteLine(line.id)}
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
                        {isAddingLine === (isVirtualSection ? null : section.id) && (
                          <TableRow className="bg-muted/50">
                            <TableCell></TableCell>
                            <TableCell>
                              <Input
                                value={newLine.label || ""}
                                onChange={(e) => setNewLine({ ...newLine, label: e.target.value })}
                                placeholder="Désignation"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={newLine.unit || ""}
                                onValueChange={(value) =>
                                  setNewLine({ ...newLine, unit: value || null })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unité" />
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
                                placeholder="Qté"
                              />
                            </TableCell>
                            <TableCell>
                              {newLine.quantity && newLine.unit_price_ht
                                ? formatCurrency(
                                    computeLineTotals({
                                      quantity: newLine.quantity,
                                      unit_price_ht: newLine.unit_price_ht,
                                      tva_rate: tva293b ? 0 : (newLine.tva_rate ?? tvaRate),
                                    }).total_ht
                                  )
                                : "-"}
                            </TableCell>
                            {!tva293b && <TableCell>{formatTvaRate(newLine.tva_rate ?? tvaRate)}</TableCell>}
                            <TableCell>
                              {newLine.quantity && newLine.unit_price_ht
                                ? formatCurrency(
                                    computeLineTotals({
                                      quantity: newLine.quantity,
                                      unit_price_ht: newLine.unit_price_ht,
                                      tva_rate: tva293b ? 0 : (newLine.tva_rate ?? tvaRate),
                                    }).total_ttc
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAddNewLine(isVirtualSection ? null : section.id)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setIsAddingLine(null);
                                    setNewLine({
                                      label: "",
                                      unit: null,
                                      quantity: null,
                                      unit_price_ht: null,
                                      tva_rate: tva293b ? 0 : tvaRate,
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
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {/* Totaux */}
      {lines.length > 0 && (
        <Card>
          <CardContent className="pt-6">
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
                            tva_rate: tva293b ? 0 : (line.tva_rate ?? tvaRate),
                          }).total_ht,
                        0
                      )
                    )}
                  </span>
                </div>
                {!tva293b && (
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
                              tva_rate: line.tva_rate ?? tvaRate,
                            }).total_tva,
                          0
                        )
                      )}
                    </span>
                  </div>
                )}
                {tva293b && (
                  <div className="text-xs text-muted-foreground italic">
                    TVA non applicable - Article 293 B du CGI
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total TTC:</span>
                  <span>
                    {formatCurrency(
                      lines.reduce(
                        (sum, line) =>
                          sum +
                          computeLineTotals({
                            quantity: line.quantity ?? null,
                            unit_price_ht: line.unit_price_ht ?? null,
                            tva_rate: tva293b ? 0 : (line.tva_rate ?? tvaRate),
                          }).total_ttc,
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
