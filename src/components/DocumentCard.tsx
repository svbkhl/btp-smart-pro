import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Eye,
  Trash2,
  FileSpreadsheet,
  FileType,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  addedAt: Date;
  category?: "quotes" | "invoices" | "conversations" | "notes" | "rh";
}

interface DocumentCardProps {
  document: Document;
  onView?: (document: Document) => void;
  onDownload?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  className?: string;
}

/**
 * Composant Card pour afficher un document avec ses actions
 */
export const DocumentCard = ({
  document,
  onView,
  onDownload,
  onDelete,
  className,
}: DocumentCardProps) => {
  // Déterminer l'icône selon le type de fichier
  const getFileIcon = () => {
    const type = document.type.toLowerCase();
    
    if (type.includes("pdf")) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    if (type.includes("image")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    if (type.includes("word") || type.includes("docx")) {
      return <FileType className="h-8 w-8 text-blue-600" />;
    }
    if (type.includes("excel") || type.includes("xlsx") || type.includes("spreadsheet")) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    }
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Vérifier si c'est une image pour l'aperçu
  const isImage = document.type.toLowerCase().includes("image");

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-200",
        className
      )}
    >
      <CardContent className="p-4">
        {/* Aperçu ou Icône */}
        <div className="relative mb-4 aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
          {isImage ? (
            <img
              src={document.url}
              alt={document.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              {getFileIcon()}
              <span className="text-xs text-muted-foreground font-medium">
                {document.type.split("/")[1]?.toUpperCase() || "FILE"}
              </span>
            </div>
          )}
        </div>

        {/* Informations du document */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm line-clamp-2" title={document.name}>
            {document.name}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(document.size)}</span>
            <span>
              {format(new Date(document.addedAt), "d MMM yyyy", { locale: fr })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          {onView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(document)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Voir
            </Button>
          )}
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(document)}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-1" />
              Télécharger
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(document)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};







