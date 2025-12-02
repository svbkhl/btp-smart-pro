export type EmailProvider = 'gmail' | 'outlook' | 'smtp';

export interface EmailAccount {
  id: string;
  user_id: string;
  email_address: string;
  provider: EmailProvider;
  is_default: boolean;
  is_active: boolean;
  
  // OAuth tokens
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  
  // SMTP/IMAP config
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_secure?: boolean;
  imap_host?: string;
  imap_port?: number;
  imap_username?: string;
  imap_password?: string;
  
  // Metadata
  display_name?: string;
  signature?: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  size: number;
  contentType: string;
  url?: string;
  data?: string; // Base64
}

export interface Email {
  id: string;
  email_account_id: string;
  user_id: string;
  external_id?: string;
  thread_id?: string;
  
  from_address: string;
  from_name?: string;
  to_addresses: EmailAddress[];
  cc_addresses?: EmailAddress[];
  bcc_addresses?: EmailAddress[];
  subject: string;
  body_text?: string;
  body_html?: string;
  
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';
  labels?: string[];
  
  has_attachments: boolean;
  attachments?: EmailAttachment[];
  
  sent_at?: string;
  received_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  user_id?: string;
  name: string;
  subject: string;
  body_html: string;
  variables?: string[];
  is_system: boolean;
  template_type?: 'quote' | 'invoice' | 'reminder' | 'general';
  created_at: string;
  updated_at: string;
}

export interface SendEmailRequest {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body_html: string;
  body_text?: string;
  attachments?: EmailAttachment[];
  reply_to?: string;
  email_account_id?: string; // Si non fourni, utilise le compte par défaut
}

export interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
}

export interface IMAPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}





