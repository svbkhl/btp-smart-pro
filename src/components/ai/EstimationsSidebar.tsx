import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Ruler, CheckSquare, X } from "lucide-react";
import { useEstimations, useDeleteEstimation } from "@/hooks/useEstimations";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { AIEstimation } from "@/hooks/useEstimations";

interface EstimationsSidebarProps {
  selectedEstimationId: string | null;
  onSelectEstimation: (id: string | null) => void;
  onNewEstimation: () => void;
}

export const EstimationsSidebar = ({
  selectedEstimationId,
  onSelectEstimation,
  onNewEstimation,
}: EstimationsSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteSelectionDialog, setShowDeleteSelectionDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { data: estimations = [] } = useEstimations();
  const deleteEstimation = useDeleteEstimation();

  const filteredEstimations = estimations.filter((est) =>
    est.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteEstimation.mutateAsync(id);
      if (selectedEstimationId === id) {
        onSelectEstimation(null);
      }
      toast({
        title: "Estimation supprimée",
        description: "L'estimation a été supprimée de l'historique",
      });
    } catch {
      // erreur gérée par le hook
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelection = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(ids.map((id) => deleteEstimation.mutateAsync(id)));
      toast({
        title: "Estimations supprimées",
        description: `${ids.length} estimation(s) supprimée(s) avec succès`,
      });
      if (selectedEstimationId && ids.includes(selectedEstimationId)) {
        onSelectEstimation(null);
      }
      setSelectedIds(new Set());
      setIsSelectMode(false);
      setShowDeleteSelectionDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les estimations",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <GlassCard className="flex flex-col h-full min-h-[400px] sm:min-h-0">
      <div className="p-4 border-b border-border/50 space-y-2">
        <Button onClick={onNewEstimation} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle estimation
        </Button>
        {filteredEstimations.length > 0 && !isSelectMode && (
          <Button onClick={toggleSelectMode} variant="outline" className="w-full" size="sm">
            <CheckSquare className="h-4 w-4 mr-2" />
            Sélectionner
          </Button>
        )}
        {filteredEstimations.length > 0 && isSelectMode && (
          <div className="flex gap-2">
            <Button
              onClick={() => selectedIds.size > 0 && setShowDeleteSelectionDialog(true)}
              variant="destructive"
              className="flex-1"
              size="sm"
              disabled={isDeleting || selectedIds.size === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer ({selectedIds.size})
            </Button>
            <Button onClick={toggleSelectMode} variant="outline" size="sm" disabled={isDeleting}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredEstimations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune estimation</p>
            </div>
          ) : (
            filteredEstimations.map((est) => (
              <EstimationItem
                key={est.id}
                estimation={est}
                isSelected={selectedEstimationId === est.id}
                onSelect={() => !isSelectMode && onSelectEstimation(est.id)}
                onDelete={(e) => handleDelete(est.id, e)}
                isSelectMode={isSelectMode}
                isChecked={selectedIds.has(est.id)}
                onToggleSelect={() => toggleSelect(est.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={showDeleteSelectionDialog} onOpenChange={setShowDeleteSelectionDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les estimations sélectionnées</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedIds.size} estimation(s) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelection}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlassCard>
  );
};

interface EstimationItemProps {
  estimation: AIEstimation;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isSelectMode?: boolean;
  isChecked?: boolean;
  onToggleSelect?: () => void;
}

const EstimationItem = ({
  estimation,
  isSelected,
  onSelect,
  onDelete,
  isSelectMode = false,
  isChecked = false,
  onToggleSelect,
}: EstimationItemProps) => (
  <div
    onClick={isSelectMode ? (e) => { e.stopPropagation(); onToggleSelect?.(); } : onSelect}
    className={cn(
      "group relative p-3 rounded-lg cursor-pointer transition-colors",
      isSelected
        ? "bg-primary text-primary-foreground"
        : "hover:bg-white/60 dark:hover:bg-gray-800/60"
    )}
  >
    <div className="flex items-start justify-between gap-2">
      {isSelectMode && (
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggleSelect?.()}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{estimation.title || "Sans titre"}</p>
        <p
          className={cn(
            "text-xs mt-1 truncate",
            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
          )}
        >
          {estimation.estimation_result?.substring(0, 50)}
          {estimation.estimation_result?.length > 50 && "..."}
        </p>
        <p
          className={cn(
            "text-xs mt-1",
            isSelected ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {formatDistanceToNow(new Date(estimation.created_at), {
            addSuffix: true,
            locale: fr,
          })}
        </p>
      </div>
      {!isSelectMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  </div>
);
