/**
 * Service pour exporter les données (CSV, PDF, etc.)
 */

import { Project } from "@/hooks/useProjects";
import { Client } from "@/hooks/useClients";

/**
 * Exporte les projets en CSV
 */
export function exportProjectsToCSV(projects: Project[]): void {
  const headers = [
    "Nom",
    "Client",
    "Statut",
    "Progression (%)",
    "Budget (€)",
    "Lieu",
    "Date de début",
    "Date de fin",
    "Description",
  ];

  const rows = projects.map((project) => [
    project.name,
    project.client?.name || "",
    project.status,
    project.progress.toString(),
    project.budget?.toString() || "",
    project.location || "",
    project.start_date || "",
    project.end_date || "",
    project.description?.replace(/\n/g, " ") || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  downloadFile(csvContent, "projets.csv", "text/csv");
}

/**
 * Exporte les clients en CSV
 */
export function exportClientsToCSV(clients: Client[], projects: Project[]): void {
  const headers = [
    "Nom",
    "Email",
    "Téléphone",
    "Adresse",
    "Statut",
    "Nombre de projets",
    "Total dépensé (€)",
  ];

  const getClientProjectsCount = (clientId: string) => {
    return projects.filter((p) => p.client_id === clientId).length;
  };

  const getClientTotalSpent = (clientId: string) => {
    const clientProjects = projects.filter(
      (p) => p.client_id === clientId && p.status === "terminé"
    );
    return clientProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  };

  const rows = clients.map((client) => [
    client.name,
    client.email || "",
    client.phone || "",
    client.location || "",
    client.status,
    getClientProjectsCount(client.id).toString(),
    getClientTotalSpent(client.id).toString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  downloadFile(csvContent, "clients.csv", "text/csv");
}

/**
 * Exporte les projets en JSON
 */
export function exportProjectsToJSON(projects: Project[]): void {
  const jsonContent = JSON.stringify(projects, null, 2);
  downloadFile(jsonContent, "projets.json", "application/json");
}

/**
 * Exporte les clients en JSON
 */
export function exportClientsToJSON(clients: Client[]): void {
  const jsonContent = JSON.stringify(clients, null, 2);
  downloadFile(jsonContent, "clients.json", "application/json");
}

/**
 * Télécharge un fichier
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formatte une date pour l'export
 */
export function formatDateForExport(dateString: string | undefined): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR");
}

/**
 * Formatte un nombre pour l'export
 */
export function formatNumberForExport(value: number | undefined): string {
  if (value === undefined || value === null) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatte une monnaie pour l'export
 */
export function formatCurrencyForExport(value: number | undefined): string {
  if (value === undefined || value === null) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

