import { startOfWeek, addDays, format } from "date-fns";

export interface Assignment {
  id: string;
  employee_id: string;
  project_id: string;
  jour: string;
  heures: number;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
  projects?: {
    id: string;
    name: string;
    location?: string;
  };
}

// Générer les dates de la semaine en cours (lundi à vendredi)
const getWeekDates = () => {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
  return jours.map((jour, index) => ({
    jour,
    date: format(addDays(monday, index), "yyyy-MM-dd"),
  }));
};

const weekDates = getWeekDates();

export const FAKE_ASSIGNMENTS: Assignment[] = [
  // Jean Dupont (Maçon) - fake-emp-1
  {
    id: "fake-assign-1",
    employee_id: "fake-emp-1",
    project_id: "fake-proj-1",
    jour: weekDates[0].jour,
    date: weekDates[0].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-1",
      name: "Rénovation Maison Martin",
      location: "12 Rue de la République, 75001 Paris",
    },
  },
  {
    id: "fake-assign-2",
    employee_id: "fake-emp-1",
    project_id: "fake-proj-1",
    jour: weekDates[1].jour,
    date: weekDates[1].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-1",
      name: "Rénovation Maison Martin",
      location: "12 Rue de la République, 75001 Paris",
    },
  },
  {
    id: "fake-assign-3",
    employee_id: "fake-emp-1",
    project_id: "fake-proj-1",
    jour: weekDates[2].jour,
    date: weekDates[2].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-1",
      name: "Rénovation Maison Martin",
      location: "12 Rue de la République, 75001 Paris",
    },
  },
  {
    id: "fake-assign-4",
    employee_id: "fake-emp-1",
    project_id: "fake-proj-3",
    jour: weekDates[3].jour,
    date: weekDates[3].date,
    heures: 7,
    heure_debut: "08:00",
    heure_fin: "16:00",
    projects: {
      id: "fake-proj-3",
      name: "Aménagement Bureaux Tech",
      location: "88 Rue de Rivoli, 13001 Marseille",
    },
  },
  {
    id: "fake-assign-5",
    employee_id: "fake-emp-1",
    project_id: "fake-proj-3",
    jour: weekDates[4].jour,
    date: weekDates[4].date,
    heures: 6,
    heure_debut: "08:00",
    heure_fin: "15:00",
    projects: {
      id: "fake-proj-3",
      name: "Aménagement Bureaux Tech",
      location: "88 Rue de Rivoli, 13001 Marseille",
    },
  },

  // Marie Lefebvre (Plombier) - fake-emp-2
  {
    id: "fake-assign-6",
    employee_id: "fake-emp-2",
    project_id: "fake-proj-1",
    jour: weekDates[0].jour,
    date: weekDates[0].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-1",
      name: "Rénovation Maison Martin",
      location: "12 Rue de la République, 75001 Paris",
    },
  },
  {
    id: "fake-assign-7",
    employee_id: "fake-emp-2",
    project_id: "fake-proj-1",
    jour: weekDates[1].jour,
    date: weekDates[1].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-1",
      name: "Rénovation Maison Martin",
      location: "12 Rue de la République, 75001 Paris",
    },
  },
  {
    id: "fake-assign-8",
    employee_id: "fake-emp-2",
    project_id: "fake-proj-4",
    jour: weekDates[2].jour,
    date: weekDates[2].date,
    heures: 8,
    heure_debut: "09:00",
    heure_fin: "18:00",
    projects: {
      id: "fake-proj-4",
      name: "Réfection Toiture Bernard",
      location: "33 Rue Nationale, 59000 Lille",
    },
  },
  {
    id: "fake-assign-9",
    employee_id: "fake-emp-2",
    project_id: "fake-proj-4",
    jour: weekDates[3].jour,
    date: weekDates[3].date,
    heures: 8,
    heure_debut: "09:00",
    heure_fin: "18:00",
    projects: {
      id: "fake-proj-4",
      name: "Réfection Toiture Bernard",
      location: "33 Rue Nationale, 59000 Lille",
    },
  },
  {
    id: "fake-assign-10",
    employee_id: "fake-emp-2",
    project_id: "fake-proj-4",
    jour: weekDates[4].jour,
    date: weekDates[4].date,
    heures: 8,
    heure_debut: "09:00",
    heure_fin: "18:00",
    projects: {
      id: "fake-proj-4",
      name: "Réfection Toiture Bernard",
      location: "33 Rue Nationale, 59000 Lille",
    },
  },

  // Pierre Moreau (Électricien) - fake-emp-3
  {
    id: "fake-assign-11",
    employee_id: "fake-emp-3",
    project_id: "fake-proj-3",
    jour: weekDates[0].jour,
    date: weekDates[0].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-3",
      name: "Aménagement Bureaux Tech",
      location: "88 Rue de Rivoli, 13001 Marseille",
    },
  },
  {
    id: "fake-assign-12",
    employee_id: "fake-emp-3",
    project_id: "fake-proj-3",
    jour: weekDates[1].jour,
    date: weekDates[1].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-3",
      name: "Aménagement Bureaux Tech",
      location: "88 Rue de Rivoli, 13001 Marseille",
    },
  },
  {
    id: "fake-assign-13",
    employee_id: "fake-emp-3",
    project_id: "fake-proj-3",
    jour: weekDates[2].jour,
    date: weekDates[2].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-3",
      name: "Aménagement Bureaux Tech",
      location: "88 Rue de Rivoli, 13001 Marseille",
    },
  },
  {
    id: "fake-assign-14",
    employee_id: "fake-emp-3",
    project_id: "fake-proj-3",
    jour: weekDates[3].jour,
    date: weekDates[3].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-3",
      name: "Aménagement Bureaux Tech",
      location: "88 Rue de Rivoli, 13001 Marseille",
    },
  },
  {
    id: "fake-assign-15",
    employee_id: "fake-emp-3",
    project_id: "fake-proj-3",
    jour: weekDates[4].jour,
    date: weekDates[4].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-3",
      name: "Aménagement Bureaux Tech",
      location: "88 Rue de Rivoli, 13001 Marseille",
    },
  },

  // Sophie Bernard (Peintre) - fake-emp-4
  {
    id: "fake-assign-16",
    employee_id: "fake-emp-4",
    project_id: "fake-proj-1",
    jour: weekDates[0].jour,
    date: weekDates[0].date,
    heures: 7,
    heure_debut: "09:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-1",
      name: "Rénovation Maison Martin",
      location: "12 Rue de la République, 75001 Paris",
    },
  },
  {
    id: "fake-assign-17",
    employee_id: "fake-emp-4",
    project_id: "fake-proj-1",
    jour: weekDates[1].jour,
    date: weekDates[1].date,
    heures: 7,
    heure_debut: "09:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-1",
      name: "Rénovation Maison Martin",
      location: "12 Rue de la République, 75001 Paris",
    },
  },
  {
    id: "fake-assign-18",
    employee_id: "fake-emp-4",
    project_id: "fake-proj-5",
    jour: weekDates[2].jour,
    date: weekDates[2].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-5",
      name: "Construction Villa Moderne",
      location: "22 Chemin des Collines, 06000 Nice",
    },
  },
  {
    id: "fake-assign-19",
    employee_id: "fake-emp-4",
    project_id: "fake-proj-5",
    jour: weekDates[3].jour,
    date: weekDates[3].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-5",
      name: "Construction Villa Moderne",
      location: "22 Chemin des Collines, 06000 Nice",
    },
  },
  {
    id: "fake-assign-20",
    employee_id: "fake-emp-4",
    project_id: "fake-proj-5",
    jour: weekDates[4].jour,
    date: weekDates[4].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-5",
      name: "Construction Villa Moderne",
      location: "22 Chemin des Collines, 06000 Nice",
    },
  },

  // Lucas Martin (Menuisier) - fake-emp-5
  {
    id: "fake-assign-21",
    employee_id: "fake-emp-5",
    project_id: "fake-proj-2",
    jour: weekDates[1].jour,
    date: weekDates[1].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-2",
      name: "Extension Garage Dupont",
      location: "45 Avenue des Champs, 69001 Lyon",
    },
  },
  {
    id: "fake-assign-22",
    employee_id: "fake-emp-5",
    project_id: "fake-proj-2",
    jour: weekDates[2].jour,
    date: weekDates[2].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-2",
      name: "Extension Garage Dupont",
      location: "45 Avenue des Champs, 69001 Lyon",
    },
  },
  {
    id: "fake-assign-23",
    employee_id: "fake-emp-5",
    project_id: "fake-proj-2",
    jour: weekDates[3].jour,
    date: weekDates[3].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-2",
      name: "Extension Garage Dupont",
      location: "45 Avenue des Champs, 69001 Lyon",
    },
  },
  {
    id: "fake-assign-24",
    employee_id: "fake-emp-5",
    project_id: "fake-proj-2",
    jour: weekDates[4].jour,
    date: weekDates[4].date,
    heures: 8,
    heure_debut: "08:00",
    heure_fin: "17:00",
    projects: {
      id: "fake-proj-2",
      name: "Extension Garage Dupont",
      location: "45 Avenue des Champs, 69001 Lyon",
    },
  },
];





