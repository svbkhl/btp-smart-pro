import { EmployeeRH, Candidature, TacheRH, RHActivity } from "@/hooks/useRH";

export const FAKE_EMPLOYEES_RH: EmployeeRH[] = [
  {
    id: "fake-emp-rh-1",
    user_id: "fake-user-1",
    nom: "Dupont",
    prenom: "Jean",
    email: "jean.dupont@demo.fr",
    poste: "Maçon",
    statut: "actif",
    date_entree: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    date_fin_contrat: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    telephone: "+33 6 11 22 33 44",
    adresse: "15 Rue de la Paix, 75001 Paris",
    salaire_base: 2800,
    specialites: ["Maçonnerie", "Enduit"],
  },
  {
    id: "fake-emp-rh-2",
    user_id: "fake-user-2",
    nom: "Lefebvre",
    prenom: "Marie",
    email: "marie.lefebvre@demo.fr",
    poste: "Plombier",
    statut: "actif",
    date_entree: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    telephone: "+33 6 22 33 44 55",
    adresse: "28 Avenue des Fleurs, 69000 Lyon",
    salaire_base: 3000,
    specialites: ["Plomberie", "Chauffage"],
  },
  {
    id: "fake-emp-rh-3",
    user_id: "fake-user-3",
    nom: "Moreau",
    prenom: "Pierre",
    email: "pierre.moreau@demo.fr",
    poste: "Électricien",
    statut: "actif",
    date_entree: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    telephone: "+33 6 33 44 55 66",
    adresse: "42 Boulevard Saint-Michel, 13000 Marseille",
    salaire_base: 3200,
    specialites: ["Électricité", "Domotique"],
  },
];

export const FAKE_CANDIDATURES: Candidature[] = [
  {
    id: "fake-cand-1",
    nom: "Durand",
    prenom: "Sophie",
    email: "sophie.durand@email.fr",
    telephone: "+33 6 44 55 66 77",
    poste_souhaite: "Couvreur",
    statut: "en_attente",
    score_correspondance: 85,
    date_candidature: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fake-cand-2",
    nom: "Garcia",
    prenom: "Lucas",
    email: "lucas.garcia@email.fr",
    telephone: "+33 6 55 66 77 88",
    poste_souhaite: "Menuisier",
    statut: "entretien",
    score_correspondance: 92,
    date_candidature: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    date_entretien: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const FAKE_TACHES_RH: TacheRH[] = [
  {
    id: "fake-tache-1",
    titre: "Renouvellement contrat Jean Dupont",
    description: "Le contrat de Jean Dupont arrive à échéance dans 15 jours. Préparer le renouvellement.",
    type_tache: "validation",
    priorite: "haute",
    statut: "en_cours",
    date_echeance: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fake-tache-2",
    titre: "Formation sécurité obligatoire",
    description: "Organiser la formation sécurité pour les nouveaux employés avant le 20 janvier.",
    type_tache: "formation",
    priorite: "moyenne",
    statut: "en_attente",
    date_echeance: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const FAKE_RH_ACTIVITIES: RHActivity[] = [
  {
    id: "fake-activity-1",
    type_activite: "candidature",
    titre: "Nouvelle candidature reçue",
    description: "Sophie Durand a postulé pour le poste de Couvreur",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fake-activity-2",
    type_activite: "contrat",
    titre: "Contrat renouvelé",
    description: "Le contrat de Jean Dupont a été renouvelé",
    employee_id: "fake-emp-rh-1",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fake-activity-3",
    type_activite: "tache",
    titre: "Tâche RH créée",
    description: "Nouvelle tâche : Formation sécurité obligatoire",
    tache_id: "fake-tache-2",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const FAKE_RH_STATS = {
  totalEmployees: 3,
  activeEmployees: 3,
  tauxPresence: 95,
  activeCandidatures: 2,
  totalTaches: 2,
  completedTaches: 0,
  tauxCompletion: 0,
};


