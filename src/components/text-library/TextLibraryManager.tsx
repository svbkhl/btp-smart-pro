import { useState } from "react";
import { Plus, Search, Trash2, Edit, Copy, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTextSnippets, useCreateTextSnippet, useUpdateTextSnippet, useDeleteTextSnippet, useIncrementSnippetUsage } from "@/hooks/useTextLibrary";
import type { TextSnippet, CreateTextSnippetData } from "@/types/textLibrary";
import { useToast } from "@/components/ui/use-toast";

export const TextLibraryManager = () => {
  const { data: snippets = [], isLoading, isError, error } = useTextSnippets();
  const createSnippet = useCreateTextSnippet();
  const updateSnippet = useUpdateTextSnippet();
  const deleteSnippet = useDeleteTextSnippet();
  const incrementUsage = useIncrementSnippetUsage();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<TextSnippet | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateTextSnippetData>({
    category: 'description',
    title: '',
    content: '',
    tags: [],
  });

  // Filtrer les snippets (recherche uniquement)
  const filteredSnippets = snippets.filter(snippet => {
    if (!searchQuery) return true;
    return (
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Copier dans le presse-papier (contenu ou titre si pas de description)
  const handleCopy = (snippet: TextSnippet) => {
    navigator.clipboard.writeText(snippet.content || snippet.title);
    incrementUsage.mutate(snippet.id);
    toast({
      title: "Copié !",
      description: "Le texte a été copié dans votre presse-papier.",
    });
  };

  // Créer un nouveau snippet
  const handleCreate = () => {
    if (!formData.title || !formData.content) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    createSnippet.mutate(formData, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        setFormData({ category: 'description', title: '', content: '', tags: [] });
      },
    });
  };

  // Mettre à jour un snippet
  const handleUpdate = () => {
    if (!editingSnippet || !formData.title || !formData.content) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    updateSnippet.mutate(
      { id: editingSnippet.id, ...formData },
      {
        onSuccess: () => {
          setEditingSnippet(null);
          setFormData({ category: 'description', title: '', content: '', tags: [] });
        },
      }
    );
  };

  // Ouvrir le dialog d'édition
  const handleEdit = (snippet: TextSnippet) => {
    setEditingSnippet(snippet);
    setFormData({
      category: snippet.category,
      title: snippet.title,
      content: snippet.content,
      tags: snippet.tags,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bibliothèque de Phrases</h2>
          <p className="text-muted-foreground">
            Réutilisez vos textes fréquents dans vos devis et factures
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau texte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau texte</DialogTitle>
              <DialogDescription>
                Enregistrez un texte pour le réutiliser dans vos documents
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Titre de la section (corps de métier)</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Plâtrerie - Isolation"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Prestation (description complète)</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Ex: Fouille mécanique, béton..."
                  rows={6}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={createSnippet.isPending}>
                {createSnippet.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recherche */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un texte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 sm:pl-12"
          />
        </div>
      </div>

      {/* Liste des snippets */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      ) : isError && (error as Error)?.message === "TABLE_TEXT_SNIPPETS_MISSING" ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground space-y-2">
            <p className="font-medium">Bibliothèque de phrases non activée</p>
            <p className="text-sm">
              La table <code className="bg-muted px-1 rounded">text_snippets</code> est absente. Exécutez la migration <code className="bg-muted px-1 rounded">create_text_snippets_fixed.sql</code> dans Supabase (SQL Editor) pour que les textes des devis s&apos;enregistrent ici.
            </p>
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Erreur lors du chargement de la bibliothèque.</p>
          </CardContent>
        </Card>
      ) : filteredSnippets.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Aucun texte enregistré.</p>
            <p className="text-sm mt-2">
              Créez votre premier texte réutilisable, ou enregistrez un devis détaillé : les titres de sections et les libellés des lignes seront ajoutés ici automatiquement.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSnippets.map((snippet) => (
            <Card key={snippet.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Titre de la section (corps de métier)</p>
                    <CardTitle className="text-base">{snippet.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {snippet.content && snippet.content !== snippet.title ? (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Prestation (description complète)</p>
                    <CardDescription className="line-clamp-3 mb-4">
                      {snippet.content}
                    </CardDescription>
                  </>
                ) : null}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Hash className="h-3 w-3" />
                  <span>Utilisé {snippet.usage_count} fois</span>
                  {snippet.last_used_at && (
                    <>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>
                        {new Date(snippet.last_used_at).toLocaleDateString('fr-FR')}
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => handleCopy(snippet)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copier
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(snippet)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Êtes-vous sûr de vouloir supprimer ce texte ?")) {
                        deleteSnippet.mutate(snippet.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog d'édition */}
      <Dialog open={!!editingSnippet} onOpenChange={(open) => !open && setEditingSnippet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le texte</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titre de la section (corps de métier)</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Prestation (description complète)</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSnippet(null)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={updateSnippet.isPending}>
              {updateSnippet.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
