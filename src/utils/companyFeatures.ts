import { Company } from "@/hooks/useCompany";

/**
 * Vérifie si une feature est activée pour une company
 */
export function isFeatureEnabled(
  company: Company | null | undefined,
  featureName: keyof Company["features"]
): boolean {
  if (!company) return false;
  return company.features?.[featureName] === true;
}

/**
 * Vérifie le niveau de support d'une company
 */
export function getSupportLevel(company: Company | null | undefined): 0 | 1 | 2 {
  if (!company) return 0;
  return company.support_level || 0;
}

/**
 * Vérifie si le support est actif (support_level > 0)
 */
export function hasSupport(company: Company | null | undefined): boolean {
  return getSupportLevel(company) > 0;
}

/**
 * Retourne le message d'erreur si le support n'est pas actif
 */
export function getSupportErrorMessage(company: Company | null | undefined): string {
  if (hasSupport(company)) {
    return "";
  }
  return "Intervention payante, l'entreprise n'a pas de SAV actif. Veuillez contacter le support pour activer le SAV.";
}

/**
 * Liste de toutes les features disponibles
 */
export const ALL_FEATURES: Array<{
  key: keyof Company["features"];
  label: string;
  description: string;
}> = [
  {
    key: "planning",
    label: "Planning",
    description: "Gestion du planning des employés",
  },
  {
    key: "facturation",
    label: "Facturation",
    description: "Gestion des factures et paiements",
  },
  {
    key: "devis",
    label: "Devis",
    description: "Création et gestion des devis",
  },
  {
    key: "projets",
    label: "Projets",
    description: "Gestion des projets et chantiers",
  },
  {
    key: "documents",
    label: "Documents",
    description: "Gestion des documents",
  },
  {
    key: "messagerie",
    label: "Messagerie",
    description: "Système de messagerie",
  },
  {
    key: "ia_assistant",
    label: "Assistant IA",
    description: "Assistant IA pour la génération de devis",
  },
  {
    key: "employes",
    label: "Employés & RH",
    description: "Gestion des employés et ressources humaines",
  },
];

/**
 * Niveaux de support
 */
export const SUPPORT_LEVELS: Array<{
  value: 0 | 1 | 2;
  label: string;
  description: string;
}> = [
  {
    value: 0,
    label: "Pas de support",
    description: "Interventions ponctuelles payantes",
  },
  {
    value: 1,
    label: "Support standard",
    description: "Correction bugs + 1h/mois incluse",
  },
  {
    value: 2,
    label: "Support premium",
    description: "3h/mois + priorité 24h + personnalisations avancées",
  },
];

/**
 * Tarifs des interventions hors SAV
 */
export const INTERVENTION_TARIFS = {
  standard: 100, // minimum / intervention
  urgence: 200,
  bug_fix: 150,
  custom: 0, // à définir selon la demande
} as const;


















