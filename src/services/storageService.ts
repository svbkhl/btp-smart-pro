import { supabase } from "@/integrations/supabase/client";

export interface UploadImageParams {
  file: File;
  folder: "projects" | "clients" | "quotes" | "analysis";
  userId: string;
}

export interface UploadImageResult {
  url: string;
  path: string;
}

/**
 * Valide qu'un fichier est une image valide
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Vérifier le type MIME
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Le fichier doit être une image (JPEG, PNG, WebP ou GIF)",
    };
  }

  // Vérifier la taille (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "L'image ne doit pas dépasser 5MB",
    };
  }

  return { valid: true };
}

/**
 * Upload une image vers Supabase Storage
 * Structure: images/{folder}/{userId}/{timestamp}-{random}.{ext}
 */
export async function uploadImage({
  file,
  folder,
  userId,
}: UploadImageParams): Promise<UploadImageResult> {
  // Valider le fichier
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "Fichier invalide");
  }

  // Générer un nom de fichier unique
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = file.name.split(".").pop() || "jpg";
  const fileName = `${timestamp}-${random}.${extension}`;

  // Chemin dans le bucket : folder/userId/fileName
  const filePath = `${folder}/${userId}/${fileName}`;

  // Upload vers Supabase Storage
  const { data, error } = await supabase.storage
    .from("images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false, // Ne pas écraser si le fichier existe
    });

  if (error) {
    console.error("Error uploading image:", error);
    throw new Error(error.message || "Impossible d'uploader l'image");
  }

  // Obtenir l'URL publique de l'image
  const { data: urlData } = supabase.storage
    .from("images")
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error("Impossible d'obtenir l'URL de l'image");
  }

  return {
    url: urlData.publicUrl,
    path: filePath,
  };
}

/**
 * Supprime une image de Supabase Storage
 */
export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from("images").remove([path]);

  if (error) {
    console.error("Error deleting image:", error);
    throw new Error(error.message || "Impossible de supprimer l'image");
  }
}

/**
 * Obtient l'URL publique d'une image
 */
export function getImageUrl(path: string): string {
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload plusieurs images
 */
export async function uploadMultipleImages(
  files: File[],
  folder: "projects" | "clients" | "quotes" | "analysis",
  userId: string
): Promise<UploadImageResult[]> {
  const uploadPromises = files.map((file) =>
    uploadImage({ file, folder, userId })
  );

  return Promise.all(uploadPromises);
}






