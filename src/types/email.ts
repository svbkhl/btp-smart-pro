/**
 * Types pour le système d'envoi d'emails
 */

export type EmailProvider = 'gmail' | 'outlook' | 'smtp' | 'resend';

export interface UserEmailSettings {
  id?: string;
  user_id: string;
  provider: EmailProvider;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  from_email?: string;
  from_name?: string;
  oauth_access_token?: string;
  oauth_refresh_token?: string;
  oauth_token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SendQuoteEmailParams {
  quoteId: string;
  quoteNumber: string;
  clientEmail: string;
  clientName: string;
  includePDF?: boolean;
  customMessage?: string;
}

export interface SendEmailResponse {
  success: boolean;
  email_id?: string;
  message?: string;
  error?: string;
  details?: any;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64
  type: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}
