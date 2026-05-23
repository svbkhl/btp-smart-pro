/**
 * Page de détail d'un devis avec workflow complet
 * Affiche : Informations, Timeline, Section Paiement
 * Accessible uniquement pour les utilisateurs connectés
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuoteDetailView from "@/components/quotes/QuoteDetailView";
import { generateQuotePDF } from "@/services/pdfService";
import { SendToClientModal } from "@/components/billing/SendToClientModal";

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadQuote();
    }
  }, [id]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      
      // Essayer d'abord dans ai_quotes
      let { data, error } = await supabase
        .from('ai_quotes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // Si pas trouvé, essayer dans quotes
      if (!data) {
        const quotesResult = await supabase
          .from('ai_quotes')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        data = quotesResult.data;
        error = quotesResult.error;
      }

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        toast({
          title: "❌ Devis introuvable",
          description: "Ce devis n'existe pas ou a été supprimé",
          variant: "destructive",
        });
        navigate('/ai?tab=quotes');
        return;
      }

      setQuote(data);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger le devis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    toast({
      title: "ℹ️ Modification",
      description: "La modification des devis n'est pas encore disponible",
    });
  };

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce devis ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "✅ Devis supprimé",
        description: "Le devis a été supprimé avec succès",
      });

      navigate('/ai?tab=quotes');
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le devis",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!quote.client_email) {
      toast({
        title: "❌ Email manquant",
        description: "Ce devis n'a pas d'adresse email client",
        variant: "destructive",
      });
      return;
    }
    
    setShowSendModal(true);
  };

  const handleViewMessages = () => {
    navigate(`/messaging?document=${id}&type=quote`);
  };

  const handleDownloadPDF = async () => {
    try {
      toast({
        title: "📄 Génération du PDF",
        description: "Génération en cours...",
      });

      const pdfBlob = await generateQuotePDF({
        result: {
          estimatedCost: quote.estimated_cost,
          workSteps: quote.details?.workSteps || [],
          materials: quote.details?.materials || [],
          description: quote.details?.description || "",
          quote_number: quote.quote_number,
        },
        companyInfo: {
          company_name: "BTP Smart Pro",
          address: "",
          phone: "",
          email: "",
          siret: "",
        },
        clientInfo: {
          name: quote.client_name || "",
          address: "",
          email: quote.client_email || "",
          phone: "",
        },
        surface: quote.details?.surface || "",
        workType: quote.details?.prestation || "",
      });

      // Télécharger le PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devis-${quote.quote_number || id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "✅ PDF téléchargé",
        description: "Le devis a été téléchargé avec succès",
      });
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de générer le PDF",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Chargement du devis...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!quote) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Devis introuvable</p>
            <Button onClick={() => navigate('/ai?tab=quotes')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux devis
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        {/* Bouton retour */}
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        {/* Vue détaillée complète */}
        <QuoteDetailView
          quote={quote}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSendEmail={handleSendEmail}
          onDownloadPDF={handleDownloadPDF}
          onViewMessages={handleViewMessages}
        />

        {/* Modal d'envoi d'email */}
        {quote && (
          <SendToClientModal
            open={showSendModal}
            onOpenChange={setShowSendModal}
            quote={quote}
            onSuccess={() => {
              setShowSendModal(false);
              loadQuote(); // Rafraîchir le devis
              toast({
                title: "✅ Email envoyé",
                description: "Le devis a été envoyé au client avec succès",
              });
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}

