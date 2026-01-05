/**
 * Service: auditLogService
 * Description: Service pour créer des logs d'audit pour les actions sensibles
 * Usage: Appelé après chaque action sensible (changement de rôle, invitation, etc.)
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  | 'user.role_changed'
  | 'user.invited'
  | 'user.deleted'
  | 'user.suspended'
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'permission.assigned'
  | 'permission.removed'
  | 'company.updated'
  | 'company.deleted';

export type ResourceType = 
  | 'user'
  | 'role'
  | 'permission'
  | 'company';

interface CreateAuditLogParams {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Créer un log d'audit
 * 
 * @param {CreateAuditLogParams} params - Paramètres du log
 * @returns {Promise<void>}
 * 
 * @example
 * await createAuditLog({
 *   action: 'user.role_changed',
 *   resourceType: 'user',
 *   resourceId: userId,
 *   details: {
 *     old_role: 'employee',
 *     new_role: 'admin',
 *     changed_by: currentUser.id,
 *   },
 * });
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    // Récupérer l'utilisateur et l'entreprise actuels
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ [auditLogService] No user found, skipping audit log');
      return;
    }

    // Récupérer le company_id depuis company_users
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!companyUser) {
      console.warn('⚠️ [auditLogService] No company found for user, skipping audit log');
      return;
    }

    // Récupérer l'IP et User Agent (si disponible)
    const ipAddress = await fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => null);

    const userAgent = navigator.userAgent;

    console.log('📝 [auditLogService] Creating audit log:', {
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    });

    // Créer le log d'audit
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        company_id: companyUser.company_id,
        user_id: user.id,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId || null,
        details: params.details || {},
        metadata: params.metadata || {},
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) {
      console.error('❌ [auditLogService] Error creating audit log:', error);
      // Ne pas throw l'erreur pour ne pas bloquer l'action principale
    } else {
      console.log('✅ [auditLogService] Audit log created successfully');
    }
  } catch (error) {
    console.error('❌ [auditLogService] Unexpected error:', error);
    // Ne pas throw l'erreur pour ne pas bloquer l'action principale
  }
}

/**
 * Récupérer les logs d'audit pour une entreprise
 * 
 * @param {string} companyId - ID de l'entreprise
 * @param {object} filters - Filtres optionnels
 * @returns {Promise<any[]>}
 */
export async function getAuditLogs(
  companyId: string,
  filters?: {
    action?: AuditAction;
    resourceType?: ResourceType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  try {
    console.log('📖 [auditLogService] Fetching audit logs:', { companyId, filters });

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id(email, raw_user_meta_data)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [auditLogService] Error fetching audit logs:', error);
      throw error;
    }

    console.log('✅ [auditLogService] Audit logs fetched:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ [auditLogService] Unexpected error:', error);
    throw error;
  }
}

/**
 * Helpers pour créer des logs d'audit spécifiques
 */

export const AuditLogHelpers = {
  /**
   * Logger un changement de rôle
   */
  logRoleChange: async (
    userId: string,
    oldRole: string,
    newRole: string,
    changedBy: string
  ) => {
    await createAuditLog({
      action: 'user.role_changed',
      resourceType: 'user',
      resourceId: userId,
      details: {
        old_role: oldRole,
        new_role: newRole,
        changed_by: changedBy,
      },
    });
  },

  /**
   * Logger une invitation
   */
  logUserInvited: async (
    email: string,
    role: string,
    invitedBy: string
  ) => {
    await createAuditLog({
      action: 'user.invited',
      resourceType: 'user',
      details: {
        email,
        role,
        invited_by: invitedBy,
      },
    });
  },

  /**
   * Logger une suppression d'utilisateur
   */
  logUserDeleted: async (
    userId: string,
    userEmail: string,
    deletedBy: string
  ) => {
    await createAuditLog({
      action: 'user.deleted',
      resourceType: 'user',
      resourceId: userId,
      details: {
        email: userEmail,
        deleted_by: deletedBy,
      },
    });
  },

  /**
   * Logger une création de rôle
   */
  logRoleCreated: async (
    roleId: string,
    roleName: string,
    permissions: string[]
  ) => {
    await createAuditLog({
      action: 'role.created',
      resourceType: 'role',
      resourceId: roleId,
      details: {
        role_name: roleName,
        permissions_count: permissions.length,
        permissions,
      },
    });
  },

  /**
   * Logger une modification de rôle
   */
  logRoleUpdated: async (
    roleId: string,
    roleName: string,
    changes: Record<string, any>
  ) => {
    await createAuditLog({
      action: 'role.updated',
      resourceType: 'role',
      resourceId: roleId,
      details: {
        role_name: roleName,
        changes,
      },
    });
  },

  /**
   * Logger une suppression de rôle
   */
  logRoleDeleted: async (
    roleId: string,
    roleName: string
  ) => {
    await createAuditLog({
      action: 'role.deleted',
      resourceType: 'role',
      resourceId: roleId,
      details: {
        role_name: roleName,
      },
    });
  },
};
