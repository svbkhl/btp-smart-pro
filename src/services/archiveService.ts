import { supabase } from '@/integrations/supabase/client';

/**
 * Service pour archiver/désarchiver des éléments
 */

/**
 * Archive un projet
 */
export async function archiveProject(projectId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) throw error;
  } catch (error) {
    console.error('Error archiving project:', error);
    throw error;
  }
}

/**
 * Désarchive un projet
 */
export async function unarchiveProject(projectId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ archived: false, archived_at: null })
      .eq('id', projectId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unarchiving project:', error);
    throw error;
  }
}

/**
 * Archive un devis
 */
export async function archiveQuote(quoteId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_quotes')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', quoteId);

    if (error) throw error;
  } catch (error) {
    console.error('Error archiving quote:', error);
    throw error;
  }
}

/**
 * Désarchive un devis
 */
export async function unarchiveQuote(quoteId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_quotes')
      .update({ archived: false, archived_at: null })
      .eq('id', quoteId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unarchiving quote:', error);
    throw error;
  }
}

/**
 * Archive une facture
 */
export async function archiveInvoice(invoiceId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (error) throw error;
  } catch (error) {
    console.error('Error archiving invoice:', error);
    throw error;
  }
}

/**
 * Désarchive une facture
 */
export async function unarchiveInvoice(invoiceId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ archived: false, archived_at: null })
      .eq('id', invoiceId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unarchiving invoice:', error);
    throw error;
  }
}

/**
 * Archive un client
 */
export async function archiveClient(clientId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('clients')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', clientId);

    if (error) throw error;
  } catch (error) {
    console.error('Error archiving client:', error);
    throw error;
  }
}

/**
 * Désarchive un client
 */
export async function unarchiveClient(clientId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('clients')
      .update({ archived: false, archived_at: null })
      .eq('id', clientId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unarchiving client:', error);
    throw error;
  }
}






