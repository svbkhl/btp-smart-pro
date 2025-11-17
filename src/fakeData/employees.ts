import { Employee } from "@/hooks/useEmployees";

export const FAKE_EMPLOYEES: Employee[] = [
  {
    id: "fake-emp-1",
    user_id: "fake-user-1",
    nom: "Dupont",
    prenom: "Jean",
    poste: "Maçon",
    specialites: ["Maçonnerie", "Enduit", "Carrelage"],
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      email: "jean.dupont@demo.fr",
      email_confirmed_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "fake-emp-2",
    user_id: "fake-user-2",
    nom: "Lefebvre",
    prenom: "Marie",
    poste: "Plombier",
    specialites: ["Plomberie", "Chauffage", "Sanitaires"],
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      email: "marie.lefebvre@demo.fr",
      email_confirmed_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "fake-emp-3",
    user_id: "fake-user-3",
    nom: "Moreau",
    prenom: "Pierre",
    poste: "Électricien",
    specialites: ["Électricité", "Domotique", "Éclairage"],
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      email: "pierre.moreau@demo.fr",
      email_confirmed_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "fake-emp-4",
    user_id: "fake-user-4",
    nom: "Bernard",
    prenom: "Sophie",
    poste: "Peintre",
    specialites: ["Peinture", "Revêtement", "Papier peint"],
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      email: "sophie.bernard@demo.fr",
      email_confirmed_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "fake-emp-5",
    user_id: "fake-user-5",
    nom: "Martin",
    prenom: "Thomas",
    poste: "Charpentier",
    specialites: ["Charpente", "Menuiserie", "Ossature"],
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      email: "thomas.martin@demo.fr",
      email_confirmed_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
];


