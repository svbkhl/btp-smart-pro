import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  FileText,
  Sheet,
  Calendar,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Phone,
  Target,
  Layers,
  BookOpen,
  ExternalLink,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

/* ─── Types ─── */
type Category = "script_r1" | "script_r2" | "fiche_produit" | "process" | "autre";

interface CloserResource {
  id: string;
  category: Category;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/* ─── Config des catégories ─── */
const CATEGORIES: Record<Category, { label: string; icon: React.ElementType; color: string }> = {
  script_r1:     { label: "Script R1",      icon: Phone,    color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  script_r2:     { label: "Script R2",      icon: Target,   color: "bg-green-500/10 text-green-600 border-green-500/20" },
  fiche_produit: { label: "Fiche Produit",  icon: Layers,   color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  process:       { label: "Process",        icon: BookOpen, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  autre:         { label: "Autre",          icon: FileText, color: "bg-muted/50 text-muted-foreground border-border" },
};

/* ─── Helpers URL ─── */
function extractSheetsEmbedUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  return `https://docs.google.com/spreadsheets/d/${match[1]}/pubhtml?widget=true&headers=false`;
}

function buildCalendlyEmbedUrl(url: string): string {
  return url.split("?")[0].replace(/\/$/, "") + "?embed_type=Inline&hide_event_type_details=1&hide_gdpr_banner=1";
}

/* ─── Hooks Supabase ─── */
function useCloserResources() {
  return useQuery({
    queryKey: ["closer_resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closer_resources" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as CloserResource[]) || [];
    },
  });
}

function useUpsertResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resource: Partial<CloserResource> & { title: string; category: Category; content: string }) => {
      const payload = { ...resource, updated_at: new Date().toISOString() };
      if (resource.id) {
        const { error } = await supabase.from("closer_resources" as any).update(payload).eq("id", resource.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("closer_resources" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["closer_resources"] }),
  });
}

function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("closer_resources" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["closer_resources"] }),
  });
}

/* ─── Carte d'une ressource ─── */
const ResourceCard = ({ resource }: { resource: CloserResource }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(resource.title);
  const [editContent, setEditContent] = useState(resource.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const upsert = useUpsertResource();
  const del = useDeleteResource();
  const { toast } = useToast();

  const cat = CATEGORIES[resource.category] || CATEGORIES.autre;
  const CatIcon = cat.icon;

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ ...resource, title: editTitle, content: editContent });
      setEditing(false);
      toast({ title: "Sauvegardé ✓" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await del.mutateAsync(resource.id);
      toast({ title: "Supprimé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  return (
    <>
      <GlassCard className="overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={cn("p-2 rounded-lg border flex-shrink-0", cat.color)}>
                <CatIcon className="w-4 h-4" />
              </div>
              {editing ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="font-semibold h-8 text-sm"
                  autoFocus
                />
              ) : (
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{resource.title}</p>
                  <Badge variant="outline" className={cn("text-xs mt-0.5", cat.color)}>{cat.label}</Badge>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {editing ? (
                <>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSave} disabled={upsert.isPending}>
                    {upsert.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(false); setEditTitle(resource.title); setEditContent(resource.content); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(true); setExpanded(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </>
              )}
            </div>
          </div>

          {(expanded || editing) && (
            <div className="mt-4 pt-4 border-t border-border/50">
              {editing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Contenu en Markdown (## Titre, **gras**, - liste...)"
                />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed bg-transparent p-0 m-0">
                    {resource.content}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ressource ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. "{resource.title}" sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/* ─── Onglet Prospects (Google Sheets) ─── */
const ProspectsTab = ({ userKey }: { userKey: string }) => {
  const storageKey = `closer_sheets_url_${userKey}`;
  const [inputUrl, setInputUrl] = useState(() => localStorage.getItem(storageKey) || "");
  const [savedUrl, setSavedUrl] = useState(() => localStorage.getItem(storageKey) || "");
  const [embedUrl, setEmbedUrl] = useState<string | null>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? extractSheetsEmbedUrl(saved) : null;
  });
  const [error, setError] = useState("");
  const [showConfig, setShowConfig] = useState(!localStorage.getItem(storageKey));

  const handleSave = () => {
    setError("");
    if (!inputUrl.trim()) {
      localStorage.removeItem(storageKey);
      setSavedUrl("");
      setEmbedUrl(null);
      return;
    }
    const url = extractSheetsEmbedUrl(inputUrl.trim());
    if (!url) {
      setError("URL invalide. Copiez le lien de partage d'un Google Sheet (docs.google.com/spreadsheets/...)");
      return;
    }
    localStorage.setItem(storageKey, inputUrl.trim());
    setSavedUrl(inputUrl.trim());
    setEmbedUrl(url);
    setShowConfig(false);
  };

  return (
    <div className="space-y-4">
      {/* Bouton toggle config */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{savedUrl ? "Votre Google Sheet est configuré." : "Aucun Google Sheet configuré."}</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowConfig(!showConfig)}
          className="gap-1.5 rounded-xl text-xs h-7"
        >
          <Pencil className="w-3 h-3" />
          {showConfig ? "Masquer" : "Modifier l'URL"}
        </Button>
      </div>

      {/* Bloc URL — masquable */}
      {showConfig && (
        <GlassCard className="p-4 sm:p-5">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">URL Google Sheets</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Copiez l'URL de votre Google Sheet (le sheet doit être partagé en lecture publique ou avec lien).
              </p>
              <div className="flex gap-2">
                <Input
                  value={inputUrl}
                  onChange={(e) => { setInputUrl(e.target.value); setError(""); }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="text-sm"
                />
                <Button onClick={handleSave} className="gap-2 rounded-xl flex-shrink-0">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Enregistrer</span>
                </Button>
              </div>
              {error && <p className="text-destructive text-xs mt-1">{error}</p>}
            </div>
            {savedUrl && (
              <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" />
                Ouvrir dans Google Sheets
              </a>
            )}
          </div>
        </GlassCard>
      )}

      {embedUrl ? (
        <GlassCard className="overflow-hidden p-0">
          <iframe
            src={embedUrl}
            title="Google Sheets - Liste prospects"
            className="w-full min-h-[500px] border-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </GlassCard>
      ) : (
        <GlassCard className="p-12 text-center">
          <Sheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">Renseignez l'URL de votre Google Sheet ci-dessus</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Votre liste de prospects s'affichera ici directement</p>
        </GlassCard>
      )}
    </div>
  );
};

/* ─── Onglet Calendly ─── */
const CalendlyTab = ({ userKey }: { userKey: string }) => {
  const storageKey = `closer_calendly_url_${userKey}`;
  const [inputUrl, setInputUrl] = useState(() => localStorage.getItem(storageKey) || "");
  const [embedUrl, setEmbedUrl] = useState<string | null>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? buildCalendlyEmbedUrl(saved) : null;
  });
  const [error, setError] = useState("");
  const [showConfig, setShowConfig] = useState(!localStorage.getItem(storageKey));

  const handleSave = () => {
    setError("");
    if (!inputUrl.trim()) {
      localStorage.removeItem(storageKey);
      setEmbedUrl(null);
      return;
    }
    if (!inputUrl.includes("calendly.com")) {
      setError("URL invalide. Elle doit contenir calendly.com (ex: https://calendly.com/votre-nom/demo)");
      return;
    }
    localStorage.setItem(storageKey, inputUrl.trim());
    setEmbedUrl(buildCalendlyEmbedUrl(inputUrl.trim()));
    setShowConfig(false);
  };

  return (
    <div className="space-y-4">
      {/* Bouton toggle config */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{inputUrl ? "Votre Calendly est configuré." : "Aucun Calendly configuré."}</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowConfig(!showConfig)}
          className="gap-1.5 rounded-xl text-xs h-7"
        >
          <Pencil className="w-3 h-3" />
          {showConfig ? "Masquer" : "Modifier l'URL"}
        </Button>
      </div>

      {/* Bloc URL — masquable */}
      {showConfig && (
        <GlassCard className="p-4 sm:p-5">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">URL Calendly personnelle</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Accédez à votre Calendly pour planifier vous-même les RDV après vos appels téléphoniques avec les prospects.
              </p>
              <div className="flex gap-2">
                <Input
                  value={inputUrl}
                  onChange={(e) => { setInputUrl(e.target.value); setError(""); }}
                  placeholder="https://calendly.com/votre-nom/demo-btp"
                  className="text-sm"
                />
                <Button onClick={handleSave} className="gap-2 rounded-xl flex-shrink-0">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Enregistrer</span>
                </Button>
              </div>
              {error && <p className="text-destructive text-xs mt-1">{error}</p>}
            </div>
            {embedUrl && (
              <a href={inputUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" />
                Ouvrir Calendly en plein écran
              </a>
            )}
          </div>
        </GlassCard>
      )}

      {embedUrl ? (
        <GlassCard className="overflow-hidden p-0">
          <iframe
            src={embedUrl}
            title="Calendly — Réservation démo"
            className="w-full min-h-[650px] border-0"
          />
        </GlassCard>
      ) : (
        <GlassCard className="p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">Renseignez votre URL Calendly ci-dessus</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Votre agenda s'affichera ici pour poser les RDV après vos appels</p>
        </GlassCard>
      )}
    </div>
  );
};

/* ─── Dialogue nouvelle ressource ─── */
const NewResourceDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("script_r1");
  const [content, setContent] = useState("");
  const upsert = useUpsertResource();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    try {
      await upsert.mutateAsync({ title: title.trim(), category, content, sort_order: 99 });
      toast({ title: "Ressource créée ✓" });
      setTitle(""); setCategory("script_r1"); setContent("");
      onClose();
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer la ressource", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle ressource</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Script R1 – Secteur Plomberie" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][]).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contenu</Label>
            <p className="text-xs text-muted-foreground">Supporte le Markdown : ## Titre, **gras**, - liste, | tableau |</p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[260px] font-mono text-sm"
              placeholder="Rédigez votre script, fiche ou process ici..."
            />
          </div>
        </div>
        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Annuler</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || upsert.isPending} className="gap-2 rounded-xl">
            {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Composant principal ─── */
export const CloserResources = () => {
  const { user } = useAuth();
  const { data: resources = [], isLoading } = useCloserResources();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const userKey = user?.email || "default";

  const groupedResources = (Object.keys(CATEGORIES) as Category[]).reduce((acc, cat) => {
    acc[cat] = resources.filter((r) => r.category === cat);
    return acc;
  }, {} as Record<Category, CloserResource[]>);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="documentation" className="w-full">
        <TabsList className="w-full grid grid-cols-3 rounded-xl h-11">
          <TabsTrigger value="documentation" className="gap-1.5 rounded-lg text-xs sm:text-sm">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documentation</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="prospects" className="gap-1.5 rounded-lg text-xs sm:text-sm">
            <Sheet className="w-4 h-4" />
            <span className="hidden sm:inline">Mes Prospects</span>
            <span className="sm:hidden">Prospects</span>
          </TabsTrigger>
          <TabsTrigger value="calendly" className="gap-1.5 rounded-lg text-xs sm:text-sm">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Mon Calendly</span>
            <span className="sm:hidden">Calendly</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Documentation ── */}
        <TabsContent value="documentation" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Scripts d'appel, fiches produits, process R1/R2 — partagés avec tous les closers.
            </p>
            <Button size="sm" onClick={() => setShowNewDialog(true)} className="gap-2 rounded-xl flex-shrink-0">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : resources.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">Aucune ressource pour l'instant</p>
              <Button size="sm" onClick={() => setShowNewDialog(true)} className="mt-4 gap-2 rounded-xl">
                <Plus className="w-4 h-4" />Ajouter une ressource
              </Button>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {(Object.entries(groupedResources) as [Category, CloserResource[]][])
                .filter(([, items]) => items.length > 0)
                .map(([cat, items]) => (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      {(() => { const Icon = CATEGORIES[cat].icon; return <Icon className="w-3.5 h-3.5 text-muted-foreground" />; })()}
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{CATEGORIES[cat].label}</span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">{items.length}</Badge>
                    </div>
                    {items.map((r) => <ResourceCard key={r.id} resource={r} />)}
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* ── Prospects ── */}
        <TabsContent value="prospects" className="mt-4">
          <ProspectsTab userKey={userKey} />
        </TabsContent>

        {/* ── Calendly ── */}
        <TabsContent value="calendly" className="mt-4">
          <CalendlyTab userKey={userKey} />
        </TabsContent>
      </Tabs>

      <NewResourceDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} />
    </div>
  );
};
