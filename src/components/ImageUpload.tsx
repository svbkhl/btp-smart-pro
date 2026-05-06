import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { uploadImage, validateImageFile, getImageUrl } from "@/services/storageService";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, X, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateLogoFile, type LogoValidationIssue } from "@/utils/logoValidation";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder: "projects" | "clients" | "quotes" | "analysis";
  label?: string;
  className?: string;
  disabled?: boolean;
  /**
   * Active la validation enrichie pour les logos (Bug #3) :
   * - check dimensions / ratio
   * - heuristique capture d'écran (fond uniforme)
   * - warning JPEG (fond opaque)
   * Les warnings sont affichés sous le composant ; l'utilisateur peut continuer.
   */
  validateAsLogo?: boolean;
}

export const ImageUpload = ({
  value,
  onChange,
  folder,
  label = "Image",
  className,
  disabled = false,
  validateAsLogo = false,
}: ImageUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoWarnings, setLogoWarnings] = useState<LogoValidationIssue[]>([]);

  // Utiliser directement value au lieu de preview pour éviter les problèmes de synchronisation
  const displayValue = value?.trim() || null;
  const [imageError, setImageError] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  // Réinitialiser l'erreur quand la valeur change
  useEffect(() => {
    setImageError(false);
    setImageKey(prev => prev + 1); // Force le rechargement de l'image
  }, [value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation logo enrichie (Bug #3) — bloque sur erreur, expose les warnings
    if (validateAsLogo) {
      const result = await validateLogoFile(file);
      const errors = result.issues.filter((i) => i.severity === "error");
      const warnings = result.issues.filter((i) => i.severity === "warning");
      if (errors.length > 0) {
        toast({
          title: "Logo refusé",
          description: errors.map((e) => e.message).join(" "),
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setLogoWarnings(warnings);
    } else {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({
          title: "Erreur",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Note: La prévisualisation sera gérée par onChange après l'upload

    // Upload l'image
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour uploader une image",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadImage({
        file,
        folder,
        userId: user.id,
      });

      onChange(result.url);
      toast({
        title: "Image uploadée !",
        description: "L'image a été uploadée avec succès.",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      const errorMessage = error?.message || "Impossible d'uploader l'image";
      
      toast({
        title: "Erreur d'upload",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      onChange(""); // Réinitialiser la valeur
    } finally {
      setUploading(false);
      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <div className="space-y-2">
        {displayValue ? (
          <div className="relative">
            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border bg-white dark:bg-gray-900">
              {!imageError ? (
                <img
                  key={`${displayValue}-${imageKey}`} // Force le rechargement si l'URL change ou après erreur
                  src={displayValue}
                  alt="Logo de l'entreprise"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error("❌ [ImageUpload] Erreur chargement logo:", displayValue);
                    const target = e.target as HTMLImageElement;
                    // Ne pas afficher l'image cassée
                    target.style.display = "none";
                    setImageError(true);
                  }}
                  onLoad={() => {
                    console.log("✅ [ImageUpload] Logo chargé avec succès:", displayValue);
                    setImageError(false);
                  }}
                />
              ) : null}
              {imageError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">⚠️ Erreur de chargement</p>
                  <p className="text-xs text-red-500 dark:text-red-300 text-center mb-2">L'image ne peut pas être chargée depuis cette URL.</p>
                  <p className="text-xs text-muted-foreground text-center mb-3">Vérifiez que le bucket Supabase Storage est public.</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageError(false);
                        setImageKey(prev => prev + 1); // Force le rechargement
                      }}
                      className="text-xs"
                    >
                      Réessayer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Ouvrir l'URL dans un nouvel onglet pour vérifier
                        if (displayValue) {
                          window.open(displayValue, '_blank');
                        }
                      }}
                      className="text-xs"
                    >
                      Vérifier l'URL
                    </Button>
                  </div>
                </div>
              )}
              {!disabled && (
                <div className="absolute top-2 right-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleRemove}
                    disabled={uploading}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={handleClick}
            className={cn(
              "relative w-full h-48 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-colors",
              disabled || uploading
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-primary hover:bg-muted/50"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Upload en cours...
                </p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Cliquez pour uploader une image
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, WebP ou GIF (max 5MB)
                </p>
              </>
            )}
          </div>
        )}

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />

        {!displayValue && !uploading && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClick}
            disabled={disabled}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choisir une image
          </Button>
        )}

        {validateAsLogo && logoWarnings.length > 0 && displayValue && (
          <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            {logoWarnings.map((w) => (
              <div key={w.code} className="flex gap-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

