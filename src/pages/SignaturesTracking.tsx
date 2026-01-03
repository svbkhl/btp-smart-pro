/**
 * Page de suivi des signatures électroniques
 * Pour visualiser tous les devis signés avec leurs détails juridiques
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  FileText, 
  Download, 
  Search, 
  Calendar,
  User,
  MapPin,
  Award,
  Loader2,
  Eye
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SignaturesTracking() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSignature, setSelectedSignature] = useState<any>(null);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);

  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    try {
      setLoading(true);

      // Récupérer tous les devis signés depuis ai_quotes et quotes
      const { data: aiQuotes, error: aiQuotesError } = await supabase
        .from('ai_quotes')
        .select('*')
        .eq('signed', true)
        .order('signed_at', { ascending: false });

      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('signed', true)
        .order('signed_at', { ascending: false });

      if (aiQuotesError) console.error('Erreur ai_quotes:', aiQuotesError);
      if (quotesError) console.error('Erreur quotes:', quotesError);

      // Combiner les deux listes
      const allSignatures = [
        ...(aiQuotes || []).map(q => ({ ...q, source: 'ai_quotes' })),
        ...(quotes || []).map(q => ({ ...q, source: 'quotes' })),
      ].sort((a, b) => new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime());

      setSignatures(allSignatures);
    } catch (error) {
      console.error('Erreur chargement signatures:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger les signatures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (quoteId: string) => {
    setDownloadingCert(quoteId);
    try {
      const response = await supabase.functions.invoke('generate-signature-certificate', {
        body: { quote_id: quoteId },
      });

      if (response.error) throw response.error;

      const { certificate_html, certificate_number } = response.data;

      // Créer un Blob HTML et le télécharger
      const blob = new Blob([certificate_html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificat-signature-${certificate_number}.html`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Certificat téléchargé",
        description: `Certificat ${certificate_number} téléchargé avec succès`,
      });
    } catch (error: any) {
      console.error('Erreur téléchargement certificat:', error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de générer le certificat",
        variant: "destructive",
      });
    } finally {
      setDownloadingCert(null);
    }
  };

  const filteredSignatures = signatures.filter(sig =>
    sig.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sig.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sig.signed_by?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            Signatures Électroniques
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi complet de toutes les signatures avec certificats
          </p>
        </div>
        
        <Badge variant="outline" className="text-lg px-4 py-2">
          {signatures.length} signature{signatures.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par client, numéro de devis, signataire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{signatures.length}</p>
              <p className="text-sm text-muted-foreground">Total signatures</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {signatures.filter(s => {
                  const signedDate = new Date(s.signed_at);
                  const today = new Date();
                  return signedDate.toDateString() === today.toDateString();
                }).length}
              </p>
              <p className="text-sm text-muted-foreground">Aujourd'hui</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {signatures.filter(s => s.signature_ip_address).length}
              </p>
              <p className="text-sm text-muted-foreground">Avec IP tracée</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">100%</p>
              <p className="text-sm text-muted-foreground">Conformité eIDAS</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des signatures */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des signatures</CardTitle>
          <CardDescription>
            Toutes les signatures avec leurs informations juridiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Devis</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Signataire</TableHead>
                  <TableHead>Date signature</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Montant TTC</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignatures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Aucune signature trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSignatures.map((sig) => (
                    <TableRow key={`${sig.source}-${sig.id}`}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{sig.quote_number || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{sig.client_name || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {sig.signed_by || 'Non spécifié'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(sig.signed_at).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {sig.signature_ip_address || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {sig.estimated_cost
                          ? new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(sig.estimated_cost)
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSignature(sig)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Détails de la signature</DialogTitle>
                                <DialogDescription>
                                  Informations juridiques complètes
                                </DialogDescription>
                              </DialogHeader>
                              {selectedSignature && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Devis</p>
                                      <p className="font-semibold">{selectedSignature.quote_number}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Client</p>
                                      <p className="font-semibold">{selectedSignature.client_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Signataire</p>
                                      <p className="font-semibold">{selectedSignature.signed_by}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Date/Heure</p>
                                      <p className="font-semibold">
                                        {new Date(selectedSignature.signed_at).toLocaleString('fr-FR', {
                                          dateStyle: 'full',
                                          timeStyle: 'long',
                                        })}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Adresse IP</p>
                                      <p className="font-mono text-sm">{selectedSignature.signature_ip_address || 'Non enregistrée'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Navigateur</p>
                                      <p className="text-sm truncate">{selectedSignature.signature_user_agent || 'Non enregistré'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Montant TTC</p>
                                      <p className="font-semibold text-lg text-primary">
                                        {selectedSignature.estimated_cost
                                          ? new Intl.NumberFormat('fr-FR', {
                                              style: 'currency',
                                              currency: 'EUR',
                                            }).format(selectedSignature.estimated_cost)
                                          : 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Type signature</p>
                                      <p className="font-semibold">
                                        {selectedSignature.signature_data ? 'Manuscrite tracée' : 'Typographique'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {selectedSignature.signature_data && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-2">Signature tracée</p>
                                      <img 
                                        src={selectedSignature.signature_data} 
                                        alt="Signature" 
                                        className="border rounded-lg p-4 bg-white max-h-32"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadCertificate(sig.id)}
                            disabled={downloadingCert === sig.id}
                          >
                            {downloadingCert === sig.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
