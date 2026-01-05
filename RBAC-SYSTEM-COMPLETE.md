# 🔐 SYSTÈME RBAC (Role-Based Access Control) PROFESSIONNEL

## 📋 OBJECTIF

Mettre en place un système de **gestion des rôles et permissions (RBAC)** robuste, sécurisé et évolutif, permettant au **patron** de contrôler précisément les accès de ses **employés**.

---

## 🎯 PRINCIPES FONDAMENTAUX

```
┌─────────────────────────────────────────────────────────────┐
│                   PRINCIPES RBAC                             │
└─────────────────────────────────────────────────────────────┘

✅ Une entreprise = un patron (OWNER)
✅ Le patron a le contrôle total
✅ Les employés n'ont que les permissions autorisées
✅ Aucun accès implicite ou global
✅ Sécurité backend-first (jamais uniquement frontend)
✅ Isolation stricte par company_id
```

---

## 👥 RÔLES SYSTÈME

### 1️⃣ OWNER (Patron)

**Droits** : TOUS les droits sans exception

```typescript
const OWNER_PERMISSIONS = [
  // Entreprise
  'company.read',
  'company.update',
  'company.delete',
  'company.settings',
  
  // Utilisateurs
  'users.read',
  'users.invite',
  'users.update',
  'users.delete',
  'users.update_role',
  
  // Rôles
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  
  // Clients
  'clients.read',
  'clients.create',
  'clients.update',
  'clients.delete',
  
  // Devis
  'quotes.read',
  'quotes.create',
  'quotes.update',
  'quotes.delete',
  'quotes.send',
  
  // Factures
  'invoices.read',
  'invoices.create',
  'invoices.update',
  'invoices.delete',
  'invoices.send',
  
  // Paiements
  'payments.read',
  'payments.create',
  'payments.refund',
  
  // Planning
  'planning.read',
  'planning.create',
  'planning.update',
  'planning.delete',
  
  // Messages
  'messages.read',
  'messages.send',
  'messages.delete',
  
  // Audit logs
  'audit.read',
];
```

### 2️⃣ ADMIN (Administrateur)

**Droits** : Élevés mais limités

```typescript
const ADMIN_PERMISSIONS = [
  // Entreprise (lecture seule)
  'company.read',
  'company.update', // Peut modifier certains paramètres
  // ❌ PAS company.delete
  // ❌ PAS company.settings (paramètres critiques)
  
  // Utilisateurs
  'users.read',
  'users.invite',
  'users.update',
  // ❌ PAS users.delete
  // ❌ PAS users.update_role
  
  // Clients
  'clients.read',
  'clients.create',
  'clients.update',
  'clients.delete',
  
  // Devis
  'quotes.read',
  'quotes.create',
  'quotes.update',
  'quotes.delete',
  'quotes.send',
  
  // Factures
  'invoices.read',
  'invoices.create',
  'invoices.update',
  'invoices.delete',
  'invoices.send',
  
  // Paiements (lecture seule)
  'payments.read',
  // ❌ PAS payments.create
  // ❌ PAS payments.refund
  
  // Planning
  'planning.read',
  'planning.create',
  'planning.update',
  'planning.delete',
  
  // Messages
  'messages.read',
  'messages.send',
];
```

### 3️⃣ RH (Ressources Humaines)

**Droits** : Gestion du personnel uniquement

```typescript
const RH_PERMISSIONS = [
  // Entreprise (lecture seule)
  'company.read',
  
  // Utilisateurs (gestion RH)
  'users.read',
  'users.update', // Peut modifier infos employés
  // ❌ PAS users.invite
  // ❌ PAS users.delete
  // ❌ PAS users.update_role
  
  // Planning (gestion complète)
  'planning.read',
  'planning.create',
  'planning.update',
  'planning.delete',
  
  // Congés & absences
  'leaves.read',
  'leaves.create',
  'leaves.update',
  'leaves.approve',
  
  // ❌ PAS DE clients
  // ❌ PAS DE quotes
  // ❌ PAS DE invoices
  // ❌ PAS DE payments
  
  // Messages (communication interne)
  'messages.read',
  'messages.send',
];
```

### 4️⃣ EMPLOYÉ (Employee)

**Droits** : Accès strictement personnel

```typescript
const EMPLOYEE_PERMISSIONS = [
  // Entreprise (lecture seule)
  'company.read',
  
  // Utilisateurs (lecture seule)
  'users.read', // Peut voir ses collègues
  
  // Planning (personnel uniquement)
  'planning.read', // Son propre planning
  'planning.update', // Peut modifier ses disponibilités
  
  // Congés (personnel)
  'leaves.read', // Ses propres congés
  'leaves.create', // Peut demander un congé
  
  // Messages
  'messages.read',
  'messages.send',
  
  // ❌ PAS DE clients
  // ❌ PAS DE quotes
  // ❌ PAS DE invoices
  // ❌ PAS DE payments
];
```

---

## 🔑 SYSTÈME DE PERMISSIONS

### Architecture des permissions

```typescript
// Types
type PermissionResource = 
  | 'company' 
  | 'users' 
  | 'roles' 
  | 'clients' 
  | 'quotes' 
  | 'invoices' 
  | 'payments' 
  | 'planning' 
  | 'messages' 
  | 'audit'
  | 'leaves';

type PermissionAction = 
  | 'read' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'send' 
  | 'refund' 
  | 'approve'
  | 'settings'
  | 'invite'
  | 'update_role';

type Permission = `${PermissionResource}.${PermissionAction}`;

// Exemples
const permission1: Permission = 'users.invite';
const permission2: Permission = 'invoices.send';
const permission3: Permission = 'payments.refund';
```

### Liste complète des permissions

```typescript
export const ALL_PERMISSIONS: Permission[] = [
  // Company
  'company.read',
  'company.update',
  'company.delete',
  'company.settings',
  
  // Users
  'users.read',
  'users.invite',
  'users.update',
  'users.delete',
  'users.update_role',
  
  // Roles
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  
  // Clients
  'clients.read',
  'clients.create',
  'clients.update',
  'clients.delete',
  
  // Quotes
  'quotes.read',
  'quotes.create',
  'quotes.update',
  'quotes.delete',
  'quotes.send',
  
  // Invoices
  'invoices.read',
  'invoices.create',
  'invoices.update',
  'invoices.delete',
  'invoices.send',
  
  // Payments
  'payments.read',
  'payments.create',
  'payments.refund',
  
  // Planning
  'planning.read',
  'planning.create',
  'planning.update',
  'planning.delete',
  
  // Leaves
  'leaves.read',
  'leaves.create',
  'leaves.update',
  'leaves.approve',
  
  // Messages
  'messages.read',
  'messages.send',
  'messages.delete',
  
  // Audit
  'audit.read',
];
```

---

## 🗄️ SCHÉMA BASE DE DONNÉES

### Table `roles`

```sql
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entreprise
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Informations du rôle
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- 'owner', 'admin', 'rh', 'employee'
  description TEXT,
  
  -- Type
  is_system BOOLEAN NOT NULL DEFAULT false, -- Rôles système (non supprimables)
  is_default BOOLEAN NOT NULL DEFAULT false, -- Rôle par défaut pour nouveaux employés
  
  -- Métadonnées
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'user',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  UNIQUE(company_id, slug),
  UNIQUE(company_id, name)
);

-- Index
CREATE INDEX idx_roles_company_id ON public.roles(company_id);
CREATE INDEX idx_roles_slug ON public.roles(slug);
```

### Table `permissions`

```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Clé unique de la permission
  key TEXT NOT NULL UNIQUE, -- 'users.invite', 'invoices.send'
  
  -- Informations
  resource TEXT NOT NULL, -- 'users', 'invoices'
  action TEXT NOT NULL,   -- 'invite', 'send'
  description TEXT,
  
  -- Catégorie (pour UI)
  category TEXT NOT NULL, -- 'company', 'business', 'hr', 'communication'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  UNIQUE(resource, action)
);

-- Index
CREATE INDEX idx_permissions_category ON public.permissions(category);
CREATE INDEX idx_permissions_key ON public.permissions(key);
```

### Table `role_permissions`

```sql
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  UNIQUE(role_id, permission_id)
);

-- Index
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);
```

### Mise à jour de `company_users`

```sql
-- Ajouter colonne role_id
ALTER TABLE public.company_users
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_company_users_role_id ON public.company_users(role_id);

-- Note : la colonne 'role' (TEXT) reste pour compatibilité,
-- mais role_id devient la référence principale
```

### Mise à jour de `invitations`

```sql
-- Ajouter colonne role_id
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_invitations_role_id ON public.invitations(role_id);

-- Note : la colonne 'role' (TEXT) reste pour compatibilité
```

### Table `audit_logs` (nouvellement créée)

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexte
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action
  action TEXT NOT NULL, -- 'user.role_changed', 'user.invited', 'role.created'
  resource_type TEXT NOT NULL, -- 'user', 'role', 'permission'
  resource_id UUID,
  
  -- Détails
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- IP et User Agent
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Index
  CHECK (action <> '')
);

-- Index
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
```

---

## 🛡️ RLS POLICIES

### Policies `roles`

```sql
-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- SELECT : Utilisateurs de la même entreprise
CREATE POLICY "Users can view roles of their company"
ON public.roles FOR SELECT
USING (company_id = public.current_company_id());

-- INSERT : Seulement OWNER
CREATE POLICY "Only owners can create roles"
ON public.roles FOR INSERT
WITH CHECK (
  company_id = public.current_company_id() AND
  EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.current_company_id()
    AND r.slug = 'owner'
  )
);

-- UPDATE : Seulement OWNER, et pas les rôles système
CREATE POLICY "Only owners can update non-system roles"
ON public.roles FOR UPDATE
USING (
  company_id = public.current_company_id() AND
  is_system = false AND
  EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.current_company_id()
    AND r.slug = 'owner'
  )
);

-- DELETE : Seulement OWNER, et pas les rôles système
CREATE POLICY "Only owners can delete non-system roles"
ON public.roles FOR DELETE
USING (
  company_id = public.current_company_id() AND
  is_system = false AND
  EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.current_company_id()
    AND r.slug = 'owner'
  )
);
```

### Policies `permissions`

```sql
-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- SELECT : Tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view all permissions"
ON public.permissions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE : Impossible (géré uniquement par migrations)
-- Pas de policies pour INSERT/UPDATE/DELETE
```

### Policies `role_permissions`

```sql
-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT : Utilisateurs de la même entreprise
CREATE POLICY "Users can view role permissions of their company"
ON public.role_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissions.role_id
    AND r.company_id = public.current_company_id()
  )
);

-- INSERT : Seulement OWNER
CREATE POLICY "Only owners can assign permissions to roles"
ON public.role_permissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissions.role_id
    AND r.company_id = public.current_company_id()
    AND r.is_system = false
  ) AND
  EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.current_company_id()
    AND r.slug = 'owner'
  )
);

-- DELETE : Seulement OWNER
CREATE POLICY "Only owners can remove permissions from roles"
ON public.role_permissions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissions.role_id
    AND r.company_id = public.current_company_id()
    AND r.is_system = false
  ) AND
  EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.current_company_id()
    AND r.slug = 'owner'
  )
);
```

### Policies `audit_logs`

```sql
-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT : Seulement OWNER
CREATE POLICY "Only owners can view audit logs"
ON public.audit_logs FOR SELECT
USING (
  company_id = public.current_company_id() AND
  EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.current_company_id()
    AND r.slug = 'owner'
  )
);

-- INSERT : Service role uniquement (via Edge Functions)
-- Pas de policy publique
```

---

## 🔧 FONCTIONS UTILITAIRES

### Fonction `get_user_permissions()`

```sql
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid UUID, company_uuid UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  permissions_array TEXT[];
BEGIN
  -- Récupérer toutes les permissions de l'utilisateur
  SELECT ARRAY_AGG(DISTINCT p.key)
  INTO permissions_array
  FROM public.company_users cu
  JOIN public.roles r ON r.id = cu.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE cu.user_id = user_uuid
  AND cu.company_id = company_uuid
  AND cu.status = 'active';
  
  RETURN COALESCE(permissions_array, ARRAY[]::TEXT[]);
END;
$$;
```

### Fonction `check_user_permission()`

```sql
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_uuid UUID, 
  company_uuid UUID, 
  permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur a la permission
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = user_uuid
    AND cu.company_id = company_uuid
    AND cu.status = 'active'
    AND p.key = permission_key
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;
```

### Fonction `is_owner()`

```sql
CREATE OR REPLACE FUNCTION public.is_owner(user_uuid UUID, company_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_owner_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = user_uuid
    AND cu.company_id = company_uuid
    AND cu.status = 'active'
    AND r.slug = 'owner'
  ) INTO is_owner_result;
  
  RETURN COALESCE(is_owner_result, false);
END;
$$;
```

---

## 🎣 HOOKS REACT

### Hook `usePermissions()`

```typescript
// src/hooks/usePermissions.ts
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Permission = string; // 'users.invite', 'invoices.send', etc.

interface UsePermissionsReturn {
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isRH: boolean;
  isEmployee: boolean;
  loading: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, currentCompanyId } = useAuth();

  // Récupérer les permissions de l'utilisateur
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id, currentCompanyId],
    queryFn: async () => {
      if (!user || !currentCompanyId) return [];

      const { data, error } = await supabase.rpc('get_user_permissions', {
        user_uuid: user.id,
        company_uuid: currentCompanyId,
      });

      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }

      return data as Permission[];
    },
    enabled: !!user && !!currentCompanyId,
  });

  // Récupérer le rôle de l'utilisateur
  const { data: roleData } = useQuery({
    queryKey: ['user-role', user?.id, currentCompanyId],
    queryFn: async () => {
      if (!user || !currentCompanyId) return null;

      const { data, error } = await supabase
        .from('company_users')
        .select('role_id, roles(slug)')
        .eq('user_id', user.id)
        .eq('company_id', currentCompanyId)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!user && !!currentCompanyId,
  });

  const roleSlug = roleData?.roles?.slug;

  // Fonctions de vérification
  const can = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const canAny = (perms: Permission[]): boolean => {
    return perms.some(p => permissions.includes(p));
  };

  const canAll = (perms: Permission[]): boolean => {
    return perms.every(p => permissions.includes(p));
  };

  return {
    permissions,
    can,
    canAny,
    canAll,
    isOwner: roleSlug === 'owner',
    isAdmin: roleSlug === 'admin',
    isRH: roleSlug === 'rh',
    isEmployee: roleSlug === 'employee',
    loading: isLoading,
  };
}
```

### Composant `PermissionGate`

```typescript
// src/components/rbac/PermissionGate.tsx
import { ReactNode } from 'react';
import { usePermissions, Permission } from '@/hooks/usePermissions';

interface PermissionGateProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // true = AND, false = OR (default)
  fallback?: ReactNode;
}

export const PermissionGate = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) => {
  const { can, canAll, canAny } = usePermissions();

  // Single permission
  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  // Multiple permissions
  if (permissions) {
    const hasPermission = requireAll 
      ? canAll(permissions) 
      : canAny(permissions);

    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

// Utilisation
<PermissionGate permission="users.invite">
  <Button>Inviter un employé</Button>
</PermissionGate>

<PermissionGate permissions={['quotes.create', 'invoices.create']} requireAll={false}>
  <Button>Créer un document</Button>
</PermissionGate>
```

---

## 🚦 MIDDLEWARE & EDGE FUNCTION

### Edge Function `check-permission`

```typescript
// supabase/functions/check-permission/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer l'utilisateur depuis le JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les paramètres
    const { permission, company_id } = await req.json();

    if (!permission || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing permission or company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier la permission
    const { data: hasPermission, error: permError } = await supabaseClient
      .rpc('check_user_permission', {
        user_uuid: user.id,
        company_uuid: company_id,
        permission_key: permission,
      });

    if (permError) {
      console.error('Permission check error:', permError);
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ has_permission: hasPermission }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 📊 UI/UX - GESTION DES RÔLES

### Page `RolesManagement.tsx`

```tsx
// src/pages/RolesManagement.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Plus, Edit, Trash2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  color: string;
  icon: string;
  _count?: { company_users: number };
}

interface Permission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string;
  category: string;
}

export default function RolesManagement() {
  const { currentCompanyId } = useAuth();
  const { can, isOwner } = usePermissions();
  const queryClient = useQueryClient();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Récupérer les rôles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*, company_users(count)')
        .eq('company_id', currentCompanyId)
        .order('is_system', { ascending: false });

      if (error) throw error;
      return data as Role[];
    },
    enabled: !!currentCompanyId && can('roles.read'),
  });

  // Récupérer toutes les permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category, resource, action');

      if (error) throw error;
      return data as Permission[];
    },
  });

  // Créer un rôle
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: { name: string; description: string; permissions: string[] }) => {
      // Créer le rôle
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .insert({
          company_id: currentCompanyId,
          name: roleData.name,
          slug: roleData.name.toLowerCase().replace(/\s+/g, '_'),
          description: roleData.description,
          is_system: false,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Assigner les permissions
      if (roleData.permissions.length > 0) {
        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(
            roleData.permissions.map(permissionId => ({
              role_id: role.id,
              permission_id: permissionId,
            }))
          );

        if (permError) throw permError;
      }

      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Rôle créé avec succès' });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  if (!can('roles.read')) {
    return (
      <PageLayout
        title="Gestion des rôles"
        subtitle="Accès refusé"
        icon={Shield}
      >
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Gestion des rôles"
      subtitle="Gérer les rôles et permissions de votre entreprise"
      icon={Shield}
      actions={
        can('roles.create') && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un rôle
          </Button>
        )
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${role.color}20` }}
                >
                  <Shield className="h-5 w-5" style={{ color: role.color }} />
                </div>
                <div>
                  <h3 className="font-semibold">{role.name}</h3>
                  {role.is_system && (
                    <Badge variant="secondary" className="mt-1">
                      Système
                    </Badge>
                  )}
                </div>
              </div>

              {!role.is_system && can('roles.update') && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingRole(role)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {can('roles.delete') && (
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {role.description || 'Aucune description'}
            </p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{role._count?.company_users || 0} utilisateur(s)</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog de création (simplifié pour l'exemple) */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau rôle</DialogTitle>
          </DialogHeader>
          {/* Formulaire ici */}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
```

---

## 📝 PLAN D'IMPLÉMENTATION

### Phase 1 : Base de données (3h)
- [x] Créer table `roles`
- [x] Créer table `permissions`
- [x] Créer table `role_permissions`
- [x] Créer table `audit_logs`
- [x] Mettre à jour `company_users` (ajouter `role_id`)
- [x] Mettre à jour `invitations` (ajouter `role_id`)
- [ ] Créer fonctions SQL (`get_user_permissions`, `check_user_permission`, `is_owner`)
- [ ] Créer RLS policies strictes
- [ ] Seed des permissions de base
- [ ] Seed des rôles système

### Phase 2 : Hooks & Services (2h)
- [ ] Créer `usePermissions()` hook
- [ ] Créer `useRoles()` hook
- [ ] Créer composant `PermissionGate`
- [ ] Créer service `auditLogService.ts`

### Phase 3 : Middleware Backend (2h)
- [ ] Créer Edge Function `check-permission`
- [ ] Ajouter vérification permissions dans Edge Functions existantes
- [ ] Tester le middleware

### Phase 4 : UI Gestion des rôles (4h)
- [ ] Créer page `RolesManagement`
- [ ] Créer composant `CreateRoleDialog`
- [ ] Créer composant `EditRoleDialog`
- [ ] Créer composant `RoleCard`
- [ ] Créer composant `PermissionsSelector`

### Phase 5 : UI Gestion des utilisateurs (3h)
- [ ] Mettre à jour `InviteUserDialog` (sélection rôle)
- [ ] Mettre à jour `UsersManagement` (affichage rôles)
- [ ] Créer composant `ChangeRoleDialog`
- [ ] Ajouter filtres par rôle

### Phase 6 : Audit Logs (2h)
- [ ] Créer page `AuditLogs`
- [ ] Logger les actions sensibles
- [ ] Créer filtres et recherche

### Phase 7 : Tests (2h)
- [ ] Tester création/modification/suppression rôles
- [ ] Tester assignation permissions
- [ ] Tester vérification permissions
- [ ] Tester audit logs
- [ ] Tester RLS policies

---

## ⏱️ TEMPS TOTAL

**18 heures** de développement pour un système RBAC complet et professionnel.

---

## 🔐 RÈGLES DE SÉCURITÉ CRITIQUES

1. **JAMAIS de confiance au frontend** : Toujours vérifier les permissions côté backend
2. **RLS policies strictes** : Toutes les tables doivent avoir des RLS policies
3. **Audit obligatoire** : Logger toutes les actions sensibles
4. **Rôles système protégés** : Impossible de supprimer ou modifier les rôles OWNER, ADMIN, RH, EMPLOYEE
5. **Isolation stricte** : Toutes les données filtrées par `company_id`
6. **Owner intouchable** : Seul le owner peut modifier les rôles
7. **Pas d'auto-promotion** : Un utilisateur ne peut jamais changer son propre rôle

---

*Document créé le : 05/01/2026*
*Statut : 🟡 ARCHITECTURE COMPLÈTE - IMPLÉMENTATION EN COURS*
