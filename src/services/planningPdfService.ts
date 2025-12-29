import jsPDF from 'jspdf';
import { format, startOfWeek, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Employee {
  id: string;
  nom: string;
  prenom?: string;
  poste?: string;
}

interface Project {
  id: string;
  name: string;
  location?: string;
}

interface Assignment {
  id: string;
  employee_id: string;
  project_id: string;
  jour: string;
  heures: number;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
}

interface ExportPlanningPDFParams {
  employees: Employee[];
  projects: Project[];
  assignments: Assignment[];
  weekStart: Date;
  weekEnd: Date;
  employeeName?: string; // Pour la vue individuelle
  companyName?: string;
  companyLogo?: string;
}

const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];

/**
 * Génère et télécharge un PDF de planning (global ou individuel)
 */
export async function exportPlanningPDF(params: ExportPlanningPDFParams): Promise<void> {
  try {
    const {
      employees,
      projects,
      assignments,
      weekStart,
      weekEnd,
      employeeName,
      companyName = "BTP Smart Pro",
      companyLogo,
    } = params;

    const isIndividual = !!employeeName;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Couleurs
    const primaryColor = [59, 130, 246]; // Blue
    const lightGray = [243, 244, 246];
    const darkGray = [107, 114, 128];
    const borderColor = [229, 231, 235];

    // En-tête
    let yPos = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;

    // Logo (si disponible)
    if (companyLogo) {
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = companyLogo;
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          setTimeout(reject, 3000);
        });
        const logoSize = 20;
        doc.addImage(logoImg, 'PNG', margin, yPos, logoSize, logoSize);
      } catch (error) {
        console.warn('Impossible de charger le logo:', error);
      }
    }

    // Titre
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    const title = isIndividual 
      ? `Planning - ${employeeName}`
      : 'Planning Global';
    doc.text(title, margin + (companyLogo ? 25 : 0), yPos + 10);

    // Période
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    const period = `Semaine du ${format(weekStart, 'd MMMM yyyy', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`;
    doc.text(period, margin + (companyLogo ? 25 : 0), yPos + 16);

    // Nom de l'entreprise
    doc.setFontSize(9);
    doc.text(companyName, pageWidth - margin, yPos + 10, { align: 'right' });
    doc.text(format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }), pageWidth - margin, yPos + 16, { align: 'right' });

    yPos = 30;

    // Calculer les dates de la semaine
    const weekDates = JOURS_SEMAINE.map((_, index) => addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), index));

    // Tableau du planning
    const cellHeight = 8;
    const employeeColWidth = isIndividual ? 0 : 40; // Pas de colonne employé pour la vue individuelle
    const dayColWidth = (contentWidth - employeeColWidth) / 5;
    const headerHeight = 12;

    // En-tête du tableau
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPos, contentWidth, headerHeight, 'F');
    doc.setDrawColor(...borderColor);
    doc.rect(margin, yPos, contentWidth, headerHeight);

    let xPos = margin;
    if (!isIndividual) {
      // Colonne Employé
      doc.setFontSize(9);
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text('Employé', xPos + employeeColWidth / 2, yPos + headerHeight / 2 + 3, { align: 'center' });
      doc.line(xPos + employeeColWidth, yPos, xPos + employeeColWidth, yPos + headerHeight);
      xPos += employeeColWidth;
    }

    // Colonnes des jours
    weekDates.forEach((date, index) => {
      doc.setFontSize(8);
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'bold');
      const dayName = format(date, 'EEE', { locale: fr });
      const dayNumber = format(date, 'd');
      doc.text(dayName.toUpperCase(), xPos + dayColWidth / 2, yPos + 5, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(dayNumber, xPos + dayColWidth / 2, yPos + 9, { align: 'center' });
      
      if (index < 4) {
        doc.line(xPos + dayColWidth, yPos, xPos + dayColWidth, yPos + headerHeight);
      }
      xPos += dayColWidth;
    });

    yPos += headerHeight;

    // Lignes des employés (ou une seule ligne pour la vue individuelle)
    const employeesToShow = isIndividual 
      ? employees.filter(emp => `${emp.prenom} ${emp.nom}` === employeeName)
      : employees;

    employeesToShow.forEach((employee, empIndex) => {
      // Vérifier si on doit créer une nouvelle page
      if (yPos + cellHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = 15;
      }

      // Ligne de l'employé
      doc.setDrawColor(...borderColor);
      doc.rect(margin, yPos, contentWidth, cellHeight);

      xPos = margin;
      if (!isIndividual) {
        // Nom de l'employé
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        const employeeName = `${employee.prenom || ''} ${employee.nom}`.trim();
        doc.text(employeeName, xPos + 2, yPos + cellHeight / 2 + 2);
        if (employee.poste) {
          doc.setFontSize(7);
          doc.setTextColor(...darkGray);
          doc.text(employee.poste, xPos + 2, yPos + cellHeight / 2 + 5);
        }
        doc.line(xPos + employeeColWidth, yPos, xPos + employeeColWidth, yPos + cellHeight);
        xPos += employeeColWidth;
      }

      // Affectations par jour
      weekDates.forEach((date, dayIndex) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayAssignments = assignments.filter(
          a => a.employee_id === employee.id && a.date === dateStr
        );

        if (dayAssignments.length > 0) {
          dayAssignments.forEach((assignment, assignIndex) => {
            const project = projects.find(p => p.id === assignment.project_id);
            const projectName = project?.name || 'Chantier';
            const hours = assignment.heures || 0;
            const timeRange = assignment.heure_debut && assignment.heure_fin
              ? `${assignment.heure_debut}-${assignment.heure_fin}`
              : `${hours}h`;

            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            // Ajuster la position verticale si plusieurs affectations
            const yOffset = assignIndex * 3;
            doc.text(projectName, xPos + 1, yPos + 3 + yOffset, { maxWidth: dayColWidth - 2 });
            doc.setFontSize(6);
            doc.setTextColor(...darkGray);
            doc.text(timeRange, xPos + 1, yPos + 6 + yOffset, { maxWidth: dayColWidth - 2 });
          });
        }

        if (dayIndex < 4) {
          doc.line(xPos + dayColWidth, yPos, xPos + dayColWidth, yPos + cellHeight);
        }
        xPos += dayColWidth;
      });

      yPos += cellHeight;
    });

    // Statistiques en bas
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques', margin, yPos);

    yPos += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const totalHours = assignments.reduce((sum, a) => sum + (a.heures || 0), 0);
    const uniqueEmployees = new Set(assignments.map(a => a.employee_id)).size;
    const uniqueProjects = new Set(assignments.map(a => a.project_id)).size;

    doc.text(`Total heures: ${totalHours}h`, margin, yPos);
    if (!isIndividual) {
      doc.text(`Employés: ${uniqueEmployees}`, margin + 50, yPos);
    }
    doc.text(`Chantiers: ${uniqueProjects}`, margin + (isIndividual ? 50 : 100), yPos);

    // Nom du fichier
    const weekLabel = format(weekStart, 'yyyy-MM-dd', { locale: fr });
    const fileName = isIndividual
      ? `planning-${employeeName?.replace(/\s+/g, '-')}-${weekLabel}.pdf`
      : `planning-global-${weekLabel}.pdf`;

    // Sauvegarder
    doc.save(fileName);
    console.log('✅ Planning PDF généré avec succès:', fileName);
  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Impossible de générer le PDF. Veuillez réessayer.'
    );
  }
}

















