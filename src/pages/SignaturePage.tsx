/**
 * Page de signature pour les clients
 * Route: /sign/:quoteId
 * Version simplifiée qui utilise directement quoteId depuis l'URL
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, FileText, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractUUID } from "@/utils/uuidExtractor";
import SignatureWithOTP from "@/components/signature/SignatureWithOTP";
import { generateQuotePDFBase64 } from "@/services/pdfService";

export default function SignaturePage() {
  const { quoteId: rawQuoteId } = useParams<{ quoteId: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [signerEmail, setSignerEmail] = useState<string>("");

  // Déterminer si rawQuoteId est un token (avec suffixe) ou un UUID pur
  const hasToken = rawQuoteId && rawQuoteId.length > 36; // Un token a plus de 36 caractères
  const quoteId = rawQuoteId && !hasToken ? extractUUID(rawQuoteId) : null;

  // Charger le devis via Edge Function publique
  useEffect(() => {
    if (!rawQuoteId) {
      setError("ID du devis manquant");
      setLoading(false);
      return;
    }

    const loadQuote = async () => {
      try {
        // Utiliser l'Edge Function get-public-document pour récupérer le devis
        // Cela permet d'accéder au devis sans authentification (pour les clients)
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log("🔍 [SignaturePage] Chargement du devis:", 
          "rawQuoteId:", rawQuoteId,
          "hasToken:", hasToken,
          "extractedUUID:", quoteId,
          "url:", `${SUPABASE_URL}/functions/v1/get-public-document`
        );

        // Si rawQuoteId contient un suffixe, c'est un token de session
        // Sinon, c'est un quote_id direct
        const requestBody = hasToken
          ? { token: rawQuoteId } // Envoyer comme token si c'est une session
          : { quote_id: quoteId }; // Envoyer comme quote_id si c'est un UUID pur

        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-public-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(requestBody),
        });

        console.log("📡 [SignaturePage] Réponse Edge Function:", 
          "status:", response.status,
          "statusText:", response.statusText,
          "ok:", response.ok
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
          console.error("❌ Erreur chargement devis:", 
            "status:", response.status,
            "errorData:", JSON.stringify(errorData),
            "quoteIdSent:", quoteId,
            "rawQuoteId:", rawQuoteId
          );
          setError(errorData.error || `Devis introuvable (Erreur ${response.status})`);
          setLoading(false);
          return;
        }

        const result = await response.json();

        if (!result.document) {
          setError("Devis introuvable");
          setLoading(false);
          return;
        }

        // Le document retourné contient maintenant toutes les données nécessaires
        const quoteData = result.document;

        // Récupérer l'email du signataire depuis la session de signature
        if (result.signature_session?.signer_email) {
          setSignerEmail(result.signature_session.signer_email);
          console.log("📧 [SignaturePage] Email signataire depuis session:", result.signature_session.signer_email);
        } else if (quoteData.client_email) {
          setSignerEmail(quoteData.client_email);
          console.log("📧 [SignaturePage] Email signataire depuis devis:", quoteData.client_email);
        }

        // Vérifier si déjà signé
        if (quoteData.signed && quoteData.signed_at) {
          setQuote(quoteData);
          setLoading(false);
          return;
        }

        setQuote(quoteData);
        setLoading(false);
        
        // Générer le PDF pour l'aperçu (avec gestion d'erreur)
        try {
          await generatePdfPreview(quoteData);
        } catch (previewError: any) {
          console.error("❌ [SignaturePage] Erreur lors de la génération initiale du PDF:", previewError);
          setPdfError(previewError?.message || "Impossible de générer l'aperçu PDF");
        }
      } catch (err: any) {
        console.error("❌ Erreur:", err);
        setError("Erreur lors du chargement du devis");
        setLoading(false);
      }
    };

    loadQuote();
  }, [rawQuoteId, quoteId]);

  // Générer le PDF pour l'aperçu
  const generatePdfPreview = async (quoteData: any) => {
    try {
      setGeneratingPdf(true);
      console.log("📄 [SignaturePage] Génération PDF aperçu - données:", {
        estimated_cost: quoteData.estimated_cost,
        quote_number: quoteData.quote_number,
        client_name: quoteData.client_name,
        hasDetails: !!quoteData.details,
      });

      // Récupérer les informations de l'entreprise depuis la base de données
      // Note: Le client n'est pas authentifié, donc on utilise les données du devis ou des valeurs par défaut
      let companyInfo = {
        company_name: quoteData.company_name || "BTP Smart Pro",
        legalForm: quoteData.legal_form || "",
        logoUrl: quoteData.company_logo_url || "",
        address: quoteData.company_address || "",
        city: quoteData.company_city || "",
        postalCode: quoteData.company_postal_code || "",
        country: quoteData.company_country || "",
        siret: quoteData.company_siret || "",
        vatNumber: quoteData.company_vat_number || "",
      };

      // Essayer de récupérer depuis user_settings si possible (peut échouer si pas authentifié)
      if (quoteData.user_id) {
        try {
          const { data: settings, error: settingsError } = await supabase
            .from("user_settings")
            .select("company_name, legal_form, company_logo_url, address, city, postal_code, country, siret, vat_number")
            .eq("user_id", quoteData.user_id)
            .single();

          if (!settingsError && settings) {
            companyInfo = {
              company_name: settings.company_name || companyInfo.company_name,
              legalForm: settings.legal_form || companyInfo.legalForm,
              logoUrl: settings.company_logo_url || companyInfo.logoUrl,
              address: settings.address || companyInfo.address,
              city: settings.city || companyInfo.city,
              postalCode: settings.postal_code || companyInfo.postalCode,
              country: settings.country || companyInfo.country,
              siret: settings.siret || companyInfo.siret,
              vatNumber: settings.vat_number || companyInfo.vatNumber,
            };
            console.log("✅ [SignaturePage] Infos entreprise récupérées depuis user_settings");
          } else {
            console.warn("⚠️ [SignaturePage] Impossible de récupérer les infos entreprise depuis user_settings:", settingsError?.message || "Données non disponibles");
            console.log("ℹ️ [SignaturePage] Utilisation des valeurs par défaut ou du devis");
          }
        } catch (error: any) {
          console.warn("⚠️ [SignaturePage] Erreur récupération infos entreprise:", error?.message || error);
          console.log("ℹ️ [SignaturePage] Utilisation des valeurs par défaut ou du devis");
        }
      }

      // Déterminer le mode du devis
      const quoteMode = quoteData.mode || (quoteData.details?.format === "simplified" ? "simple" : "detailed");
      const tvaRate = quoteData.tva_rate ?? 0.20;
      const tva293b = quoteData.tva_non_applicable_293b || false;
      const effectiveTvaRate = tva293b ? 0 : tvaRate;

      // Récupérer les sections et lignes si mode détaillé
      // Utiliser les données déjà présentes dans quoteData si disponibles (depuis get-public-document)
      let pdfSections: any[] | undefined = undefined;
      let pdfLines: any[] | undefined = undefined;

      if (quoteMode === "detailed" && quoteData.id) {
        // Essayer d'abord avec les données déjà chargées dans quoteData
        if (quoteData.sections && Array.isArray(quoteData.sections)) {
          pdfSections = quoteData.sections.map((section: any) => ({
            id: section.id,
            title: section.title,
            position: section.position,
          }));
          console.log("✅ [SignaturePage] Sections récupérées depuis quoteData:", pdfSections.length);
        }
        
        if (quoteData.lines && Array.isArray(quoteData.lines)) {
          pdfLines = quoteData.lines.map((line: any) => ({
            label: line.label,
            description: line.description,
            unit: line.unit || "",
            quantity: line.quantity || 0,
            unit_price_ht: line.unit_price_ht || 0,
            total_ht: line.total_ht || 0,
            tva_rate: effectiveTvaRate,
            total_tva: line.total_tva || 0,
            total_ttc: line.total_ttc || 0,
            section_id: line.section_id,
          }));
          console.log("✅ [SignaturePage] Lignes récupérées depuis quoteData:", pdfLines.length);
        }
        
        // Si pas de données dans quoteData, essayer de les récupérer depuis la base (peut échouer si pas authentifié)
        if ((!pdfSections || !pdfLines) && quoteData.id) {
          try {
            if (!pdfSections) {
              const { data: sectionsData, error: sectionsError } = await supabase
                .from("quote_sections")
                .select("*")
                .eq("quote_id", quoteData.id)
                .order("position", { ascending: true });

              if (!sectionsError && sectionsData) {
                pdfSections = sectionsData.map(section => ({
                  id: section.id,
                  title: section.title,
                  position: section.position,
                }));
                console.log("✅ [SignaturePage] Sections récupérées depuis DB:", pdfSections.length);
              } else {
                console.warn("⚠️ [SignaturePage] Impossible de récupérer sections depuis DB:", sectionsError?.message);
              }
            }

            if (!pdfLines) {
              const { data: linesData, error: linesError } = await supabase
                .from("quote_lines")
                .select("*")
                .eq("quote_id", quoteData.id)
                .order("section_id", { ascending: true, nullsFirst: false })
                .order("position", { ascending: true });

              if (!linesError && linesData) {
                pdfLines = linesData.map(line => ({
                  label: line.label,
                  description: line.description,
                  unit: line.unit || "",
                  quantity: line.quantity || 0,
                  unit_price_ht: line.unit_price_ht || 0,
                  total_ht: line.total_ht || 0,
                  tva_rate: effectiveTvaRate,
                  total_tva: line.total_tva || 0,
                  total_ttc: line.total_ttc || 0,
                  section_id: line.section_id,
                }));
                console.log("✅ [SignaturePage] Lignes récupérées depuis DB:", pdfLines.length);
              } else {
                console.warn("⚠️ [SignaturePage] Impossible de récupérer lignes depuis DB:", linesError?.message);
              }
            }
          } catch (error: any) {
            console.warn("⚠️ [SignaturePage] Erreur récupération sections/lignes:", error?.message || error);
            // Continuer sans sections/lignes pour le mode simple
          }
        }
      }

      // Préparer les données du devis pour le PDF
      const quoteResult = {
        estimatedCost: quoteData.estimated_cost || 0,
        workSteps: quoteData.details?.workSteps || quoteData.details?.work_steps || [],
        materials: quoteData.details?.materials || [],
        description: quoteData.details?.description || quoteData.description || "Devis sans description",
        quote_number: quoteData.quote_number || "N/A",
      };

      // Récupérer les informations complètes du client depuis la table clients
      let clientCivility = '';
      let clientFirstName = '';
      let clientPhone = quoteData.client_phone || '';
      let clientAddress = quoteData.client_address || '';
      let clientEmail = quoteData.client_email || quoteData.email || '';
      let clientName = quoteData.client_name || "Client";
      let actualClientId = quoteData.client_id || null;

      // Si le devis est lié à un projet, récupérer le client_id depuis le projet
      if (!actualClientId && quoteData.project_id) {
        try {
          const { data: project } = await supabase
            .from("projects")
            .select("client_id")
            .eq("id", quoteData.project_id)
            .single();
          
          if (project?.client_id) {
            actualClientId = project.client_id;
            console.log("📋 [SignaturePage] client_id récupéré depuis projet:", actualClientId);
          }
        } catch (error) {
          console.warn("⚠️ [SignaturePage] Impossible de récupérer client_id depuis projet:", error);
        }
      }

      // Récupérer les informations complètes du client si client_id est disponible
      if (actualClientId) {
        try {
          const { data: client } = await supabase
            .from("clients")
            .select("titre, prenom, phone, location, email, name")
            .eq("id", actualClientId)
            .single();
          
          if (client) {
            clientCivility = client.titre || '';
            clientFirstName = client.prenom || '';
            if (client.phone && !clientPhone) {
              clientPhone = client.phone;
            }
            if (client.location && !clientAddress) {
              clientAddress = client.location;
            }
            if (client.email && !clientEmail) {
              clientEmail = client.email;
            }
            if (client.name && !clientName) {
              clientName = client.name;
            }
            console.log("✅ [SignaturePage] Infos client complètes récupérées:", {
              civility: clientCivility,
              firstName: clientFirstName,
              phone: clientPhone,
              address: clientAddress,
            });
          }
        } catch (error) {
          console.warn("⚠️ [SignaturePage] Impossible de récupérer les infos client complètes:", error);
        }
      } else {
        console.warn("⚠️ [SignaturePage] Aucun client_id disponible pour récupérer les infos complètes");
      }

      console.log("📄 [SignaturePage] Données pour PDF:", {
        quoteMode,
        effectiveTvaRate,
        tva293b,
        sectionsCount: pdfSections?.length || 0,
        linesCount: pdfLines?.length || 0,
        companyInfo: companyInfo.company_name,
        clientName,
        clientCivility,
        clientFirstName,
        clientAddress,
      });

      // Vérifier que toutes les données nécessaires sont présentes
      if (!quoteResult.quote_number && !quoteData.quote_number) {
        console.warn("⚠️ [SignaturePage] Pas de numéro de devis disponible");
      }

      console.log("📄 [SignaturePage] Tentative de génération PDF avec:", {
        hasResult: !!quoteResult,
        hasCompanyInfo: !!companyInfo,
        hasClientInfo: !!clientName,
        quoteMode,
        effectiveTvaRate,
        tva293b,
        sectionsCount: pdfSections?.length || 0,
        linesCount: pdfLines?.length || 0,
        totalTTC: quoteData.total_ttc || quoteData.estimated_cost,
      });

      // Générer le PDF en base64 puis convertir en Blob
      const pdfData = await generateQuotePDFBase64({
        result: quoteResult,
        companyInfo,
        clientInfo: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          location: clientAddress,
          civility: clientCivility,
          firstName: clientFirstName,
          address: clientAddress,
        },
        quoteDate: quoteData.created_at ? new Date(quoteData.created_at) : new Date(),
        quoteNumber: quoteData.quote_number || "N/A",
        mode: quoteMode,
        tvaRate: effectiveTvaRate,
        tva293b: tva293b,
        sections: pdfSections,
        lines: pdfLines,
        subtotal_ht: quoteData.subtotal_ht,
        total_tva: quoteData.total_tva,
        total_ttc: quoteData.total_ttc || quoteData.estimated_cost,
        signatureData: quoteData.signature_data || undefined,
        signedBy: quoteData.signed_by || undefined,
        signedAt: quoteData.signed_at || undefined,
      });

      if (!pdfData || !pdfData.base64) {
        throw new Error("La génération du PDF n'a retourné aucune donnée");
      }

      console.log("📄 [SignaturePage] PDF généré, taille base64:", pdfData.base64.length);

      // Convertir le base64 en Blob
      const base64Data = pdfData.base64;
      
      // Vérifier que le base64 est valide
      if (!base64Data || base64Data.length === 0) {
        throw new Error("Les données PDF sont vides");
      }

      try {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
        
        if (pdfBlob.size === 0) {
          throw new Error("Le Blob PDF est vide");
        }
        
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setPdfError(null);
        console.log("✅ [SignaturePage] PDF généré avec succès, URL créée, taille:", pdfBlob.size, "bytes");
      } catch (blobError: any) {
        console.error("❌ [SignaturePage] Erreur lors de la conversion en Blob:", blobError);
        throw new Error(`Erreur lors de la conversion du PDF: ${blobError?.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error("❌ [SignaturePage] Erreur génération PDF aperçu:", error);
      const errorMessage = error?.message || "Erreur lors de la génération de l'aperçu PDF";
      setPdfError(errorMessage);
      console.error("❌ [SignaturePage] Détails complets de l'erreur:", {
        message: errorMessage,
        stack: error?.stack,
        name: error?.name,
        error: error,
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Nettoyer l'URL du PDF au démontage
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleSignatureComplete = async (signatureDataOrNull: string | null, signerName: string) => {
    if (!quote) return;

    setSigning(true);
    try {
      // Utiliser l'Edge Function sign-quote pour signer le devis sans authentification
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Récupérer des métadonnées pour la signature
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toISOString();

      console.log("📝 [SignaturePage] Envoi de la signature:", {
        hasToken,
        token: hasToken ? rawQuoteId : undefined,
        quote_id: !hasToken ? quoteId : undefined,
        signerName,
        hasDrawnSignature: !!signatureDataOrNull,
      });

      const response = await fetch(`${SUPABASE_URL}/functions/v1/sign-quote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          token: hasToken ? rawQuoteId : undefined,
          quote_id: !hasToken ? quoteId : undefined,
          signature_data: signatureDataOrNull,
          signer_name: signerName,
          user_agent: userAgent,
          signed_at: timestamp,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        console.error("❌ Erreur signature:", errorData);
        throw new Error(errorData.error || "Impossible de signer le devis");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Impossible de signer le devis");
      }

      console.log("✅ Devis signé avec succès");

      toast({
        title: "✅ Signature enregistrée avec succès !",
        description: "Merci pour votre confiance. Nous vous contacterons prochainement.",
        duration: 5000,
      });

      // Recharger le devis pour afficher le statut mis à jour
      const requestBody = hasToken
        ? { token: rawQuoteId }
        : { quote_id: quoteId };

      const reloadResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-public-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (reloadResponse.ok) {
        const reloadResult = await reloadResponse.json();
        if (reloadResult.document) {
          setQuote(reloadResult.document);
        }
      }

      // ⚠️ PAS de redirection - le client reste sur la page de confirmation
    } catch (error: any) {
      console.error("Erreur lors de la signature:", error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de signer le document",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  // Éviter "Cannot read properties of null (reading 'signed')" : ne jamais accéder à quote avant la fin du chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Une erreur s&apos;est produite
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => window.history.back()}>
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (quote.signed && quote.signed_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-lg backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border-green-200">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">
              ✅ Merci pour votre signature !
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Votre devis a été signé avec succès le {new Date(quote.signed_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <p className="font-medium mb-2">Prochaines étapes :</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Nous avons bien reçu votre signature</li>
                  <li>Vous recevrez une confirmation par email</li>
                  <li>Notre équipe vous contactera sous 24-48h</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-center text-muted-foreground">
                Vous pouvez fermer cette page en toute sécurité
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto pt-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Aperçu PDF - Colonne gauche */}
          <div className="order-2 lg:order-1">
            <Card className="backdrop-blur-md bg-white/5 dark:bg-white/5 border-white/20 dark:border-white/10 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Aperçu du devis
                </CardTitle>
                <CardDescription>
                  Devis {quote.quote_number || quoteId || rawQuoteId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatingPdf ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : pdfUrl ? (
                  <div className="space-y-4">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[600px] rounded-lg border border-border"
                      title="Aperçu du devis"
                    />
                    <Button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = pdfUrl;
                        link.download = `devis-${quote.quote_number || 'document'}.pdf`;
                        link.click();
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger le PDF
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    Aperçu non disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formulaire de signature - Colonne droite */}
          <div className="order-1 lg:order-2">
            <Card className="backdrop-blur-md bg-white/5 dark:bg-white/5 border-white/20 dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Signature du devis
                </CardTitle>
                <CardDescription>
                  Veuillez signer pour confirmer votre accord
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client :</span>
                    <span className="font-medium">{quote.client_name || "Non spécifié"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant TTC :</span>
                    <span className="font-medium text-lg text-primary">
                      {quote.estimated_cost
                        ? new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          }).format(quote.estimated_cost)
                        : "N/A"}
                    </span>
                  </div>
                  {quote.details && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Description :</p>
                      <p className="text-sm">{quote.details.description || "Aucun détail"}</p>
                    </div>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    En signant ce document, vous acceptez les conditions et confirmez votre accord avec ce devis.
                  </AlertDescription>
                </Alert>

                {signing ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Enregistrement de votre signature...</p>
                  </div>
                ) : (
                  <SignatureWithOTP
                    quoteId={!hasToken ? quoteId : undefined}
                    sessionToken={hasToken ? rawQuoteId : undefined}
                    clientEmail={signerEmail || ""}
                    clientName={quote.client_name}
                    onSignatureComplete={handleSignatureComplete}
                    disabled={signing}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}





