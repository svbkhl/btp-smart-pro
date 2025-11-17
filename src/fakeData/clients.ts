import { Client } from "@/hooks/useClients";

export const FAKE_CLIENTS: Client[] = [
  {
    id: "fake-client-1",
    user_id: "fake-user",
    name: "M. Martin",
    email: "martin@example.fr",
    phone: "+33 6 11 22 33 44",
    location: "12 Rue de la République, 75001 Paris",
    status: "actif",
    total_spent: 45000,
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "fake-client-2",
    user_id: "fake-user",
    name: "Mme. Dupont",
    email: "dupont@example.fr",
    phone: "+33 6 22 33 44 55",
    location: "45 Avenue des Champs, 69000 Lyon",
    status: "actif",
    total_spent: 18000,
    created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "fake-client-3",
    user_id: "fake-user",
    name: "Entreprise Bernard",
    email: "bernard@example.fr",
    phone: "+33 6 33 44 55 66",
    location: "78 Rue du Commerce, 13000 Marseille",
    status: "VIP",
    total_spent: 125000,
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "fake-client-4",
    user_id: "fake-user",
    name: "SARL Dubois",
    email: "dubois@example.fr",
    phone: "+33 6 44 55 66 77",
    location: "23 Boulevard Saint-Michel, 75005 Paris",
    status: "actif",
    total_spent: 32000,
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];


