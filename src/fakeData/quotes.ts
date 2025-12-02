import { Quote } from "@/hooks/useQuotes";

export const FAKE_QUOTES: Quote[] = [
  {
    id: "fake-quote-1",
    user_id: "fake-user",
    client_name: "M. Martin",
    project_id: "fake-proj-1",
    quote_number: "DEVIS-2024-001",
    status: "sent",
    estimated_cost: 45000,
    details: {
      estimatedCost: 45000,
      items: [
        { name: "Maçonnerie", quantity: 1, unitPrice: 25000 },
        { name: "Plomberie", quantity: 1, unitPrice: 12000 },
        { name: "Électricité", quantity: 1, unitPrice: 8000 },
      ],
    },
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fake-quote-2",
    user_id: "fake-user",
    client_name: "Mme. Dupont",
    project_id: "fake-proj-2",
    quote_number: "DEVIS-2024-002",
    status: "draft",
    estimated_cost: 18000,
    details: {
      estimatedCost: 18000,
      items: [
        { name: "Extension garage", quantity: 1, unitPrice: 18000 },
      ],
    },
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fake-quote-3",
    user_id: "fake-user",
    client_name: "Entreprise Bernard",
    project_id: "fake-proj-3",
    quote_number: "DEVIS-2024-003",
    status: "accepted",
    estimated_cost: 8500,
    details: {
      estimatedCost: 8500,
      items: [
        { name: "Peinture intérieure", quantity: 120, unitPrice: 70 },
      ],
    },
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
  },
];


