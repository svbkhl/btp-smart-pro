import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { uploadImage, validateImageFile, getImageUrl } from "@/services/storageService";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder: "projects" | "clients" | "quotes" | "analysis";
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const ImageUpload = ({
  value,
  onChange,
  folder,
  label = "Image",
  className,
  disabled = false,
}: ImageUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Valider le fichier
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Erreur",
        description: validation.error,
        variant: "destructive",
      });
      return;
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
      </div>
    </div>
  );
};

