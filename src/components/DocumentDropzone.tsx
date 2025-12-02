import { useState, useRef, useCallback, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Upload, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface DocumentDropzoneProps {
  onFileUploaded: (file: File, url: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * Composant Dropzone professionnel pour l'import de documents
 * Supporte drag & drop et sélection de fichiers
 */
export const DocumentDropzone = ({
  onFileUploaded,
  accept = {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  },
  maxSize = 10 * 1024 * 1024, // 10MB par défaut
  className,
  disabled = false,
}: DocumentDropzoneProps) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Fonction mock pour simuler l'upload
  const uploadDocument = async (file: File): Promise<string> => {
    // Simuler un délai d'upload
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Créer une URL locale pour l'aperçu
    return URL.createObjectURL(file);
  };

  // Valider le type de fichier
  const isValidFileType = useCallback((file: File): boolean => {
    const acceptedTypes = Object.values(accept).flat();
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    return acceptedTypes.some((ext) => ext.toLowerCase() === fileExtension);
  }, [accept]);

  const handleFile = useCallback(
    async (file: File) => {
      // Validation du type
      if (!isValidFileType(file)) {
        toast({
          title: "Type de fichier non supporté",
          description: `Types acceptés : ${Object.values(accept).flat().join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      // Validation de la taille
      if (file.size > maxSize) {
        toast({
          title: "Fichier trop volumineux",
          description: `La taille maximale est de ${(maxSize / 1024 / 1024).toFixed(0)} MB`,
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      try {
        const url = await uploadDocument(file);
        onFileUploaded(file, url);
        toast({
          title: "Document importé",
          description: `${file.name} a été importé avec succès`,
        });
      } catch (error) {
        console.error("Error uploading document:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'importer le document",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [maxSize, onFileUploaded, toast, accept, isValidFileType]
  );

  // Gestion du drag & drop
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || uploading) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, uploading, handleFile]
  );

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input pour permettre de sélectionner le même fichier
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Input file caché pour le bouton */}
      <input
        ref={fileInputRef}
        type="file"
        accept={Object.values(accept).flat().join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Zone de drop */}
      <div
        ref={dropzoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-muted-foreground/25 bg-muted/30",
          (disabled || uploading) && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {uploading ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Import en cours...</p>
                <p className="text-xs text-muted-foreground">Veuillez patienter</p>
              </div>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "rounded-full p-4 transition-colors",
                  isDragging
                    ? "bg-primary/20"
                    : "bg-muted"
                )}
              >
                <Upload
                  className={cn(
                    "h-8 w-8 transition-colors",
                    isDragging
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragging
                    ? "Déposez le fichier ici"
                    : "Glissez-déposez un document ici"}
                </p>
                <p className="text-xs text-muted-foreground">
                  ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, JPG, PNG, DOCX, XLSX (max {maxSize / 1024 / 1024}MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bouton alternatif */}
      {!uploading && (
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled}
          className="w-full mt-4"
        >
          <File className="h-4 w-4 mr-2" />
          Importer un document
        </Button>
      )}
    </div>
  );
};

