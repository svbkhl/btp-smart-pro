/**
 * Service pour importer des données depuis des fichiers CSV/Excel
 */

import { Candidature } from "@/hooks/useRH";
import { useCreateCandidature } from "@/hooks/useRH";

/**
 * Parse un fichier CSV et retourne les lignes
 */
function parseCSV(csvContent: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double quote = escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentLine.push(currentField.trim());
      currentField = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of line
      if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        lines.push(currentLine);
        currentLine = [];
        currentField = "";
      }
      // Skip \r\n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }

  // Add last field and line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Interface pour les données de candidature importées
 */
export interface ImportedCandidature {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  poste_souhaite: string;
  lettre_motivation?: string;
  score_correspondance?: number;
  notes_internes?: string;
}

/**
 * Importe des candidatures depuis un fichier CSV
 * Format CSV attendu (avec en-têtes) :
 * nom,prenom,email,telephone,poste_souhaite,lettre_motivation,score_correspondance,notes_internes
 */
export async function importCandidaturesFromCSV(
  file: File,
  onProgress?: (progress: number, total: number) => void
): Promise<{
  success: number;
  errors: Array<{ row: number; error: string }>;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        const lines = parseCSV(csvContent);

        if (lines.length === 0) {
          reject(new Error("Le fichier CSV est vide"));
          return;
        }

        // Première ligne = en-têtes
        const headers = lines[0].map(h => h.toLowerCase().trim());
        const dataLines = lines.slice(1);

        // Mapper les colonnes
        const nomIndex = headers.findIndex(h => h.includes('nom') && !h.includes('prenom'));
        const prenomIndex = headers.findIndex(h => h.includes('prenom'));
        const emailIndex = headers.findIndex(h => h.includes('email'));
        const telephoneIndex = headers.findIndex(h => h.includes('telephone') || h.includes('tel'));
        const posteIndex = headers.findIndex(h => h.includes('poste') || h.includes('emploi') || h.includes('job'));
        const lettreIndex = headers.findIndex(h => h.includes('lettre') || h.includes('motivation'));
        const scoreIndex = headers.findIndex(h => h.includes('score'));
        const notesIndex = headers.findIndex(h => h.includes('note'));

        if (nomIndex === -1 || prenomIndex === -1 || emailIndex === -1 || posteIndex === -1) {
          reject(new Error("Le fichier CSV doit contenir les colonnes : nom, prenom, email, poste_souhaite"));
          return;
        }

        const results = {
          success: 0,
          errors: [] as Array<{ row: number; error: string }>,
        };

        // Importer chaque ligne
        for (let i = 0; i < dataLines.length; i++) {
          const line = dataLines[i];
          if (line.length === 0) continue;

          try {
            const candidature: ImportedCandidature = {
              nom: line[nomIndex]?.trim() || "",
              prenom: line[prenomIndex]?.trim() || "",
              email: line[emailIndex]?.trim() || "",
              telephone: telephoneIndex !== -1 ? line[telephoneIndex]?.trim() : undefined,
              poste_souhaite: line[posteIndex]?.trim() || "",
              lettre_motivation: lettreIndex !== -1 ? line[lettreIndex]?.trim() : undefined,
              score_correspondance: scoreIndex !== -1 ? parseInt(line[scoreIndex] || "0") : undefined,
              notes_internes: notesIndex !== -1 ? line[notesIndex]?.trim() : undefined,
            };

            // Validation
            if (!candidature.nom || !candidature.prenom || !candidature.email || !candidature.poste_souhaite) {
              results.errors.push({
                row: i + 2, // +2 car ligne 1 = en-têtes, et index commence à 0
                error: "Champs requis manquants (nom, prenom, email, poste_souhaite)",
              });
              continue;
            }

            // Validation email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(candidature.email)) {
              results.errors.push({
                row: i + 2,
                error: "Email invalide",
              });
              continue;
            }

            // Créer la candidature via l'API Supabase Edge Function
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
            
            if (!supabaseUrl || !supabaseAnonKey) {
              throw new Error("Configuration Supabase manquante");
            }

            const response = await fetch(
              `${supabaseUrl}/functions/v1/submit-candidature`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify(candidature),
              }
            );

            const result = await response.json();
            
            if (!response.ok) {
              throw new Error(result.error || "Erreur lors de l'import");
            }

            // Si succès, incrémenter le compteur
            if (result.success) {
              results.success++;
            } else {
              results.errors.push({
                row: i + 2,
                error: result.error || "Erreur lors de l'import",
              });
            }

            // Progress callback
            if (onProgress) {
              onProgress(i + 1, dataLines.length);
            }
          } catch (error: any) {
            results.errors.push({
              row: i + 2,
              error: error.message || "Erreur inconnue",
            });
          }
        }

        resolve(results);
      } catch (error: any) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Erreur lors de la lecture du fichier"));
    };

    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Génère un template CSV pour l'import de candidatures
 */
export function generateCandidaturesCSVTemplate(): void {
  const headers = [
    "nom",
    "prenom",
    "email",
    "telephone",
    "poste_souhaite",
    "lettre_motivation",
    "score_correspondance",
    "notes_internes",
  ];

  const exampleRow = [
    "Dupont",
    "Jean",
    "jean.dupont@example.fr",
    "+33 6 12 34 56 78",
    "Maçon",
    "Je suis très motivé pour ce poste...",
    "75",
    "Candidat recommandé par X",
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-candidatures.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

