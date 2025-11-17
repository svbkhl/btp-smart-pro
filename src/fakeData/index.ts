/**
 * Export centralisé de toutes les données fake
 * Utilisé par le système global de fake data
 */

export { FAKE_EMPLOYEES } from "./employees";
export { FAKE_PROJECTS } from "./projects";
export { FAKE_EVENTS } from "./calendar";
export { FAKE_CLIENTS } from "./clients";
export { FAKE_QUOTES } from "./quotes";
export { FAKE_USER_STATS } from "./stats";
export { FAKE_USER_SETTINGS } from "./userSettings";
export {
  FAKE_EMPLOYEES_RH,
  FAKE_CANDIDATURES,
  FAKE_TACHES_RH,
  FAKE_RH_ACTIVITIES,
  FAKE_RH_STATS,
} from "./rh";

// Ré-exporter les données mock existantes pour compatibilité
export { MOCK_EVENTS } from "@/utils/mockData";
export { MOCK_EMPLOYEES } from "@/utils/mockData";
export { MOCK_EMPLOYEES_RH, MOCK_CANDIDATURES, MOCK_TACHES_RH, MOCK_RH_ACTIVITIES, MOCK_RH_STATS } from "@/utils/mockData";

