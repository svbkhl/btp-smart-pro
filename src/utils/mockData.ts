/**
 * Données mock pour affichage en cas de timeout ou d'erreur
 * Ré-exporte les données depuis src/fakeData/ pour compatibilité
 */

// Ré-exporter depuis fakeData pour compatibilité avec l'ancien code
export { FAKE_EVENTS as MOCK_EVENTS } from "@/fakeData/calendar";
export { FAKE_EMPLOYEES as MOCK_EMPLOYEES } from "@/fakeData/employees";
export { 
  FAKE_EMPLOYEES_RH as MOCK_EMPLOYEES_RH, 
  FAKE_CANDIDATURES as MOCK_CANDIDATURES, 
  FAKE_TACHES_RH as MOCK_TACHES_RH, 
  FAKE_RH_ACTIVITIES as MOCK_RH_ACTIVITIES, 
  FAKE_RH_STATS as MOCK_RH_STATS 
} from "@/fakeData/rh";


