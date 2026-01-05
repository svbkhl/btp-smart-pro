# 🚀 GUIDE D'EXÉCUTION - SYSTÈME RBAC

## ✅ CE QUI A ÉTÉ CRÉÉ

### 📄 Documentation
- `RBAC-SYSTEM-COMPLETE.md` - Documentation complète du système RBAC (architecture, rôles, permissions, etc.)
- `ONBOARDING-FLOW-COMPLETE.md` - Flux d'inscription professionnel (OWNER + EMPLOYEE)

### 🗄️ Migrations SQL (à exécuter dans l'ordre)
1. **`20260105000001_create_rbac_system.sql`**
   - Création des tables: `permissions`, `roles`, `role_permissions`, `audit_logs`
   - Ajout de `role_id` à `company_users` et `invitations`
   - Fonctions SQL: `get_user_permissions()`, `check_user_permission()`, `is_owner()`, `get_user_role()`

2. **`20260105000002_seed_permissions.sql`**
   - Insertion de **40+ permissions** atomiques
   - Catégories: company, users, roles, clients, quotes, invoices, payments, planning, leaves, messages, audit

3. **`20260105000003_seed_system_roles.sql`**
   - Création des **4 rôles système**: OWNER, ADMIN, RH, EMPLOYEE
   - Fonction `create_system_roles_for_company()` pour créer les rôles automatiquement
   - Trigger automatique sur création d'entreprise
   - Migration des utilisateurs existants vers `role_id`

4. **`20260105000004_rbac_rls_policies.sql`**
   - RLS policies strictes pour `permissions`, `roles`, `role_permissions`, `audit_logs`
   - Mise à jour des policies sur `company_users` et `invitations`
   - Sécurité: empêche un utilisateur de modifier son propre rôle

### ⚛️ Hooks React
- **`src/hooks/usePermissions.ts`** - Hook pour vérifier les permissions (`can()`, `canAny()`, `canAll()`)
- **`src/hooks/useRoles.ts`** - Hook pour gérer les rôles (CRUD)

### 🛡️ Composants
- **`src/components/rbac/PermissionGate.tsx`** - Composant de garde pour contrôler l'affichage

---

## 🔧 ÉTAPES D'EXÉCUTION

### Étape 1️⃣ : Exécuter les migrations SQL (Supabase)

**Méthode 1 : Via le Dashboard Supabase (recommandé)**

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Copier-coller le contenu de chaque fichier dans l'ordre :

```sql
-- Migration 1/4
-- Copier le contenu de: supabase/migrations/20260105000001_create_rbac_system.sql
-- Cliquer sur "Run"

-- Migration 2/4
-- Copier le contenu de: supabase/migrations/20260105000002_seed_permissions.sql
-- Cliquer sur "Run"

-- Migration 3/4
-- Copier le contenu de: supabase/migrations/20260105000003_seed_system_roles.sql
-- Cliquer sur "Run"

-- Migration 4/4
-- Copier le contenu de: supabase/migrations/20260105000004_rbac_rls_policies.sql
-- Cliquer sur "Run"
```

**Méthode 2 : Via Supabase CLI (local)**

```bash
# Si vous avez Supabase CLI installé localement
npx supabase db push
```

---

### Étape 2️⃣ : Vérifier que tout est OK

**Dans le SQL Editor, exécuter :**

```sql
-- Vérifier les permissions créées
SELECT COUNT(*) AS total_permissions FROM public.permissions;
-- Devrait retourner ~40

-- Vérifier les rôles système créés
SELECT 
  c.name AS company_name, 
  r.name AS role_name, 
  r.slug
FROM public.roles r
JOIN public.companies c ON c.id = r.company_id
WHERE r.is_system = true
ORDER BY c.name, r.slug;
-- Devrait afficher 4 rôles par entreprise: owner, admin, rh, employee

-- Vérifier que les utilisateurs ont un role_id
SELECT 
  u.email,
  c.name AS company_name,
  r.name AS role_name
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
JOIN public.companies c ON c.id = cu.company_id
LEFT JOIN public.roles r ON r.id = cu.role_id
WHERE cu.role_id IS NOT NULL;
-- Tous les utilisateurs actifs devraient avoir un role_id
```

---

### Étape 3️⃣ : Tester les permissions (Frontend)

**Exemple d'utilisation dans un composant :**

```tsx
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/rbac/PermissionGate';

function MyComponent() {
  const { can, isOwner, permissions } = usePermissions();

  console.log('Mes permissions:', permissions);

  return (
    <div>
      {/* Afficher uniquement si permission */}
      <PermissionGate permission="users.invite">
        <Button>Inviter un employé</Button>
      </PermissionGate>

      {/* Vérifier dans le code */}
      {can('invoices.send') && (
        <Button>Envoyer la facture</Button>
      )}

      {/* Vérifier le rôle */}
      {isOwner && (
        <div>Paramètres réservés au patron</div>
      )}
    </div>
  );
}
```

---

## 🎯 RÉSULTAT ATTENDU

Après l'exécution de toutes les migrations, vous aurez :

✅ **4 rôles système par entreprise** :
- **OWNER** (Patron) - Tous les droits
- **ADMIN** (Administrateur) - Droits élevés mais limités
- **RH** (Ressources Humaines) - Gestion du personnel
- **EMPLOYEE** (Employé) - Accès strictement personnel

✅ **40+ permissions atomiques** réparties en catégories :
- Company (4 permissions)
- Users (5 permissions)
- Roles (4 permissions)
- Clients (4 permissions)
- Quotes (5 permissions)
- Invoices (5 permissions)
- Payments (3 permissions)
- Planning (4 permissions)
- Leaves (4 permissions)
- Messages (3 permissions)
- Audit (1 permission)

✅ **Sécurité renforcée** :
- RLS policies strictes sur toutes les tables
- Impossible de modifier son propre rôle
- Seul le OWNER peut créer/modifier/supprimer des rôles
- Audit logs pour toutes les actions sensibles

✅ **Hooks React prêts à l'emploi** :
- `usePermissions()` - Vérifier les permissions
- `useRoles()` - Gérer les rôles
- `<PermissionGate>` - Contrôler l'affichage

---

## 🚨 CE QUI RESTE À FAIRE (OPTIONNEL)

Ces éléments ne sont **PAS obligatoires** pour que le système fonctionne, mais améliorent l'expérience :

### 🔜 Prochaines étapes (à faire plus tard) :

1. **Page de gestion des rôles** (`src/pages/RolesManagement.tsx`)
   - Liste des rôles
   - Création/modification/suppression de rôles
   - Gestion des permissions par rôle

2. **Mise à jour du système d'invitation** (`src/components/admin/InviteUserDialog.tsx`)
   - Ajouter sélection du rôle lors de l'invitation
   - Utiliser `role_id` au lieu de `role` (TEXT)

3. **Page des audit logs** (`src/pages/AuditLogs.tsx`)
   - Consulter l'historique des actions sensibles

4. **Guards de navigation**
   - Bloquer l'accès aux pages selon les permissions
   - Redirection automatique si pas de permission

---

## 📞 SUPPORT

Si vous rencontrez une erreur lors de l'exécution des migrations :

1. **Copier le message d'erreur complet**
2. **Vérifier quelle migration a échoué**
3. **Me partager l'erreur** pour que je puisse corriger

---

*Document créé le : 05/01/2026*
*Statut : ✅ PRÊT À EXÉCUTER*
