import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { generateQuote } from "@/services/aiService";
import { useClients, useCreateClient } from "@/hooks/useClients";
import { useUserSettings } from "@/hooks/useUserSettings";
import { generateDevisNumber } from "@/utils/generateDevisNumber";
import { QuoteDisplay } from "./QuoteDisplay";
import { downloadQuotePDF } from "@/services/pdfService";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

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

const COMMON_MATERIALS = [
  "Tuiles", "Isolation", "Charpente", "Béton", "Ciment", "Carrelage",
  "Parquet", "Peinture", "Enduit", "Placo", "Laine de verre", "Laine de roche",
  "PVC", "Aluminium", "Bois", "Métal", "Cuivre", "Zinc", "Plomb",
  "Électricité", "Plomberie", "VMC", "Chaudière", "Radiateur"
];

export default function DevisGenerator() {
  const { toast } = useToast();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: companyInfo } = useUserSettings();
  const createClient = useCreateClient();

  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"simplified" | "detailed">("simplified");
  const [client, setClient] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ 
    nom: "", 
    email: "", 
    tel: "", 
    adresse: "" 
  });

  // Données techniques (étape 2)
  const [surface, setSurface] = useState("");
  const [workType, setWorkType] = useState("");
  const [customWorkType, setCustomWorkType] = useState("");
  const [region, setRegion] = useState("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState("");

  // Résultat
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);

  const handleAddMaterial = () => {
    const material = materialInput.trim();
    if (material && !materials.includes(material)) {
      setMaterials([...materials, material]);
      setMaterialInput("");
    }
  };

  const handleRemoveMaterial = (material: string) => {
    setMaterials(materials.filter((m) => m !== material));
  };

  const handleGenerate = async () => {
    // Validation
    if (!description.trim() || description.length < 50) {
      toast({
        title: "Erreur",
        description: "La description doit contenir au moins 50 caractères",
        variant: "destructive",
      });
      return;
    }

    if (!newClient.nom.trim() && !client) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner ou créer un client",
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

    if (!workType || (workType === "Autre" && !customWorkType.trim())) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un type de travaux",
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

    try {
      // Créer le client si nouveau
      let finalClientName = newClient.nom.trim();
      let finalClientEmail = newClient.email.trim() || undefined;
      let finalClientPhone = newClient.tel.trim() || undefined;
      let finalClientAddress = newClient.adresse.trim() || undefined;

      if (client && client !== "new") {
        const selectedClient = clients?.find((c) => c.id === client);
        if (selectedClient) {
          finalClientName = selectedClient.name;
          finalClientEmail = selectedClient.email || undefined;
          finalClientPhone = selectedClient.phone || undefined;
          finalClientAddress = selectedClient.location || undefined;
        }
      } else if (newClient.nom.trim()) {
        // Créer le nouveau client
        try {
          const createdClient = await createClient.mutateAsync({
            name: newClient.nom.trim(),
            email: newClient.email.trim() || undefined,
            phone: newClient.tel.trim() || undefined,
            location: newClient.adresse.trim() || undefined,
          });
          setClient(createdClient.id);
        } catch (error) {
          console.error("Error creating client:", error);
          // Continuer avec juste le nom
        }
      }

      // Générer le numéro de devis
      const devisNumber = await generateDevisNumber();
      setQuoteNumber(devisNumber);

      // Générer le devis
      const response = await generateQuote({
        clientName: finalClientName,
        surface: parseFloat(surface),
        workType: workType === "Autre" ? customWorkType : workType,
        materials: materials,
        region: region.trim() || undefined,
        description: description.trim(),
        quoteFormat: mode,
      });

      if (!response || !response.aiResponse) {
        throw new Error("Réponse invalide de l'Edge Function");
      }

      setResult({
        ...response.aiResponse,
        quote_number: devisNumber,
        format: mode,
        description: description,
      });

      toast({
        title: "Devis généré !",
        description: "Le devis a été créé avec succès.",
      });
    } catch (error: any) {
      console.error("Error generating quote:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le devis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      await downloadQuotePDF({
        result,
        companyInfo,
        clientInfo: {
          name: client ? (clients?.find((c) => c.id === client)?.name || newClient.nom) : newClient.nom,
          email: client ? (clients?.find((c) => c.id === client)?.email || newClient.email) : newClient.email,
          phone: client ? (clients?.find((c) => c.id === client)?.phone || newClient.tel) : newClient.tel,
          location: client ? (clients?.find((c) => c.id === client)?.location || newClient.adresse) : newClient.adresse,
        },
        surface,
        workType: workType === "Autre" ? customWorkType : workType,
        region,
        quoteDate: new Date(),
        quoteNumber: quoteNumber || undefined,
        quoteFormat: mode,
      });
      toast({
        title: "PDF généré",
        description: "Le devis a été téléchargé en PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le PDF",
        variant: "destructive",
      });
    }
  };

  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Devis généré</CardTitle>
                <CardDescription>
                  Devis {mode === "simplified" ? "simplifié" : "détaillé"}
                </CardDescription>
              </div>
              <Button onClick={handleExportPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Exporter PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <QuoteDisplay
              result={result}
              companyInfo={companyInfo}
              clientInfo={{
                name: client ? (() => {
                  const selectedClient = clients?.find((c) => c.id === client);
                  return selectedClient ? getClientFullName(selectedClient) : newClient.nom;
                })() : newClient.nom,
                email: client ? (clients?.find((c) => c.id === client)?.email || newClient.email) : newClient.email,
                phone: client ? (clients?.find((c) => c.id === client)?.phone || newClient.tel) : newClient.tel,
                location: client ? (clients?.find((c) => c.id === client)?.location || newClient.adresse) : newClient.adresse,
              }}
              surface={surface}
              workType={workType === "Autre" ? customWorkType : workType}
              region={region}
              quoteDate={new Date()}
              quoteNumber={quoteNumber || undefined}
              quoteFormat={mode}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Step 1: Description */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 1 : Description du chantier</CardTitle>
            <CardDescription>
              Décrivez votre chantier en détail (minimum 50 caractères)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Exemple : Rénovation complète d'une salle de bains de 8 m². Remplacement de la baignoire par une douche à l'italienne, nouveau carrelage au sol et murs, remplacement de la robinetterie..."
                rows={8}
                required
              />
              <p className="text-sm text-muted-foreground">
                {description.length} caractères {description.length >= 50 ? "✓" : "(minimum 50)"}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={description.length < 50}
                className="gap-2"
              >
                Continuer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Données techniques + Mode */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 2 : Données techniques</CardTitle>
            <CardDescription>
              Sélectionnez le format et renseignez les informations techniques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode simplifié/détaillé */}
            <div className="space-y-2">
              <Label>Format du devis</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as "simplified" | "detailed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simplified">Mode simplifié</SelectItem>
                  <SelectItem value="detailed">Mode détaillé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type de travaux */}
            <div className="space-y-2">
              <Label htmlFor="workType">Type de travaux <span className="text-destructive">*</span></Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger id="workType">
                  <SelectValue placeholder="Sélectionner un type" />
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

            {/* Surface */}
            <div className="space-y-2">
              <Label htmlFor="surface">Surface (m²) <span className="text-destructive">*</span></Label>
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

            {/* Région */}
            <div className="space-y-2">
              <Label htmlFor="region">Région <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Ex: Île-de-France, Lyon"
              />
            </div>

            {/* Matériaux */}
            <div className="space-y-2">
              <Label>Matériaux <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Saisir un matériau"
                  value={materialInput}
                  onChange={(e) => setMaterialInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMaterial();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddMaterial} disabled={!materialInput.trim()}>
                  Ajouter
                </Button>
              </div>
              {materials.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg min-h-[40px]">
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

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button onClick={() => setStep(3)} className="gap-2" disabled={!surface || !workType || materials.length === 0}>
                Continuer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Client + Génération */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 3 : Client</CardTitle>
            <CardDescription>
              Choisir un client existant ou en créer un nouveau
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="client-select">Client</Label>
              <Select
                value={client || ""}
                onValueChange={(value) => {
                  setClient(value);
                  if (value !== "new") {
                    const selectedClient = clients?.find((c) => c.id === value);
                    if (selectedClient) {
                      setNewClient({
                        nom: selectedClient.name,
                        email: selectedClient.email || "",
                        tel: selectedClient.phone || "",
                        adresse: selectedClient.location || "",
                      });
                    }
                  } else {
                    setNewClient({ nom: "", email: "", tel: "", adresse: "" });
                  }
                }}
                disabled={clientsLoading}
              >
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Créer un nouveau client</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formulaire nouveau client */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <Label className="text-base font-semibold">Informations client</Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom <span className="text-destructive">*</span></Label>
                  <Input
                    id="nom"
                    placeholder="Nom"
                    value={newClient.nom}
                    onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tel">Téléphone</Label>
                    <Input
                      id="tel"
                      type="tel"
                      placeholder="Téléphone"
                      value={newClient.tel}
                      onChange={(e) => setNewClient({ ...newClient, tel: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    placeholder="Adresse"
                    value={newClient.adresse}
                    onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading || !newClient.nom.trim()}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Générer le devis
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}







