import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { uploadImage, validateImageFile } from "@/services/storageService";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, X, Image as ImageIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiImageUploadProps {
  images: string[];
  onChange: (urls: string[]) => void;
  folder: "projects" | "clients" | "quotes" | "analysis";
  label?: string;
  maxImages?: number;
  className?: string;
  disabled?: boolean;
}

export const MultiImageUpload = ({
  images,
  onChange,
  folder,
  label = "Images",
  maxImages = 5,
  className,
  disabled = false,
}: MultiImageUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la limite
    if (images.length >= maxImages) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez pas uploader plus de ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

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

      onChange([...images, result.url]);
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
    } finally {
      setUploading(false);
      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (url: string) => {
    onChange(images.filter(img => img !== url));
  };

  const handleClick = () => {
    if (!disabled && !uploading && images.length < maxImages) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      
      {/* Grille des images */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, idx) => (
            <div key={url || `image-${idx}`} className="relative group">
              <div className="relative w-full h-20 rounded-lg overflow-hidden border border-border">
                <img
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(url)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                  {idx + 1}
                </span>
              </div>
            </div>
          ))}
          
          {/* Bouton pour ajouter une image */}
          {images.length < maxImages && !disabled && (
            <div
              onClick={handleClick}
              className={cn(
                "relative w-full h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-colors",
                uploading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-primary hover:bg-muted/50"
              )}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Zone d'upload si aucune image */}
      {images.length === 0 && (
        <div
          onClick={handleClick}
          className={cn(
            "relative w-full h-32 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-colors",
            disabled || uploading
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-primary hover:bg-muted/50"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Upload en cours...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Cliquez pour uploader une image
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, WebP ou GIF (max 5MB) • Max {maxImages} images
              </p>
            </>
          )}
        </div>
      )}

      {/* Bouton pour ajouter une image si des images existent déjà */}
      {images.length > 0 && images.length < maxImages && !disabled && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Upload en cours...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une image ({images.length}/{maxImages})
            </>
          )}
        </Button>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        disabled={disabled || uploading || images.length >= maxImages}
        className="hidden"
      />
    </div>
  );
};

