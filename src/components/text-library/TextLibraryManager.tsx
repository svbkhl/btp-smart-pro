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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTextSnippets, useCreateTextSnippet, useUpdateTextSnippet, useDeleteTextSnippet, useIncrementSnippetUsage } from "@/hooks/useTextLibrary";
import type { TextSnippet, CreateTextSnippetData } from "@/types/textLibrary";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = [
  { value: 'introduction', label: 'Introduction' },
  { value: 'description', label: 'Description' },
  { value: 'conditions', label: 'Conditions' },
  { value: 'conclusion', label: 'Conclusion' },
  { value: 'custom', label: 'Personnalisé' },
] as const;

export const TextLibraryManager = () => {
  const { data: snippets = [], isLoading } = useTextSnippets();
  const createSnippet = useCreateTextSnippet();
  const updateSnippet = useUpdateTextSnippet();
  const deleteSnippet = useDeleteTextSnippet();
  const incrementUsage = useIncrementSnippetUsage();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<TextSnippet | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateTextSnippetData>({
    category: 'custom',
    title: '',
    content: '',
    tags: [],
  });

  // Filtrer les snippets
  const filteredSnippets = snippets.filter(snippet => {
    const matchesSearch = !searchQuery || 
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || snippet.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Copier dans le presse-papier
  const handleCopy = (snippet: TextSnippet) => {
    navigator.clipboard.writeText(snippet.content);
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
        setFormData({ category: 'custom', title: '', content: '', tags: [] });
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
          setFormData({ category: 'custom', title: '', content: '', tags: [] });
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
                <label className="text-sm font-medium">Catégorie</label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Titre</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Conditions de paiement"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Contenu</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Votre texte ici..."
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

      {/* Filtres */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un texte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des snippets */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      ) : filteredSnippets.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Aucun texte enregistré.</p>
            <p className="text-sm mt-2">
              Créez votre premier texte réutilisable !
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSnippets.map((snippet) => (
            <Card key={snippet.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-2">
                      {CATEGORIES.find(c => c.value === snippet.category)?.label}
                    </Badge>
                    <CardTitle className="text-base">{snippet.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <CardDescription className="line-clamp-3 mb-4">
                  {snippet.content}
                </CardDescription>
                
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
              <label className="text-sm font-medium">Catégorie</label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Titre</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Contenu</label>
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
