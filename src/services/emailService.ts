import { supabase } from "@/integrations/supabase/client";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: 'confirmation' | 'reminder' | 'notification' | 'quote';
}

/**
 * Envoie un email via l'Edge Function send-email
 */
export const sendEmail = async (params: SendEmailParams) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await supabase.functions.invoke('send-email', {
    body: params,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to send email');
  }

  return response.data;
};

/**
 * Envoie un email de confirmation de projet
 */
export const sendProjectConfirmationEmail = async (projectId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Appeler la fonction SQL qui génère et envoie l'email
  const { data, error } = await supabase.rpc('send_project_confirmation_email', {
    p_project_id: projectId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send confirmation email');
  }

  return data;
};

