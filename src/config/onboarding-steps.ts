/**
 * Étapes du guide d'onboarding (première connexion)
 * target: sélecteur CSS ou "center" pour une étape modale centrée
 */

export interface OnboardingStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Route à afficher pour cette étape (navigation page par page) */
  path?: string;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    target: "center",
    title: "Bienvenue sur BTP Smart Pro",
    content:
      "Votre outil pour gérer clients, devis, factures et plannings. Ce court guide vous montre l’essentiel.",
    placement: "center",
    path: "/dashboard",
  },
  {
    id: "dashboard",
    target: "[data-onboarding='menu-dashboard']",
    title: "Tableau de bord",
    content: "Ici vous voyez vos indicateurs clés : CA, chantiers, clients et activité récente.",
    placement: "right",
    path: "/dashboard",
  },
  {
    id: "sidebar-clients",
    target: "[data-onboarding='menu-clients']",
    title: "Clients",
    content: "Ajoutez et gérez vos clients. C’est ici que vous créez vos fiches clients.",
    placement: "right",
    path: "/clients",
  },
  {
    id: "sidebar-projects",
    target: "[data-onboarding='menu-projects']",
    title: "Chantiers",
    content: "Suivez vos chantiers et projets, du devis à la livraison.",
    placement: "right",
    path: "/projects",
  },
  {
    id: "sidebar-facturation",
    target: "[data-onboarding='menu-facturation']",
    title: "Devis & Facturation",
    content: "Créez des devis, transformez-les en factures et suivez les paiements.",
    placement: "right",
    path: "/facturation",
  },
  {
    id: "sidebar-settings",
    target: "[data-onboarding='menu-settings']",
    title: "Paramètres",
    content: "Configurez votre entreprise, votre profil et les intégrations (Google Calendar, etc.).",
    placement: "right",
    path: "/settings",
  },
  {
    id: "done",
    target: "center",
    title: "Vous êtes prêt",
    content: "Vous pouvez fermer ce guide et explorer l’application. Vous pourrez le revoir depuis le menu profil (avatar en haut à droite) si besoin.",
    placement: "center",
    path: "/dashboard",
  },
];
