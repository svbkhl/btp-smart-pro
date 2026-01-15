/**
 * Safe Supabase query helpers
 * Prevents crashes from .single() when 0 or 2+ results
 */

import { PostgrestSingleResponse } from '@supabase/supabase-js';

/**
 * Safely get a single result, returning null if not found
 * Use this instead of .single() when the result might not exist
 */
export async function safeSingle<T>(
  query: Promise<PostgrestSingleResponse<T>>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await query;
    
    // If error is "PGRST116" (not found), return null data instead of error
    if (result.error?.code === 'PGRST116') {
      return { data: null, error: null };
    }
    
    return result;
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get single result or throw if not found
 * Use this when the result MUST exist (e.g., authenticated user's own data)
 */
export async function requireSingle<T>(
  query: Promise<PostgrestSingleResponse<T>>,
  errorMessage: string = 'Record not found'
): Promise<T> {
  const result = await query;
  
  if (result.error || !result.data) {
    throw new Error(result.error?.message || errorMessage);
  }
  
  return result.data;
}
