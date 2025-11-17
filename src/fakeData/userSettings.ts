import { UserSettings } from "@/hooks/useUserSettings";

export const FAKE_USER_SETTINGS: UserSettings = {
  id: "fake-settings-1",
  user_id: "fake-user",
  company_name: "BTP Smart Pro",
  email: "contact@btpsmartpro.fr",
  phone: "+33 1 23 45 67 89",
  address: "123 Rue de la Construction",
  city: "Paris",
  postal_code: "75001",
  country: "France",
  siret: "12345678901234",
  vat_number: "FR12345678901",
  legal_form: "SARL",
  notifications_enabled: true,
  reminder_enabled: true,
  email_notifications: true,
  created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

