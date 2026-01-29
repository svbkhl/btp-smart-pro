/**
 * Composant de signature avec validation OTP
 * - Choix : Tracer signature OU Taper nom/prénom
 * - Envoi code OTP par email
 * - Vérification OTP avant signature finale
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle2, AlertCircle, Pen, Type } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import SignatureCanvas from "./SignatureCanvas";
import { supabase } from "@/integrations/supabase/client";

interface SignatureWithOTPProps {
  quoteId?: string;
  sessionToken?: string;
  clientEmail: string;
  clientName?: string;
  onSignatureComplete: (signatureData: string | null, signerName: string) => void;
  disabled?: boolean;
}

export default function SignatureWithOTP({
  quoteId,
  sessionToken,
  clientEmail,
  clientName,
  onSignatureComplete,
  disabled = false,
}: SignatureWithOTPProps) {
  const { toast } = useToast();
  
  // Étapes : 'method' -> 'otp_send' -> 'otp_verify' -> 'sign'
  const [step, setStep] = useState<'method' | 'otp_send' | 'otp_verify' | 'sign'>('method');
  
  // Méthode de signature : 'draw' ou 'type'
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'type'>('draw');
  
  // Pour signature typographique
  const [typedName, setTypedName] = useState(clientName || '');
  
  // Pour OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  
  // Pour signature tracée
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);

  // Étape 1 : Envoyer le code OTP
  const handleSendOTP = async () => {
    setSendingOtp(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-signature-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: clientEmail,
          quote_id: quoteId,
          session_token: sessionToken,
          client_name: clientName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Impossible d\'envoyer le code');
      }

      const result = await response.json();
      
      setOtpSent(true);
      setStep('otp_verify');
      
      toast({
        title: "📧 Code envoyé !",
        description: `Un code de vérification a été envoyé à ${clientEmail}. Vérifiez votre boîte mail.`,
        duration: 5000,
      });

      // En dev, afficher le code si retourné
      if (result.dev_otp_code) {
        console.log('🔐 Code OTP (dev):', result.dev_otp_code);
        toast({
          title: "🔐 Mode DEV",
          description: `Code OTP: ${result.dev_otp_code}`,
          duration: 10000,
        });
      }
    } catch (error: any) {
      console.error('Erreur envoi OTP:', error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible d'envoyer le code",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // Étape 2 : Vérifier le code OTP
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError("Le code doit contenir 6 chiffres");
      toast({
        title: "⚠️ Code invalide",
        description: "Le code doit contenir 6 chiffres",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null); // Réinitialiser l'erreur avant la vérification
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-signature-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          otp_code: otpCode,
          session_token: sessionToken,
          email: clientEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.valid) {
        const errorMessage = result.error || 'Code incorrect';
        setOtpError(errorMessage);
        toast({
          title: "❌ Code invalide",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      setOtpVerified(true);
      setOtpError(null);
      setStep('sign');
      
      toast({
        title: "✅ Code vérifié !",
        description: "Vous pouvez maintenant signer le document.",
      });
    } catch (error: any) {
      console.error('Erreur vérification OTP:', error);
      const errorMessage = error.message || "Le code saisi est incorrect ou expiré";
      setOtpError(errorMessage);
      toast({
        title: "❌ Code invalide",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Étape 3 : Finaliser la signature
  const handleFinalizeSignature = () => {
    if (signatureMethod === 'draw') {
      if (!drawnSignature) {
        toast({
          title: "⚠️ Signature manquante",
          description: "Veuillez tracer votre signature",
          variant: "destructive",
        });
        return;
      }
      onSignatureComplete(drawnSignature, clientName || 'Client');
    } else {
      if (!typedName.trim()) {
        toast({
          title: "⚠️ Nom manquant",
          description: "Veuillez saisir votre nom complet",
          variant: "destructive",
        });
        return;
      }
      onSignatureComplete(null, typedName.trim());
    }
  };

  // Rendu selon l'étape
  if (step === 'method') {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Pour signer ce document, vous devez d'abord vérifier votre identité par email.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Label>Choisissez votre méthode de signature :</Label>
          <RadioGroup value={signatureMethod} onValueChange={(v) => setSignatureMethod(v as 'draw' | 'type')}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="draw" id="draw" />
              <Label htmlFor="draw" className="flex items-center gap-2 cursor-pointer flex-1">
                <Pen className="h-4 w-4" />
                Tracer ma signature (manuscrite)
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="type" id="type" />
              <Label htmlFor="type" className="flex items-center gap-2 cursor-pointer flex-1">
                <Type className="h-4 w-4" />
                Taper mon nom (signature typographique)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={() => setStep('otp_send')}
          className="w-full"
          size="lg"
          disabled={disabled}
        >
          Continuer
        </Button>
      </div>
    );
  }

  if (step === 'otp_send') {
    return (
      <div className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Un code de vérification va être envoyé à : <strong>{clientEmail}</strong>
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Ce code expire dans 10 minutes
          </p>
          <Button
            onClick={handleSendOTP}
            disabled={sendingOtp || disabled}
            size="lg"
            className="w-full"
          >
            {sendingOtp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Envoyer le code par email
              </>
            )}
          </Button>
        </div>

        <Button
          onClick={() => setStep('method')}
          variant="outline"
          className="w-full"
          disabled={sendingOtp}
        >
          Retour
        </Button>
      </div>
    );
  }

  if (step === 'otp_verify') {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Code envoyé à {clientEmail}. Vérifiez votre boîte mail.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="otp">Code de vérification (6 chiffres)</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={(e) => {
              setOtpCode(e.target.value.replace(/\D/g, ''));
              setOtpError(null); // Réinitialiser l'erreur quand l'utilisateur tape
            }}
            placeholder="000000"
            className={`text-center text-2xl tracking-widest ${otpError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            disabled={verifyingOtp || disabled}
          />
          {otpError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">
                {otpError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Button
          onClick={handleVerifyOTP}
          disabled={verifyingOtp || otpCode.length !== 6 || disabled}
          size="lg"
          className="w-full"
        >
          {verifyingOtp ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Vérification...
            </>
          ) : (
            'Vérifier le code'
          )}
        </Button>

        <Button
          onClick={handleSendOTP}
          variant="outline"
          className="w-full"
          disabled={sendingOtp || verifyingOtp}
        >
          Renvoyer le code
        </Button>
      </div>
    );
  }

  // step === 'sign'
  return (
    <div className="space-y-6">
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✓ Identité vérifiée - Vous pouvez maintenant signer
        </AlertDescription>
      </Alert>

      {signatureMethod === 'draw' ? (
        <SignatureCanvas
          onSignatureComplete={(sig) => setDrawnSignature(sig)}
          disabled={disabled}
        />
      ) : (
        <div className="space-y-2">
          <Label htmlFor="typed-name">Votre nom complet</Label>
          <Input
            id="typed-name"
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Jean Dupont"
            className="text-xl text-center font-serif italic"
            style={{ fontFamily: "'Brush Script MT', cursive" }}
            disabled={disabled}
          />
          <p className="text-xs text-center text-muted-foreground">
            Ce nom apparaîtra comme votre signature électronique
          </p>
        </div>
      )}

      <Button
        onClick={handleFinalizeSignature}
        disabled={disabled || (signatureMethod === 'draw' && !drawnSignature) || (signatureMethod === 'type' && !typedName.trim())}
        size="lg"
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Finaliser la signature
      </Button>
    </div>
  );
}



