// Types pour le système de relances clients

export interface PaymentReminder {
  id: string;
  invoice_id: string;
  company_id: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  invoice_number: string;
  invoice_amount: number;
  due_date: string;
  days_overdue: number;
  reminder_level: 1 | 2 | 3; // J+7, J+15, J+30
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  email_subject?: string;
  email_body?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderTemplate {
  id: string;
  company_id: string;
  reminder_level: 1 | 2 | 3;
  subject: string;
  body: string; // Peut contenir des variables : {{client_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{days_overdue}}
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderTemplateData {
  reminder_level: 1 | 2 | 3;
  subject: string;
  body: string;
  is_active?: boolean;
}

export interface OverdueInvoice {
  id: string;
  invoice_number: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  amount_ttc: number;
  due_date: string;
  days_overdue: number;
  status: string;
  payment_status?: string;
  last_reminder_sent_at?: string;
  last_reminder_level?: number;
  reminder_count: number;
}

export interface ReminderStats {
  total_overdue: number;
  total_amount_overdue: number;
  reminders_sent_today: number;
  reminders_pending: number;
  level_1_count: number; // J+7
  level_2_count: number; // J+15
  level_3_count: number; // J+30
}
