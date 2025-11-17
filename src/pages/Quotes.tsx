import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuotes, useDeleteQuote, Quote } from "@/hooks/useQuotes";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileText, Trash2, Eye, Download, Search, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuoteDisplay } from "@/components/ai/QuoteDisplay";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useClients } from "@/hooks/useClients";
import { downloadQuotePDF } from "@/services/pdfService";
import { formatDate } from "@/lib/utils";
import { safeAction } from "@/utils/safeAction";

const Quotes = () => {
  const { toast } = useToast();
  const { data: companyInfo } = useUserSettings();
  const { data: clients } = useClients();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const filters = {
    status: statusFilter !== "all" ? statusFilter : undefined,
    client_name: searchQuery || undefined,
  };

  const { data: quotes, isLoading } = useQuotes(filters);
  const deleteQuote = useDeleteQuote();
  
  // Utiliser des données par défaut pour éviter les chargements infinis
  const displayQuotes = quotes || [];

  const handleDelete = (id: string) => {
    setQuoteToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (quoteToDelete) {
      await safeAction(
        async () => {
          await deleteQuote.mutateAsync(quoteToDelete);
          setDeleteDialogOpen(false);
          setQuoteToDelete(null);
        },
        {
          successMessage: "Devis supprimé avec succès",
          errorMessage: "Erreur lors de la suppression du devis",
        }
      );
    }
  };

  const handleView = (quote: Quote) => {
    setSelectedQuote(quote);
    setViewDialogOpen(true);
  };

  const handleExportPDF = async (quote: Quote) => {
    await safeAction(
      async () => {
        const client = clients?.find(c => c.name === quote.client_name);
        
        // Normaliser les détails du devis pour s'assurer que le prix est correct
        const details = typeof quote.details === 'string' 
          ? JSON.parse(quote.details) 
          : (quote.details || {});
        
        // S'assurer que estimatedCost est présent dans les détails
        // Utiliser estimated_cost de la base de données si estimatedCost n'existe pas dans details
        const normalizedResult = {
          ...details,
          estimatedCost: details.estimatedCost || quote.estimated_cost || 0,
          workSteps: details.workSteps || [],
          materials: details.materials || [],
          recommendations: details.recommendations || [],
          estimatedDuration: details.estimatedDuration || null,
        };
        
        await downloadQuotePDF({
          result: normalizedResult,
          companyInfo,
          clientInfo: {
            name: quote.client_name || "Client",
            email: client?.email,
            phone: client?.phone,
            location: client?.location,
          },
          surface: quote.surface?.toString() || "0",
          workType: quote.work_type || "Non spécifié",
          region: details.region,
          quoteDate: new Date(quote.created_at),
          quoteNumber: quote.quote_number || undefined,
          signatureData: quote.signature_data || undefined,
          signedBy: quote.signed_by || undefined,
          signedAt: quote.signed_at || undefined,
        });
      },
      {
        successMessage: "PDF généré avec succès",
        errorMessage: "Erreur lors de la génération du PDF",
      }
    );
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Brouillon</Badge>;
      case "signed":
        return <Badge variant="default" className="bg-green-500">Signé</Badge>;
      case "sent":
        return <Badge variant="secondary">Envoyé</Badge>;
      case "accepted":
        return <Badge variant="default" className="bg-blue-500">Accepté</Badge>;
      case "rejected":
        return <Badge variant="destructive">Refusé</Badge>;
      default:
        return <Badge variant="outline">{status || "Non défini"}</Badge>;
    }
  };

  // Ne pas bloquer l'affichage, utiliser des données par défaut
  // Les hooks retournent déjà des données mock en cas de timeout (3 secondes)
  // Cette approche évite les chargements infinis en affichant toujours du contenu
  // displayQuotes est déjà déclaré plus haut

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Mes Devis</h1>
          <p className="text-muted-foreground">Gérez tous vos devis générés par l'IA</p>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Rechercher</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Rechercher par nom de client..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="md:w-48">
                <Label htmlFor="status">Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status" className="mt-2">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="signed">Signé</SelectItem>
                    <SelectItem value="sent">Envoyé</SelectItem>
                    <SelectItem value="accepted">Accepté</SelectItem>
                    <SelectItem value="rejected">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des devis */}
        {/* Afficher toujours le contenu, même pendant le chargement initial
            Les hooks retournent des données mock après 3 secondes de timeout
            Cela évite les chargements infinis */}
        {isLoading && displayQuotes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement des devis...</span>
          </div>
        ) : displayQuotes.length > 0 ? (
          <div className="grid gap-4">
            {displayQuotes.map((quote) => (
              <Card key={quote.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">
                              {quote.client_name || "Client non spécifié"}
                            </h3>
                            {getStatusBadge(quote.status)}
                          </div>
                          {quote.quote_number && (
                            <p className="text-xs text-muted-foreground mb-1 font-mono">
                              N° {quote.quote_number}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mb-2">
                            {quote.work_type || "Type de travaux non spécifié"}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {quote.surface && (
                              <span>Surface: {quote.surface} m²</span>
                            )}
                            {quote.estimated_cost && (
                              <span className="font-semibold text-foreground">
                                {quote.estimated_cost.toLocaleString("fr-FR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })} €
                              </span>
                            )}
                            <span>
                              Créé le: {formatDate(new Date(quote.created_at))}
                            </span>
                            {quote.signed_at && (
                              <span className="text-green-600">
                                Signé le: {formatDate(new Date(quote.signed_at))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(quote)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPDF(quote)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(quote.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun devis trouvé</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Aucun devis ne correspond à vos critères de recherche."
                  : "Vous n'avez pas encore de devis. Générez-en un avec l'IA !"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dialog de visualisation */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails du devis</DialogTitle>
              <DialogDescription>
                Devis pour {selectedQuote?.client_name}
              </DialogDescription>
            </DialogHeader>
            {selectedQuote && (() => {
              // Normaliser les détails du devis
              const details = typeof selectedQuote.details === 'string' 
                ? JSON.parse(selectedQuote.details) 
                : (selectedQuote.details || {});
              
              // S'assurer que estimatedCost est présent dans les détails
              const normalizedResult = {
                ...details,
                estimatedCost: details.estimatedCost || selectedQuote.estimated_cost || 0,
                workSteps: details.workSteps || [],
                materials: details.materials || [],
                recommendations: details.recommendations || [],
                estimatedDuration: details.estimatedDuration || null,
              };
              
              return (
                <QuoteDisplay
                  result={normalizedResult}
                  companyInfo={companyInfo}
                  clientInfo={{
                    name: selectedQuote.client_name || "Client",
                    email: clients?.find(c => c.name === selectedQuote.client_name)?.email,
                    phone: clients?.find(c => c.name === selectedQuote.client_name)?.phone,
                    location: clients?.find(c => c.name === selectedQuote.client_name)?.location,
                  }}
                  surface={selectedQuote.surface?.toString() || "0"}
                  workType={selectedQuote.work_type || "Non spécifié"}
                  region={details.region}
                  quoteDate={new Date(selectedQuote.created_at)}
                  quoteNumber={selectedQuote.quote_number || undefined}
                  signatureData={selectedQuote.signature_data || undefined}
                  signedBy={selectedQuote.signed_by || undefined}
                  signedAt={selectedQuote.signed_at || undefined}
                />
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation de suppression */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le devis ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le devis sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Quotes;

