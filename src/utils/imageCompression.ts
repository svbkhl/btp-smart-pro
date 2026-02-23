/**
 * Compresse une image (data URL ou File) pour l'envoi à l'API.
 * Réduit la taille pour éviter les limites de payload (Supabase ~1-5MB).
 * Max 1024px sur le plus grand côté, JPEG qualité 0.8.
 */
const MAX_SIZE = 1024;
const JPEG_QUALITY = 0.8;

export async function compressImageForAI(
  input: string | File
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const onLoad = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.onload = onLoad;
    if (typeof input === "string") {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Compresse un tableau d'images (data URLs) pour l'envoi à l'IA.
 */
export async function compressImagesForAI(images: string[]): Promise<string[]> {
  return Promise.all(images.map((img) => compressImageForAI(img)));
}
