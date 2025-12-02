import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { generateQuote } from "@/services/aiService";
import { 
  Loader2, 
  Sparkles, 
  X, 
  Download, 
  CheckCircle2, 
  Plus,
  ChevronRight,
  ChevronLeft,
  User,
  Building2,
  Ruler,
  MapPin,
  Package,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  CheckCircle,
  Circle,
  Euro,
  Clock,
  Wand2,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { useClients, useCreateClient } from "@/hooks/useClients";
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
import { downloadQuotePDF } from "@/services/pdfService";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ============================================
// CONSTANTS
// ============================================

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

// ============================================
// STEPPER COMPONENT
// ============================================

interface StepperProps {
  currentStep: number;
  steps: { id: number; label: string; description: string }[];
}

const Stepper = ({ currentStep, steps }: StepperProps) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  currentStep > step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-background border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id + 1}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-sm font-medium ${
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-4 transition-all ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// STEP 1: DESCRIPTION COMPONENT
// ============================================

interface Step1DescriptionProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  onNext: () => void;
}

const Step1Description = ({ description, onDescriptionChange, onNext }: Step1DescriptionProps) => {
  const isValid = description.trim().length >= 50;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Étape 1 : Description précise du chantier
        </CardTitle>
        <CardDescription>
          Décrivez votre chantier en détail. Cette description est essentielle pour que l'IA génère un devis précis sans inventer de détails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description" className="text-base font-semibold">
            Description du chantier <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Exemple : Rénovation complète d'une salle de bains de 8 m². Remplacement de la baignoire par une douche à l'italienne, nouveau carrelage au sol et murs, remplacement de la robinetterie, installation d'un miroir et d'un meuble de salle de bains. Le client souhaite un style moderne avec carrelage gris anthracite. Travaux à réaliser à Lyon dans un appartement au 2ème étage."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={10}
            className="resize-none text-base"
            required
          />
          <div className="flex items-center justify-between text-sm">
            <span className={`${isValid ? "text-green-600" : "text-muted-foreground"}`}>
              {description.length} caractères {isValid ? "✓" : "(minimum 50)"}
            </span>
          </div>
        </div>

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Important :</strong> Plus votre description est détaillée, plus le devis sera précis. 
            Mentionnez le type de travaux, les matériaux souhaités, la localisation, et tout contexte important.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end pt-4">
          <Button
            type="button"
            onClick={onNext}
            disabled={!isValid}
            size="lg"
            className="gap-2"
          >
            Continuer
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// STEP 2: TECHNICAL DATA COMPONENT
// ============================================

interface Step2TechnicalDataProps {
  // Client
  selectedClientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  isNewClient: boolean;
  clients: any[] | undefined;
  clientsLoading: boolean;
  onClientChange: (clientId: string) => void;
  onClientNameChange: (name: string) => void;
  onClientEmailChange: (email: string) => void;
  onClientPhoneChange: (phone: string) => void;
  onClientAddressChange: (address: string) => void;
  onToggleNewClient: (isNew: boolean) => void;
  
  // Technical data
  surface: string;
  workType: string;
  customWorkType: string;
  region: string;
  materials: string[];
  materialInput: string;
  imageUrls: string[];
  onSurfaceChange: (value: string) => void;
  onWorkTypeChange: (type: string) => void;
  onCustomWorkTypeChange: (type: string) => void;
  onRegionChange: (value: string) => void;
  onMaterialInputChange: (value: string) => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (material: string) => void;
  onAddCommonMaterial: (material: string) => void;
  onImagesChange: (urls: string[]) => void;
  
  // Navigation
  onPrevious: () => void;
  onNext: () => void;
}

const Step2TechnicalData = ({
  selectedClientId,
  clientName,
  clientEmail,
  clientPhone,
  clientAddress,
  isNewClient,
  clients,
  clientsLoading,
  onClientChange,
  onClientNameChange,
  onClientEmailChange,
  onClientPhoneChange,
  onClientAddressChange,
  onToggleNewClient,
  surface,
  workType,
  customWorkType,
  region,
  materials,
  materialInput,
  imageUrls,
  onSurfaceChange,
  onWorkTypeChange,
  onCustomWorkTypeChange,
  onRegionChange,
  onMaterialInputChange,
  onAddMaterial,
  onRemoveMaterial,
  onAddCommonMaterial,
  onImagesChange,
  onPrevious,
  onNext,
}: Step2TechnicalDataProps) => {
  const canProceed = 
    clientName.trim() !== "" &&
    surface !== "" &&
    parseFloat(surface) > 0 &&
    workType !== "" &&
    (workType !== "Autre" || customWorkType.trim() !== "") &&
    materials.length > 0;

  return (
    <div className="space-y-6">
      {/* Client Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Informations client
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isNewClient"
              checked={isNewClient}
              onCheckedChange={(checked) => onToggleNewClient(checked as boolean)}
            />
            <Label htmlFor="isNewClient" className="cursor-pointer font-medium">
              Créer un nouveau client
            </Label>
          </div>

          {!isNewClient ? (
            <div className="space-y-3">
              <Label htmlFor="client-select">Client existant <span className="text-destructive">*</span></Label>
              <Select 
                value={selectedClientId} 
                onValueChange={onClientChange}
                disabled={clientsLoading}
              >
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {clientsLoading ? (
                      <SelectItem value="loading" disabled>
                        <Loader2 className="h-3 w-3 inline mr-2 animate-spin" />
                        Chargement...
                      </SelectItem>
                    ) : (
                      clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nom du client <span className="text-destructive">*</span></Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => onClientNameChange(e.target.value)}
                  placeholder="Ex: Martin Dupont"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => onClientEmailChange(e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Téléphone</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => onClientPhoneChange(e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-address">Adresse</Label>
                <Input
                  id="client-address"
                  value={clientAddress}
                  onChange={(e) => onClientAddressChange(e.target.value)}
                  placeholder="123 Rue Example, 69000 Lyon"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Données techniques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Work Type */}
          <div className="space-y-2">
            <Label htmlFor="workType">Type de travaux <span className="text-destructive">*</span></Label>
            <Select value={workType} onValueChange={onWorkTypeChange}>
              <SelectTrigger id="workType">
                <SelectValue placeholder="Sélectionner un type de travaux" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[300px]">
                  {WORK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            {workType === "Autre" && (
              <Input
                placeholder="Précisez le type de travaux"
                value={customWorkType}
                onChange={(e) => onCustomWorkTypeChange(e.target.value)}
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
              onChange={(e) => onSurfaceChange(e.target.value)}
              placeholder="Ex: 150"
              required
            />
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="region">Région <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => onRegionChange(e.target.value)}
              placeholder="Ex: Île-de-France, Lyon, Marseille"
            />
          </div>

          {/* Materials */}
          <div className="space-y-3">
            <Label>Matériaux <span className="text-destructive">*</span></Label>
            
            <div className="flex gap-2">
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !materials.includes(value)) {
                    onAddCommonMaterial(value);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner un matériau" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {COMMON_MATERIALS.map((material) => (
                      <SelectItem 
                        key={material} 
                        value={material}
                        disabled={materials.includes(material)}
                      >
                        {material}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Ou saisir un matériau personnalisé"
                value={materialInput}
                onChange={(e) => onMaterialInputChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddMaterial();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onAddMaterial}
                disabled={!materialInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {materials.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg min-h-[48px]">
                {materials.map((material) => (
                  <Badge key={material} variant="secondary" className="gap-1">
                    {material}
                    <button
                      type="button"
                      onClick={() => onRemoveMaterial(material)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      aria-label={`Supprimer ${material}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Photos du chantier <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <MultiImageUpload
              images={imageUrls}
              onChange={onImagesChange}
              folder="quotes"
              label=""
              maxImages={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          size="lg"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
          className="gap-2"
        >
          Continuer
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================================
// STEP 3: RECAP & GENERATION COMPONENT
// ============================================

interface Step3RecapProps {
  description: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  surface: string;
  workType: string;
  customWorkType: string;
  region: string;
  materials: string[];
  imageUrls: string[];
  quoteFormat: "detailed" | "simplified";
  onQuoteFormatChange: (format: "detailed" | "simplified") => void;
  onPrevious: () => void;
  onGenerate: () => void;
  loading: boolean;
}

const Step3Recap = ({
  description,
  clientName,
  clientEmail,
  clientPhone,
  clientAddress,
  surface,
  workType,
  customWorkType,
  region,
  materials,
  imageUrls,
  quoteFormat,
  onQuoteFormatChange,
  onPrevious,
  onGenerate,
  loading,
}: Step3RecapProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Récapitulatif
          </CardTitle>
          <CardDescription>
            Vérifiez les informations avant de générer le devis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quote Format Selection */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label className="text-base font-semibold">Format du devis</Label>
            <RadioGroup
              value={quoteFormat}
              onValueChange={(value) => onQuoteFormatChange(value as "detailed" | "simplified")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="detailed" id="detailed" />
                <Label htmlFor="detailed" className="cursor-pointer flex-1">
                  <div className="font-medium">Devis détaillé</div>
                  <div className="text-sm text-muted-foreground">
                    Liste complète des prestations et matériaux avec prix détaillés
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simplified" id="simplified" />
                <Label htmlFor="simplified" className="cursor-pointer flex-1">
                  <div className="font-medium">Devis simplifié</div>
                  <div className="text-sm text-muted-foreground">
                    Format court avec prix global (ex: "Rénovation salle de bains – 4 500 € HT")
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Recap Sections */}
          <div className="grid gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Client
              </h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong>Nom :</strong> {clientName}</p>
                {clientEmail && <p><strong>Email :</strong> {clientEmail}</p>}
                {clientPhone && <p><strong>Téléphone :</strong> {clientPhone}</p>}
                {clientAddress && <p><strong>Adresse :</strong> {clientAddress}</p>}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Données techniques
              </h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong>Type :</strong> {workType === "Autre" ? customWorkType : workType}</p>
                <p><strong>Surface :</strong> {surface} m²</p>
                {region && <p><strong>Région :</strong> {region}</p>}
                <p><strong>Matériaux :</strong> {materials.join(", ")}</p>
                {imageUrls.length > 0 && <p><strong>Photos :</strong> {imageUrls.length} image(s)</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          size="lg"
          className="gap-2"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          size="lg"
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
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AIQuoteGenerator = () => {
  const { toast } = useToast();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: companyInfo } = useUserSettings();
  const createClient = useCreateClient();

  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    { id: 0, label: "Description", description: "Décrivez le chantier" },
    { id: 1, label: "Données", description: "Informations techniques" },
    { id: 2, label: "Génération", description: "Récap & création" },
  ];

  // Form state
  const [description, setDescription] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientAddress, setClientAddress] = useState<string>("");
  const [isNewClient, setIsNewClient] = useState<boolean>(false);
  const [surface, setSurface] = useState<string>("");
  const [workType, setWorkType] = useState<string>("");
  const [customWorkType, setCustomWorkType] = useState<string>("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState<string>("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [region, setRegion] = useState<string>("");
  const [quoteFormat, setQuoteFormat] = useState<"detailed" | "simplified">("detailed");

  // Result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);
  const [quoteSignature, setQuoteSignature] = useState<{
    data?: string;
    signedBy?: string;
    signedAt?: string;
  } | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  // ============================================
  // HANDLERS
  // ============================================

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId && clientId !== "new") {
      const client = clients?.find((c) => c.id === clientId);
      if (client) {
        setClientName(client.name);
        setClientEmail(client.email || "");
        setClientPhone(client.phone || "");
        setClientAddress(client.location || "");
        setIsNewClient(false);
      }
    }
  };

  const handleToggleNewClient = (isNew: boolean) => {
    setIsNewClient(isNew);
    if (isNew) {
      setSelectedClientId("");
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setClientAddress("");
    }
  };

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

  const handleAddCommonMaterial = (material: string) => {
    if (!materials.includes(material)) {
      setMaterials([...materials, material]);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setQuoteId(null);

    try {
      // Create client if new
      let finalClientId = selectedClientId;
      if (isNewClient && clientName.trim()) {
        try {
          const newClient = await createClient.mutateAsync({
            name: clientName.trim(),
            email: clientEmail.trim() || undefined,
            phone: clientPhone.trim() || undefined,
            location: clientAddress.trim() || undefined,
          });
          finalClientId = newClient.id;
          setSelectedClientId(newClient.id);
        } catch (error) {
          console.error("Error creating client:", error);
          // Continue anyway with just the name
        }
      }

      // Generate quote
      const response = await generateQuote({
        clientName: clientName.trim(),
        surface: parseFloat(surface),
        workType: workType === "Autre" ? customWorkType : workType,
        materials: materials,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        region: region.trim() || undefined,
        description: description.trim(), // Pass description to AI
      });

      if (!response || !response.aiResponse) {
        throw new Error("Réponse invalide de l'Edge Function");
      }

      const currentQuoteNumber =
        response.quoteNumber ||
        response.quote?.quote_number ||
        response.aiResponse?.quote_number ||
        null;

      setQuoteNumber(currentQuoteNumber);
      
      // Format result based on quote format
      const formattedResult = {
        ...response.aiResponse,
        quote_number: currentQuoteNumber,
        format: quoteFormat,
        description: description, // Include original description
      };

      setResult(formattedResult);
      setQuoteId(response.quote?.id || null);

      if (response.quote?.signature_data) {
        setQuoteSignature({
          data: response.quote.signature_data,
          signedBy: response.quote.signed_by,
          signedAt: response.quote.signed_at,
        });
      } else if (companyInfo?.signature_data) {
        setQuoteSignature({
          data: companyInfo.signature_data,
          signedBy: companyInfo.signature_name,
          signedAt: new Date().toISOString(),
        });
      } else {
        setQuoteSignature(null);
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      toast({
        title: "Devis généré !",
        description: "Le devis a été créé avec succès par l'IA.",
      });
    } catch (error: any) {
      console.error("❌ Error in handleGenerate:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le devis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setDescription("");
    setSelectedClientId("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
    setIsNewClient(false);
    setSurface("");
    setWorkType("");
    setCustomWorkType("");
    setMaterials([]);
    setMaterialInput("");
    setImageUrls([]);
    setRegion("");
    setQuoteFormat("detailed");
    setResult(null);
    setQuoteId(null);
    setQuoteNumber(null);
  };

  const handleExportPDF = async () => {
    try {
      const selectedClient = clients?.find((c) => c.id === selectedClientId);
      await downloadQuotePDF({
        result,
        companyInfo,
        clientInfo: {
          name: clientName,
          email: isNewClient ? clientEmail : selectedClient?.email,
          phone: isNewClient ? clientPhone : selectedClient?.phone,
          location: isNewClient ? clientAddress : selectedClient?.location,
        },
        surface,
        workType: workType === "Autre" ? customWorkType : workType,
        region,
        quoteDate: new Date(),
        quoteNumber: quoteNumber || result?.quote_number || undefined,
        signatureData: quoteSignature?.data,
        signedBy: quoteSignature?.signedBy,
        signedAt: quoteSignature?.signedAt,
        quoteFormat: quoteFormat, // Pass format to PDF generator
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

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Génération de Devis IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Créez un devis professionnel en quelques étapes avec l'intelligence artificielle
          </p>
        </div>
        {result && (
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <X className="h-4 w-4" />
            Nouveau devis
          </Button>
        )}
      </div>

      {!result ? (
        <div className="space-y-6">
          {/* Stepper */}
          <Stepper currentStep={currentStep} steps={steps} />

          {/* Step Content */}
          {currentStep === 0 && (
            <Step1Description
              description={description}
              onDescriptionChange={setDescription}
              onNext={handleNext}
            />
          )}

          {currentStep === 1 && (
            <Step2TechnicalData
              selectedClientId={selectedClientId}
              clientName={clientName}
              clientEmail={clientEmail}
              clientPhone={clientPhone}
              clientAddress={clientAddress}
              isNewClient={isNewClient}
              clients={clients}
              clientsLoading={clientsLoading}
              onClientChange={handleClientChange}
              onClientNameChange={setClientName}
              onClientEmailChange={setClientEmail}
              onClientPhoneChange={setClientPhone}
              onClientAddressChange={setClientAddress}
              onToggleNewClient={handleToggleNewClient}
              surface={surface}
              workType={workType}
              customWorkType={customWorkType}
              region={region}
              materials={materials}
              materialInput={materialInput}
              imageUrls={imageUrls}
              onSurfaceChange={setSurface}
              onWorkTypeChange={setWorkType}
              onCustomWorkTypeChange={setCustomWorkType}
              onRegionChange={setRegion}
              onMaterialInputChange={setMaterialInput}
              onAddMaterial={handleAddMaterial}
              onRemoveMaterial={handleRemoveMaterial}
              onAddCommonMaterial={handleAddCommonMaterial}
              onImagesChange={setImageUrls}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <Step3Recap
              description={description}
              clientName={clientName}
              clientEmail={clientEmail}
              clientPhone={clientPhone}
              clientAddress={clientAddress}
              surface={surface}
              workType={workType}
              customWorkType={customWorkType}
              region={region}
              materials={materials}
              imageUrls={imageUrls}
              quoteFormat={quoteFormat}
              onQuoteFormatChange={setQuoteFormat}
              onPrevious={handlePrevious}
              onGenerate={handleGenerate}
              loading={loading}
            />
          )}
        </div>
      ) : (
        <div ref={resultRef} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    Devis généré
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Devis {quoteFormat === "simplified" ? "simplifié" : "détaillé"} pour {clientName}
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
                  name: clientName,
                  email: isNewClient ? clientEmail : clients?.find((c) => c.id === selectedClientId)?.email,
                  phone: isNewClient ? clientPhone : clients?.find((c) => c.id === selectedClientId)?.phone,
                  location: isNewClient ? clientAddress : clients?.find((c) => c.id === selectedClientId)?.location,
                }}
                surface={surface}
                workType={workType === "Autre" ? customWorkType : workType}
                region={region}
                quoteDate={new Date()}
                quoteNumber={quoteNumber || result?.quote_number || undefined}
                signatureData={quoteSignature?.data}
                signedBy={quoteSignature?.signedBy}
                signedAt={quoteSignature?.signedAt}
                quoteFormat={quoteFormat}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
