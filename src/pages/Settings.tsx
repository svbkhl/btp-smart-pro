import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { ImageUpload } from "@/components/ImageUpload";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { Loader2, Building2, Info, FileSignature, Database, Trash2, Play } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { isDemoMode, seedDemo, purgeDemo, isSeeding, isPurging } = useDemoMode();
  const [isSaving, setIsSaving] = useState(false);

  // Informations entreprise
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("France");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [signatureName, setSignatureName] = useState("");

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Charger les données quand elles sont disponibles
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || "");
      setEmail(settings.email || "");
      setPhone(settings.phone || "");
      setAddress(settings.address || "");
      setCity(settings.city || "");
      setPostalCode(settings.postal_code || "");
      setCountry(settings.country || "France");
      setSiret(settings.siret || "");
      setVatNumber(settings.vat_number || "");
      setLegalForm(settings.legal_form || "");
      setCompanyLogoUrl(settings.company_logo_url || "");
      setTermsAndConditions(settings.terms_and_conditions || "");
      setSignatureData(settings.signature_data || "");
      setSignatureName(settings.signature_name || "");
      setNotificationsEnabled(settings.notifications_enabled ?? true);
      setReminderEnabled(settings.reminder_enabled ?? true);
      setEmailNotifications(settings.email_notifications ?? true);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateSettings.mutateAsync({
        company_name: companyName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        postal_code: postalCode || undefined,
        country: country || undefined,
        siret: siret || undefined,
        vat_number: vatNumber || undefined,
        legal_form: legalForm || undefined,
        company_logo_url: companyLogoUrl || undefined,
        terms_and_conditions: termsAndConditions || undefined,
        signature_data: signatureData || undefined,
        signature_name: signatureName || undefined,
        notifications_enabled: notificationsEnabled,
        reminder_enabled: reminderEnabled,
        email_notifications: emailNotifications,
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Ne pas bloquer l'affichage, utiliser des valeurs par défaut
  // Les hooks retournent déjà des données mock en cas de timeout (3 secondes)
  // Cette approche évite les chargements infinis en affichant toujours du contenu
  // Les paramètres peuvent être vides au début, c'est normal

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Paramètres</h1>
          <p className="text-muted-foreground">Gérez vos préférences et informations d'entreprise</p>
        </div>

        <form onSubmit={handleSave}>
          <div className="grid gap-6 max-w-4xl">
            {/* Informations Entreprise */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informations de l'entreprise
                </CardTitle>
                <CardDescription>
                  Ces informations seront automatiquement utilisées dans vos devis et factures
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Remplissez ces informations une seule fois. Elles seront automatiquement incluses dans tous vos devis générés par l'IA.
                  </AlertDescription>
                </Alert>

                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo de l'entreprise</Label>
                  <ImageUpload
                    folder="clients"
                    value={companyLogoUrl}
                    onChange={setCompanyLogoUrl}
                    label="Logo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Le logo apparaîtra en haut de vos devis et factures
                  </p>
                </div>

                <Separator />

                {/* Nom */}
                <div className="space-y-2">
                  <Label htmlFor="company">Nom de l'entreprise *</Label>
                  <Input 
                    id="company" 
                    placeholder="BTP Smart Pro" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                {/* Email et Téléphone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="contact@btpsmartpro.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+33 1 23 45 67 89"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Adresse complète */}
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse complète</Label>
                  <Input 
                    id="address" 
                    placeholder="123 Rue Example"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                {/* Ville, Code postal, Pays */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Code postal</Label>
                    <Input 
                      id="postalCode" 
                      placeholder="75001"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input 
                      id="city" 
                      placeholder="Paris"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input 
                      id="country" 
                      placeholder="France"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Forme juridique */}
                <div className="space-y-2">
                  <Label htmlFor="legalForm">Forme juridique</Label>
                  <select
                    id="legalForm"
                    value={legalForm}
                    onChange={(e) => setLegalForm(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Sélectionner une forme juridique</option>
                    <option value="SARL">SARL (Société à Responsabilité Limitée)</option>
                    <option value="SASU">SASU (Société par Actions Simplifiée Unipersonnelle)</option>
                    <option value="EURL">EURL (Entreprise Unipersonnelle à Responsabilité Limitée)</option>
                    <option value="SAS">SAS (Société par Actions Simplifiée)</option>
                    <option value="SA">SA (Société Anonyme)</option>
                    <option value="SNC">SNC (Société en Nom Collectif)</option>
                    <option value="SCS">SCS (Société en Commandite Simple)</option>
                    <option value="Auto-entrepreneur">Auto-entrepreneur / Micro-entreprise</option>
                    <option value="EI">EI (Entreprise Individuelle)</option>
                    <option value="EIRL">EIRL (Entreprise Individuelle à Responsabilité Limitée)</option>
                    <option value="Autre">Autre</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Forme juridique de votre entreprise
                  </p>
                </div>

                {/* SIRET et TVA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siret">Numéro SIRET / SIREN</Label>
                    <Input 
                      id="siret" 
                      placeholder="12345678901234"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
                      maxLength={14}
                    />
                    <p className="text-xs text-muted-foreground">
                      14 chiffres (ex: 12345678901234)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">TVA intracommunautaire (si applicable)</Label>
                    <Input 
                      id="vatNumber" 
                      placeholder="FR12345678901"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: 2 lettres + chiffres (ex: FR12345678901)
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Conditions générales */}
                <div className="space-y-2">
                  <Label htmlFor="terms">Conditions générales de vente</Label>
                  <Textarea 
                    id="terms" 
                    placeholder="Ex: Paiement à 30 jours. Garantie décennale incluse..."
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ces conditions apparaîtront en bas de vos devis et factures
                  </p>
                </div>

                <Separator />

                {/* Signature automatique */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-primary" />
                    <Label className="text-base font-semibold">Signature automatique</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cette signature sera automatiquement ajoutée à tous vos devis générés. Vous n'aurez plus besoin de signer manuellement chaque devis.
                  </p>
                  <SignatureCanvas
                    value={signatureData}
                    onChange={setSignatureData}
                    signerName={signatureName}
                    onSignerNameChange={setSignatureName}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Gérez vos notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications activées</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer ou désactiver toutes les notifications
                    </p>
                  </div>
                  <Switch 
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications par email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir les mises à jour par email
                    </p>
                  </div>
                  <Switch 
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    disabled={!notificationsEnabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Rappels de projet</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des rappels pour les projets en cours
                    </p>
                  </div>
                  <Switch 
                    checked={reminderEnabled}
                    onCheckedChange={setReminderEnabled}
                    disabled={!notificationsEnabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mode Démo - Admin seulement */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Mode Démo
                  </CardTitle>
                  <CardDescription>
                    Gérez les données de démo pour les présentations client
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Le mode démo permet de remplir l'application avec des données réalistes pour les démonstrations.
                      Ces données peuvent être supprimées à tout moment.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold">Mode démo activé</Label>
                      <p className="text-sm text-muted-foreground">
                        {isDemoMode 
                          ? 'Le mode démo est actuellement activé' 
                          : 'Le mode démo est désactivé (définir VITE_APP_DEMO=true)'}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isDemoMode 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {isDemoMode ? 'Activé' : 'Désactivé'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="default" 
                          className="w-full"
                          disabled={isSeeding}
                        >
                          {isSeeding ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Création en cours...
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Créer les données de démo
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Créer les données de démo ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action va créer des données de démo réalistes dans votre base de données :
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>3 clients</li>
                              <li>4 projets (en cours, planifié, terminé, en attente)</li>
                              <li>3 devis</li>
                              <li>4 notifications</li>
                              <li>Données RH (employés, candidatures, tâches)</li>
                            </ul>
                            <strong className="block mt-2">Les données existantes ne seront pas supprimées.</strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => seedDemo(false)}>
                            Créer les données
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          disabled={isPurging}
                        >
                          {isPurging ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Suppression en cours...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer les données de démo
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer toutes les données de démo ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action va <strong>définitivement supprimer</strong> toutes les données marquées comme "démo" :
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Tous les clients de démo</li>
                              <li>Tous les projets de démo</li>
                              <li>Tous les devis de démo</li>
                              <li>Toutes les notifications de démo</li>
                              <li>Toutes les données RH de démo</li>
                            </ul>
                            <strong className="block mt-2 text-destructive">
                              Cette action est irréversible !
                            </strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => purgeDemo()} 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer définitivement
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>💡 <strong>Astuce :</strong> Utilisez "Créer les données de démo" avant une présentation client.</p>
                    <p>⚠️ <strong>Attention :</strong> Les données de démo sont marquées avec <code className="px-1 py-0.5 bg-muted rounded">is_demo=true</code> et peuvent être supprimées en masse.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} size="lg">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer les modifications
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Settings;
