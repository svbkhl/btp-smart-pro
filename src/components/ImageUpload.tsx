import { useState, useRef } from "react";
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
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Créer une prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

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
      setPreview(null);
    } finally {
      setUploading(false);
      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
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
        {preview ? (
          <div className="relative group">
            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleRemove}
                    disabled={uploading}
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

        {!preview && !uploading && (
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

