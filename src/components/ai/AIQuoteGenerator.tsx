import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { generateQuote } from "@/services/aiService";
import { Loader2, Sparkles, X, Download, Save, Euro, Clock, CheckCircle2, Plus } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useUserSettings } from "@/hooks/useUserSettings";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuoteDisplay } from "./QuoteDisplay";
import { downloadQuotePDF, generateQuotePDF } from "@/services/pdfService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parseQuoteDescription } from "@/services/quoteParserService";
import { MessageSquare, FileEdit, Wand2 } from "lucide-react";

// Types de travaux prédéfinis
const WORK_TYPES = [
  "Rénovation toiture",
  "Isolation thermique",
  "Rénovation électrique",
  "Plomberie",
  "Peinture",
  "Carrelage",
  "Parquet",
  "Menuiserie",
  "Maçonnerie",
  "Charpente",
  "Couverture",
  "Zinguerie",
  "Étanchéité",
  "Ventilation",
  "Chauffage",
  "Climatisation",
  "Électricité",
  "Plomberie sanitaire",
  "Rénovation complète",
  "Extension",
  "Surélévation",
  "Ravalement de façade",
  "Autre"
];

// Matériaux courants pour l'autocomplétion
const COMMON_MATERIALS = [
  "Tuiles", "Isolation", "Charpente", "Béton", "Ciment", "Carrelage",
  "Parquet", "Peinture", "Enduit", "Placo", "Laine de verre", "Laine de roche",
  "PVC", "Aluminium", "Bois", "Métal", "Cuivre", "Zinc", "Plomb",
  "Électricité", "Plomberie", "VMC", "Chaudière", "Radiateur"
];

export const AIQuoteGenerator = () => {
  const { toast } = useToast();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: companyInfo } = useUserSettings();
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [surface, setSurface] = useState<string>("");
  const [workType, setWorkType] = useState<string>("");
  const [customWorkType, setCustomWorkType] = useState<string>("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState<string>("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [manualPrice, setManualPrice] = useState<string>("");
  const [useManualPrice, setUseManualPrice] = useState<boolean>(false);
  const [region, setRegion] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);
  const [quoteSignature, setQuoteSignature] = useState<{data?: string; signedBy?: string; signedAt?: string} | null>(null);
  const [priceValidation, setPriceValidation] = useState<{
    isValid: boolean;
    message: string;
    warning?: string;
  } | null>(null);
  const [mode, setMode] = useState<"form" | "description">("form");
  const [description, setDescription] = useState<string>("");
  const [parsingDescription, setParsingDescription] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Mettre à jour le nom du client quand un client est sélectionné
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === "new") {
      setClientName("");
    } else {
      const client = clients?.find(c => c.id === clientId);
      if (client) {
        setClientName(client.name);
      }
    }
  };

  // Ajouter un matériau
  const handleAddMaterial = () => {
    const material = materialInput.trim();
    if (material && !materials.includes(material)) {
      setMaterials([...materials, material]);
      setMaterialInput("");
    }
  };

  // Supprimer un matériau
  const handleRemoveMaterial = (material: string) => {
    setMaterials(materials.filter(m => m !== material));
  };

  // Ajouter un matériau depuis la liste courante
  const handleAddCommonMaterial = (material: string) => {
    if (!materials.includes(material)) {
      setMaterials([...materials, material]);
    }
  };

  // Gérer les images
  const handleImagesChange = (urls: string[]) => {
    setImageUrls(urls);
  };

  // Parser la description libre avec l'IA
  const handleParseDescription = async () => {
    if (!description.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une description du devis",
        variant: "destructive",
      });
      return;
    }

    setParsingDescription(true);

    try {
      const parsed = await parseQuoteDescription(description);
      
      // Remplir automatiquement le formulaire avec les données parsées
      if (parsed.clientName) {
        setClientName(parsed.clientName);
        // Chercher si le client existe déjà
        const existingClient = clients?.find(c => 
          c.name.toLowerCase() === parsed.clientName.toLowerCase()
        );
        if (existingClient) {
          setSelectedClientId(existingClient.id);
        } else {
          setSelectedClientId("new");
        }
      }
      
      if (parsed.surface) {
        setSurface(parsed.surface.toString());
      }
      
      if (parsed.workType) {
        if (WORK_TYPES.includes(parsed.workType)) {
          setWorkType(parsed.workType);
        } else {
          setWorkType("Autre");
          setCustomWorkType(parsed.workType);
        }
      }
      
      if (parsed.materials && parsed.materials.length > 0) {
        setMaterials(parsed.materials);
      }
      
      if (parsed.region) {
        setRegion(parsed.region);
      }
      
      if (parsed.manualPrice) {
        setUseManualPrice(true);
        setManualPrice(parsed.manualPrice.toString());
      }
      
      // Basculer vers le mode formulaire pour afficher les données
      setMode("form");
      
      toast({
        title: "Description analysée !",
        description: "Les informations ont été extraites et le formulaire a été rempli automatiquement.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'analyser la description",
        variant: "destructive",
      });
    } finally {
      setParsingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!clientName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner ou saisir un nom de client",
        variant: "destructive",
      });
      return;
    }

    if (!surface || parseFloat(surface) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une surface valide",
        variant: "destructive",
      });
      return;
    }

    const finalWorkType = workType === "Autre" ? customWorkType : workType;
    if (!finalWorkType.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner ou saisir un type de travaux",
        variant: "destructive",
      });
      return;
    }

    if (materials.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter au moins un matériau",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setQuoteId(null);

    try {
      const response = await generateQuote({
        clientName: clientName.trim(),
        surface: parseFloat(surface),
        workType: finalWorkType,
        materials: materials,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        manualPrice: useManualPrice && manualPrice ? parseFloat(manualPrice) : undefined,
        region: region.trim() || undefined,
      });

      // Récupérer le numéro de devis depuis plusieurs sources possibles
      const currentQuoteNumber = response.quoteNumber 
        || response.quote?.quote_number 
        || response.quote?.details?.quote_number 
        || response.aiResponse?.quote_number 
        || null;
      
      setQuoteNumber(currentQuoteNumber);
      setResult({
        ...response.aiResponse,
        quote_number: currentQuoteNumber,
      });
      setQuoteId(response.quote?.id || null);
      
      // Récupérer la signature si elle existe dans le devis
      if (response.quote?.signature_data) {
        setQuoteSignature({
          data: response.quote.signature_data,
          signedBy: response.quote.signed_by,
          signedAt: response.quote.signed_at,
        });
      } else if (companyInfo?.signature_data) {
        // Utiliser la signature des paramètres si elle existe
        setQuoteSignature({
          data: companyInfo.signature_data,
          signedBy: companyInfo.signature_name,
          signedAt: new Date().toISOString(),
        });
      } else {
        setQuoteSignature(null);
      }
      
      // Scroll vers le résultat après génération
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
      toast({
        title: "Devis généré !",
        description: "Le devis a été créé avec succès par l'IA.",
      });
    } catch (error) {
      // Extraire le message d'erreur détaillé
      let errorMessage = "Impossible de générer le devis";
      
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = String((error as { error: unknown }).error);
      }
      
      // Messages d'erreur plus spécifiques
      if (errorMessage.includes('OPENAI_API_KEY')) {
        errorMessage = "Clé API OpenAI non configurée. Veuillez contacter l'administrateur.";
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('authorization')) {
        errorMessage = "Session expirée. Veuillez vous reconnecter.";
      } else if (errorMessage.includes('timeout') || errorMessage.includes('trop de temps')) {
        errorMessage = "La requête a pris trop de temps. Veuillez réessayer avec moins de données.";
      } else if (errorMessage.includes('Invalid request body') || errorMessage.includes('Missing required')) {
        errorMessage = "Données manquantes. Veuillez vérifier tous les champs requis.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedClientId("");
    setClientName("");
    setSurface("");
    setWorkType("");
    setCustomWorkType("");
    setMaterials([]);
    setMaterialInput("");
    setImageUrls([]);
    setManualPrice("");
    setUseManualPrice(false);
    setRegion("");
    setPriceValidation(null);
    setResult(null);
    setQuoteId(null);
    setQuoteNumber(null);
  };

  // Calculer le coût total des matériaux
  const totalMaterialsCost = result?.materials?.reduce((sum: number, mat: any) => 
    sum + (parseFloat(mat.unitCost) || 0), 0
  ) || 0;

  // Calculer le coût total des étapes
  const totalStepsCost = result?.workSteps?.reduce((sum: number, step: any) => 
    sum + (parseFloat(step.cost) || 0), 0
  ) || 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Formulaire avec onglets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Générer un devis avec l'IA
            </CardTitle>
            <CardDescription>
              Remplissez le formulaire ou décrivez votre devis en langage naturel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "form" | "description")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="form">
                  <FileEdit className="mr-2 h-4 w-4" />
                  Formulaire
                </TabsTrigger>
                <TabsTrigger value="description">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Description libre
                </TabsTrigger>
              </TabsList>

              {/* Mode Description libre */}
              <TabsContent value="description" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Décrivez votre devis</Label>
                  <Textarea
                    id="description"
                    placeholder="Exemple: Fais-moi un devis pour la rénovation d'une toiture de 85 m² avec tuiles à Lyon pour le client Martin. J'ai besoin de tuiles, isolation et charpente. Budget approximatif: 15000€"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Décrivez votre devis en langage naturel. L'IA extraira automatiquement les informations (client, surface, type de travaux, matériaux, région, prix).
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleParseDescription}
                  disabled={parsingDescription || !description.trim()}
                  className="w-full"
                >
                  {parsingDescription ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Analyser et remplir le formulaire
                    </>
                  )}
                </Button>
                {mode === "description" && (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>💡 Astuce :</strong> Après l'analyse, vous pourrez vérifier et modifier les informations dans l'onglet "Formulaire" avant de générer le devis.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Mode Formulaire */}
              <TabsContent value="form">
                <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Client - Identification */}
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select 
                  value={selectedClientId} 
                  onValueChange={handleClientChange}
                  disabled={clientsLoading}
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Sélectionner un client ou saisir un nom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">➕ Nouveau client (saisir nom)</SelectItem>
                    {clientsLoading ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
                    ) : (
                      clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {(!selectedClientId || selectedClientId === "new") && (
                  <Input
                    placeholder="Nom du client"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                )}
              </div>

              <Separator />

              {/* 2. Type de travaux - Définir QUOI */}
              <div className="space-y-2">
                <Label htmlFor="workType">Type de travaux *</Label>
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger id="workType">
                    <SelectValue placeholder="Sélectionner un type de travaux" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {workType === "Autre" && (
                  <Input
                    placeholder="Précisez le type de travaux"
                    value={customWorkType}
                    onChange={(e) => setCustomWorkType(e.target.value)}
                    required
                  />
                )}
              </div>

              {/* 3. Surface - Définir COMBIEN */}
              <div className="space-y-2">
                <Label htmlFor="surface">Surface (m²) *</Label>
                <Input
                  id="surface"
                  type="number"
                  min="0"
                  step="0.01"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  placeholder="Ex: 150"
                  required
                />
              </div>

              {/* 4. Région - Contexte local (influence prix) */}
              <div className="space-y-2">
                <Label htmlFor="region">Région (optionnel)</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Ex: Île-de-France, Lyon, Marseille"
                />
                <p className="text-xs text-muted-foreground">
                  La région aide l'IA à ajuster les prix selon les coûts locaux
                </p>
              </div>

              {/* 5. Matériaux - Ressources nécessaires */}
              <div className="space-y-2">
                <Label>Matériaux *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter un matériau"
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMaterial();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddMaterial}
                    disabled={!materialInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Matériaux courants */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_MATERIALS.slice(0, 8).map((material) => (
                    <Badge
                      key={material}
                      variant={materials.includes(material) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleAddCommonMaterial(material)}
                    >
                      {material}
                    </Badge>
                  ))}
                </div>

                {/* Liste des matériaux ajoutés */}
                {materials.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {materials.map((material) => (
                      <Badge key={material} variant="secondary" className="gap-1">
                        {material}
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterial(material)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Images - Documents visuels */}
              <div className="space-y-2">
                <MultiImageUpload
                  images={imageUrls}
                  onChange={handleImagesChange}
                  folder="quotes"
                  label="Photos du chantier (optionnel)"
                  maxImages={5}
                />
              </div>

              <Separator />

              {/* 7. Prix manuel - À la fin, une fois tout défini */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useManualPrice"
                    checked={useManualPrice}
                    onChange={(e) => {
                      setUseManualPrice(e.target.checked);
                      if (!e.target.checked) {
                        setManualPrice("");
                        setPriceValidation(null);
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="useManualPrice" className="font-medium cursor-pointer">
                    Utiliser un prix manuel (optionnel)
                  </Label>
                </div>
                {useManualPrice && (
                  <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                    <Label htmlFor="manualPrice">Prix manuel (€)</Label>
                    <Input
                      id="manualPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualPrice}
                      onChange={(e) => {
                        const value = e.target.value;
                        setManualPrice(value);
                        // Validation basique du prix
                        if (value && parseFloat(value) > 0) {
                          const price = parseFloat(value);
                          if (price < 100) {
                            setPriceValidation({
                              isValid: false,
                              message: "⚠️ Prix très bas",
                              warning: "Ce prix semble anormalement bas pour ce type de travaux."
                            });
                          } else if (price > 1000000) {
                            setPriceValidation({
                              isValid: false,
                              message: "⚠️ Prix très élevé",
                              warning: "Ce prix semble anormalement élevé. Vérifiez votre saisie."
                            });
                          } else {
                            setPriceValidation({
                              isValid: true,
                              message: "✓ Prix saisi",
                              warning: "L'IA vérifiera la cohérence de ce prix lors de la génération."
                            });
                          }
                        } else {
                          setPriceValidation(null);
                        }
                      }}
                      placeholder="Ex: 15000"
                    />
                    {priceValidation && (
                      <div className={`text-sm p-2 rounded ${
                        priceValidation.isValid 
                          ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300" 
                          : "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300"
                      }`}>
                        <p className="font-medium">{priceValidation.message}</p>
                        {priceValidation.warning && (
                          <p className="text-xs mt-1">{priceValidation.warning}</p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Si vous saisissez un prix, l'IA l'utilisera mais vérifiera sa cohérence avec le marché.
                      Sinon, l'IA calculera automatiquement le prix selon la surface, les matériaux et la région.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Boutons */}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Générer le devis
                    </>
                  )}
                </Button>
                {result && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    Nouveau devis
                  </Button>
                )}
              </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Résultat - Affichage professionnel */}
        {result && (
          <Card ref={resultRef}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Devis généré
                  </CardTitle>
                  <CardDescription>
                    Devis généré par l'IA pour {clientName}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {quoteId && (
                    <Badge variant="outline" className="text-xs">
                      ID: {quoteId.slice(0, 8)}...
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      try {
                        const selectedClient = clients?.find(c => c.id === selectedClientId);
                        // Utiliser le numéro de devis stocké dans le state
                        const currentQuoteNumber = quoteNumber || result?.quote_number || undefined;
                        await downloadQuotePDF({
                          result,
                          companyInfo,
                          clientInfo: {
                            name: clientName,
                            email: selectedClient?.email,
                            phone: selectedClient?.phone,
                            location: selectedClient?.location,
                          },
                          surface,
                          workType: workType === "Autre" ? customWorkType : workType,
                          region,
                          quoteDate: new Date(),
                          quoteNumber: currentQuoteNumber,
                          signatureData: quoteSignature?.data,
                          signedBy: quoteSignature?.signedBy,
                          signedAt: quoteSignature?.signedAt,
                        });
                        toast({
                          title: "PDF généré",
                          description: "Le devis a été téléchargé en PDF.",
                        });
                      } catch (error) {
                        toast({
                          title: "Erreur",
                          description: error.message || "Impossible de générer le PDF",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exporter PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] md:max-h-[800px] overflow-y-auto p-4 md:p-6">
                <QuoteDisplay
                  result={result}
                  companyInfo={companyInfo}
                  clientInfo={{
                    name: clientName,
                    email: clients?.find(c => c.id === selectedClientId)?.email,
                    phone: clients?.find(c => c.id === selectedClientId)?.phone,
                    location: clients?.find(c => c.id === selectedClientId)?.location,
                  }}
                  surface={surface}
                  workType={workType === "Autre" ? customWorkType : workType}
                  region={region}
                  quoteDate={new Date()}
                  quoteNumber={quoteNumber || result?.quote_number || undefined}
                  signatureData={quoteSignature?.data}
                  signedBy={quoteSignature?.signedBy}
                  signedAt={quoteSignature?.signedAt}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message si aucun résultat */}
        {!result && !loading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun devis généré</h3>
              <p className="text-sm text-muted-foreground">
                Remplissez le formulaire et cliquez sur "Générer le devis" pour créer un devis avec l'IA
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
