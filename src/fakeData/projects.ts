export interface Project {
  id: string;
  user_id: string;
  client_id?: string;
  name: string;
  status: "planifié" | "en_attente" | "en_cours" | "terminé" | "annulé";
  progress: number;
  budget?: number;
  costs?: number;
  actual_revenue?: number;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    email?: string;
  };
}

export const FAKE_PROJECTS: Project[] = [
  {
    id: "fake-proj-1",
    user_id: "fake-user",
    client_id: "fake-client-1",
    name: "Rénovation Maison Martin",
    status: "en_cours",
    progress: 65,
    budget: 45000,
    actual_revenue: 45000, // CA réel facturé
    costs: 32000, // Coûts engagés (matériaux + main d'œuvre)
    location: "12 Rue de la République, 75001 Paris",
    start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "Rénovation complète d'une maison avec travaux de maçonnerie, plomberie et électricité",
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    client: {
      id: "fake-client-1",
      name: "M. Martin",
      email: "martin@example.com",
    },
  },
  {
    id: "fake-proj-2",
    user_id: "fake-user",
    client_id: "fake-client-2",
    name: "Extension Garage Dupont",
    status: "planifié",
    progress: 20,
    budget: 18000,
    actual_revenue: 0, // Pas encore facturé (projet planifié)
    costs: 3500, // Coûts initiaux (études, matériaux de base)
    location: "45 Avenue des Champs, 69001 Lyon",
    start_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "Extension d'un garage existant avec création d'un espace de stockage",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    client: {
      id: "fake-client-2",
      name: "Mme. Dupont",
      email: "dupont@example.com",
    },
  },
  {
    id: "fake-proj-3",
    user_id: "fake-user",
    client_id: "fake-client-3",
    name: "Peinture Intérieure Bernard",
    status: "terminé",
    progress: 100,
    budget: 8500,
    actual_revenue: 8200, // CA réel (petit rabais accordé)
    costs: 5800, // Coûts réels (peinture + main d'œuvre)
    location: "78 Boulevard de la Mer, 13001 Marseille",
    start_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "Peinture complète de l'intérieur d'un bâtiment commercial",
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    client: {
      id: "fake-client-3",
      name: "Entreprise Bernard",
      email: "contact@bernard.fr",
    },
  },
  {
    id: "fake-proj-4",
    user_id: "fake-user",
    client_id: "fake-client-1",
    name: "Isolation Combles",
    status: "terminé",
    progress: 100,
    budget: 12000,
    actual_revenue: 12000, // CA réel facturé
    costs: 8500, // Coûts réels
    location: "5 Rue du Commerce, 33000 Bordeaux",
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "Isolation thermique des combles avec laine de verre",
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    client: {
      id: "fake-client-1",
      name: "M. Martin",
      email: "martin@example.com",
    },
  },
  {
    id: "fake-proj-5",
    user_id: "fake-user",
    client_id: "fake-client-2",
    name: "Rénovation Salle de Bain",
    status: "en_cours",
    progress: 45,
    budget: 15000,
    actual_revenue: 15000, // CA réel facturé
    costs: 11000, // Coûts engagés jusqu'à présent
    location: "23 Avenue Victor Hugo, 69002 Lyon",
    start_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "Rénovation complète d'une salle de bain avec carrelage et sanitaires",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    client: {
      id: "fake-client-2",
      name: "Mme. Dupont",
      email: "dupont@example.com",
    },
  },
];



