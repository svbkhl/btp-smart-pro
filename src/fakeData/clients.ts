import type { Client } from "@/hooks/useClients";

export const FAKE_CLIENTS: Client[] = [
  {
    id: "fake-client-1",
    user_id: "fake-user",
    name: "M. Martin",
    email: "martin@example.com",
    phone: "+33 6 12 34 56 78",
    location: "Paris, 75001",
    status: "actif",
    total_spent: 45000,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fake-client-2",
    user_id: "fake-user",
    name: "Mme. Dupont",
    email: "dupont@example.com",
    phone: "+33 6 23 45 67 89",
    location: "Lyon, 69001",
    status: "actif",
    total_spent: 18000,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fake-client-3",
    user_id: "fake-user",
    name: "Entreprise Bernard",
    email: "contact@bernard.fr",
    phone: "+33 1 23 45 67 89",
    location: "Marseille, 13001",
    status: "VIP",
    total_spent: 125000,
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];



















