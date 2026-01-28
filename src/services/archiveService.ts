import { supabase } from '@/integrations/supabase/client';
import { extractUUID } from '@/utils/uuidExtractor';

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
    // Extraire l'UUID valide si l'ID contient un suffixe
    const validUuid = extractUUID(quoteId);
    if (!validUuid) {
      throw new Error("Format d'ID de devis invalide");
    }

    const { error } = await supabase
      .from('ai_quotes')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', validUuid); // Utiliser l'UUID extrait

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
    // Extraire l'UUID valide si l'ID contient un suffixe
    const validUuid = extractUUID(quoteId);
    if (!validUuid) {
      throw new Error("Format d'ID de devis invalide");
    }

    const { error } = await supabase
      .from('ai_quotes')
      .update({ archived: false, archived_at: null })
      .eq('id', validUuid); // Utiliser l'UUID extrait

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
export async function archiveClient(clientId: string, userId: string): Promise<void> {
  try {
    // Récupérer company_id pour isolation multi-tenant
    const { getCompanyIdForUser } = await import("@/utils/companyHelpers");
    const companyId = await getCompanyIdForUser(userId);
    if (!companyId) {
      throw new Error("User must be a member of a company");
    }

    const { error } = await supabase
      .from('clients')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', clientId)
      .eq('company_id', companyId);

    if (error) throw error;
  } catch (error) {
    console.error('Error archiving client:', error);
    throw error;
  }
}

/**
 * Désarchive un client
 */
export async function unarchiveClient(clientId: string, userId: string): Promise<void> {
  try {
    // Récupérer company_id pour isolation multi-tenant
    const { getCompanyIdForUser } = await import("@/utils/companyHelpers");
    const companyId = await getCompanyIdForUser(userId);
    if (!companyId) {
      throw new Error("User must be a member of a company");
    }

    const { error } = await supabase
      .from('clients')
      .update({ archived: false, archived_at: null })
      .eq('id', clientId)
      .eq('company_id', companyId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unarchiving client:', error);
    throw error;
  }
}














