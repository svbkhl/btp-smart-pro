/**
 * Utilitaires d'export des données Analytics
 * 
 * Permet d'exporter les données analytics en CSV ou Excel
 */

import type { Project } from "@/fakeData/projects";

interface ExportData {
  projects: Project[];
  clients: any[];
  invoices: any[];
}

interface AnalyticsSummary {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  avgMargin: number;
  projectCount: number;
  clientCount: number;
}

/**
 * Exporte les données analytics en format CSV
 */
export function exportToCSV(data: ExportData, summary: AnalyticsSummary): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `analytics-${timestamp}.csv`;

  // Créer le contenu CSV
  let csvContent = "data:text/csv;charset=utf-8,";

  // Section Résumé
  csvContent += "RÉSUMÉ ANALYTICS\n";
  csvContent += `Date d'export,${new Date().toLocaleString('fr-FR')}\n`;
  csvContent += `\n`;
  csvContent += `Chiffre d'affaires total,${summary.totalRevenue}€\n`;
  csvContent += `Coûts totaux,${summary.totalCosts}€\n`;
  csvContent += `Profit total,${summary.totalProfit}€\n`;
  csvContent += `Marge moyenne,${summary.avgMargin.toFixed(2)}%\n`;
  csvContent += `Nombre de projets,${summary.projectCount}\n`;
  csvContent += `Nombre de clients,${summary.clientCount}\n`;
  csvContent += `\n\n`;

  // Section Projets
  csvContent += "DÉTAIL DES PROJETS\n";
  csvContent += "Nom,Statut,Client,Budget,Coûts,Revenus,Profit,Marge (%),Date début,Date fin\n";
  
  data.projects.forEach(project => {
    const budget = project.budget || 0;
    const costs = project.costs || 0;
    const revenue = project.actual_revenue || 0;
    const profit = revenue - costs;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : '0.00';
    
    const row = [
      escapeCSV(project.name),
      escapeCSV(project.status),
      escapeCSV(project.client?.name || 'N/A'),
      budget,
      costs,
      revenue,
      profit,
      margin,
      project.start_date || 'N/A',
      project.end_date || 'N/A',
    ].join(',');
    
    csvContent += row + "\n";
  });

  // Section Clients
  csvContent += `\n\nDÉTAIL DES CLIENTS\n`;
  csvContent += "Nom,Email,Téléphone,Localisation,Statut,Dépenses totales\n";
  
  data.clients.forEach(client => {
    const row = [
      escapeCSV(client.name || ''),
      escapeCSV(client.email || ''),
      escapeCSV(client.phone || ''),
      escapeCSV(client.location || ''),
      escapeCSV(client.status || ''),
      client.total_spent || 0,
    ].join(',');
    
    csvContent += row + "\n";
  });

  // Télécharger le fichier
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Échappe les caractères spéciaux CSV
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // Si la valeur contient des virgules, guillemets ou retours à la ligne, l'entourer de guillemets
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Échapper les guillemets en les doublant
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

/**
 * Exporte les données analytics en format Excel (via CSV enrichi)
 * Note: Pour un vrai Excel (.xlsx), il faudrait utiliser une bibliothèque comme xlsx ou exceljs
 */
export function exportToExcel(data: ExportData, summary: AnalyticsSummary): void {
  // Pour l'instant, on utilise le même format CSV
  // TODO: Implémenter un vrai export Excel avec la bibliothèque 'xlsx'
  exportToCSV(data, summary);
}

/**
 * Génère un résumé analytics à partir des données
 */
export function generateAnalyticsSummary(
  projects: Project[],
  clients: any[]
): AnalyticsSummary {
  const totalRevenue = projects.reduce((sum, p) => sum + (p.actual_revenue || 0), 0);
  const totalCosts = projects.reduce((sum, p) => sum + (p.costs || 0), 0);
  const totalProfit = totalRevenue - totalCosts;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    avgMargin,
    projectCount: projects.length,
    clientCount: clients.length,
  };
}

/**
 * Prépare les données pour l'export
 */
export function prepareExportData(
  projects: Project[],
  clients: any[],
  invoices: any[]
): ExportData {
  return {
    projects,
    clients,
    invoices,
  };
}

/**
 * Fonction principale d'export
 */
export function exportAnalytics(
  projects: Project[],
  clients: any[],
  invoices: any[] = [],
  format: 'csv' | 'excel' = 'csv'
): void {
  const data = prepareExportData(projects, clients, invoices);
  const summary = generateAnalyticsSummary(projects, clients);

  if (format === 'excel') {
    exportToExcel(data, summary);
  } else {
    exportToCSV(data, summary);
  }
}
