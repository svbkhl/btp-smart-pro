/**
 * Helpers pour la gestion multi-tenant (companies)
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Récupère le company_id de l'utilisateur actuel
 * Retourne le premier company_id actif si l'utilisateur appartient à plusieurs companies
 */
export async function getCurrentCompanyId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.company_id;
  } catch (error) {
    console.error('Error fetching company_id:', error);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur est membre d'une company
 */
export async function isCompanyMember(
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('company_users')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking company membership:', error);
    return false;
  }
}

/**
 * Vérifie si l'utilisateur est owner ou admin d'une company
 */
export async function isCompanyAdmin(
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.role === 'owner' || data.role === 'admin';
  } catch (error) {
    console.error('Error checking company admin:', error);
    return false;
  }
}
