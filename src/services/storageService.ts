import { supabase } from "@/integrations/supabase/client";

/**
 * Service pour gérer l'upload d'images dans Supabase Storage
 */

export interface UploadImageOptions {
  file: File;
  folder: "projects" | "clients" | "quotes" | "analysis";
  userId: string;
  onProgress?: (progress: number) => void;
}

export interface UploadImageResult {
  url: string;
  path: string;
}

/**
 * Upload une image dans Supabase Storage
 */
export async function uploadImage(
  options: UploadImageOptions
): Promise<UploadImageResult> {
  const { file, folder, userId, onProgress } = options;

  try {
    // Vérifier que l'utilisateur est connecté
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("Vous devez être connecté pour uploader une image");
    }

    // Générer un nom de fichier unique
    const fileExt = file.name.split(".").pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;
    // Structure : folder/userId/fileName
    const filePath = `${folder}/${userId}/${fileName}`;

    // Upload le fichier
    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      // Messages d'erreur plus clairs
      let errorMessage = "Erreur lors de l'upload";
      
      if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
        errorMessage = "Le bucket 'images' n'existe pas. Exécutez FIX-STORAGE-PERMISSIONS-DEFINITIF.sql dans Supabase.";
      } else if (error.message.includes("row-level security") || error.message.includes("RLS") || error.message.includes("permission")) {
        errorMessage = "Erreur de permissions RLS. Exécutez FIX-STORAGE-PERMISSIONS-DEFINITIF.sql dans Supabase SQL Editor.";
      } else if (error.message.includes("new row violates") || error.message.includes("policy")) {
        errorMessage = "Permissions insuffisantes. Les politiques RLS ne permettent pas cet upload. Vérifiez que le chemin est : folder/userId/fileName et exécutez FIX-STORAGE-PERMISSIONS-DEFINITIF.sql.";
      } else if (error.message.includes("File size") || error.message.includes("too large")) {
        errorMessage = "Le fichier est trop volumineux. Taille maximale : 5MB.";
      } else if (error.message.includes("Invalid") || error.message.includes("invalid")) {
        errorMessage = `Format de fichier invalide. Formats acceptés : JPEG, PNG, WebP, GIF. Erreur : ${error.message}`;
      } else {
        errorMessage = `Erreur lors de l'upload: ${error.message}. Vérifiez la console pour plus de détails.`;
      }
      
      throw new Error(errorMessage);
    }

    if (!data) {
      throw new Error("Aucune donnée retournée après l'upload");
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);


    return {
      url: publicUrl,
      path: filePath,
    };
  } catch (error) {
    // Si c'est déjà une Error avec un message, on la relance
    if (error instanceof Error) {
      throw error;
    }
    // Sinon on crée une nouvelle Error
    throw new Error("Erreur inattendue lors de l'upload de l'image");
  }
}

/**
 * Supprime une image de Supabase Storage
 */
export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from("images").remove([path]);

  if (error) {
    throw new Error(`Erreur lors de la suppression: ${error.message}`);
  }
}

/**
 * Vérifie si un bucket existe, sinon le crée
 * Note: Cette fonction nécessite des droits admin, elle peut être appelée une fois lors de la configuration
 */
export async function ensureBucketExists(): Promise<void> {
  // Cette fonction devrait être appelée côté serveur ou avec des droits admin
  // Pour l'instant, on assume que le bucket existe déjà
  // Vous pouvez créer le bucket manuellement dans Supabase Dashboard > Storage
}

/**
 * Obtient l'URL publique d'une image
 */
export function getImageUrl(path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from("images")
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * Valide qu'un fichier est une image
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Le fichier doit être une image (JPEG, PNG, WebP ou GIF)",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "L'image ne doit pas dépasser 5MB",
    };
  }

  return { valid: true };
}

