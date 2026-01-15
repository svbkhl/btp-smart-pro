/**
 * Helpers d'authentification pour Edge Functions
 * Standardise la vérification des tokens et des permissions
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createErrorResponse, ErrorCode, createHttpResponse } from "./errors.ts";

export interface AuthResult {
  success: boolean;
  user?: { id: string; email?: string };
  error?: string;
  status?: number;
}

/**
 * Vérifie l'authentification d'une requête
 * Retourne l'utilisateur si authentifié, sinon une erreur
 */
export async function verifyAuth(
  req: Request,
  supabaseUrl: string,
  supabaseKey: string
): Promise<AuthResult> {
  try {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return {
        success: false,
        error: "Token d'authentification manquant",
        status: 401,
      };
    }

    const token = authHeader.replace("Bearer ", "");
    
    if (!token || token === "Bearer") {
      return {
        success: false,
        error: "Token invalide",
        status: 401,
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        success: false,
        error: "Token invalide ou expiré",
        status: 401,
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Erreur lors de la vérification de l'authentification",
      status: 500,
    };
  }
}

/**
 * Vérifie que l'utilisateur est admin
 */
export async function verifyAdmin(
  req: Request,
  supabaseUrl: string,
  supabaseKey: string
): Promise<AuthResult> {
  const authResult = await verifyAuth(req, supabaseUrl, supabaseKey);
  
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: "Impossible de vérifier les permissions",
        status: 500,
      };
    }

    const isAdmin = roleData?.role === "admin" || roleData?.role === "dirigeant";
    
    if (!isAdmin) {
      return {
        success: false,
        error: "Accès refusé : droits administrateur requis",
        status: 403,
      };
    }

    return authResult;
  } catch (error) {
    return {
      success: false,
      error: "Erreur lors de la vérification des permissions",
      status: 500,
    };
  }
}

/**
 * Vérifie que l'utilisateur est membre d'une company
 * Retourne le company_id si l'utilisateur est membre
 */
export interface CompanyAuthResult extends AuthResult {
  companyId?: string;
  userRole?: 'owner' | 'admin' | 'member';
}

export async function verifyCompanyMember(
  req: Request,
  supabaseUrl: string,
  supabaseKey: string,
  companyId?: string
): Promise<CompanyAuthResult> {
  const authResult = await verifyAuth(req, supabaseUrl, supabaseKey);
  
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Si companyId fourni, vérifier que l'user est membre
    if (companyId) {
      const { data: membership, error } = await supabase
        .from("company_users")
        .select("company_id, role")
        .eq("user_id", authResult.user.id)
        .eq("company_id", companyId)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        return {
          success: false,
          error: "Impossible de vérifier l'appartenance à l'entreprise",
          status: 500,
        };
      }

      if (!membership) {
        return {
          success: false,
          error: "Vous n'êtes pas membre de cette entreprise",
          status: 403,
        };
      }

      return {
        ...authResult,
        companyId: membership.company_id,
        userRole: membership.role as 'owner' | 'admin' | 'member',
      };
    }

    // Sinon, récupérer la première company de l'user
    const { data: membership, error } = await supabase
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", authResult.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: "Impossible de récupérer l'entreprise",
        status: 500,
      };
    }

    if (!membership) {
      return {
        success: false,
        error: "Vous n'êtes membre d'aucune entreprise",
        status: 403,
      };
    }

    return {
      ...authResult,
      companyId: membership.company_id,
      userRole: membership.role as 'owner' | 'admin' | 'member',
    };
  } catch (error) {
    return {
      success: false,
      error: "Erreur lors de la vérification de l'entreprise",
      status: 500,
    };
  }
}

/**
 * Vérifie que l'utilisateur est owner ou admin d'une company
 */
export async function verifyCompanyAdmin(
  req: Request,
  supabaseUrl: string,
  supabaseKey: string,
  companyId?: string
): Promise<CompanyAuthResult> {
  const companyResult = await verifyCompanyMember(req, supabaseUrl, supabaseKey, companyId);
  
  if (!companyResult.success || !companyResult.companyId) {
    return companyResult;
  }

  if (companyResult.userRole !== 'owner' && companyResult.userRole !== 'admin') {
    return {
      success: false,
      error: "Accès refusé : droits administrateur ou propriétaire requis",
      status: 403,
    };
  }

  return companyResult;
}

/**
 * Crée une réponse HTTP d'erreur d'authentification
 */
export function createAuthErrorResponse(authResult: AuthResult): Response {
  const status = authResult.status || 401;
  const errorResponse = createErrorResponse(
    authResult.error || "Non autorisé",
    status === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN
  );
  return createHttpResponse(errorResponse, status);
}



