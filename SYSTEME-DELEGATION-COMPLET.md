# 🔐 SYSTÈME DE DÉLÉGATION TEMPORAIRE DE PERMISSIONS

## 📋 RÉSUMÉ

Système complet de délégation temporaire permettant à un utilisateur autorisé de déléguer certaines permissions à un autre utilisateur pour une durée limitée, **sans modifier les rôles existants**.

---

## ✅ FONCTIONNALITÉS IMPLÉMENTÉES

### **1. Base de données**
- ✅ Table `delegations` avec tous les champs requis
- ✅ Indexes pour performance
- ✅ Contraintes de sécurité (dates valides, utilisateurs différents, permissions non-critiques)
- ✅ RLS activé avec policies strictes

### **2. Fonctions SQL**
- ✅ `can_delegate_permission()` - Vérifie si un utilisateur peut déléguer
- ✅ `get_active_delegated_permissions()` - Récupère les délégations actives
- ✅ `get_user_effective_permissions()` - Permissions effectives (rôle + délégations)
- ✅ `check_user_effective_permission()` - Vérifie une permission effective
- ✅ `revoke_delegation()` - Révoque une délégation
- ✅ `expire_delegations()` - Expiration automatique (pour cron)

### **3. Intégration RBAC**
- ✅ `get_user_permissions()` utilise maintenant les permissions effectives
- ✅ `check_user_permission()` vérifie maintenant les délégations
- ✅ Toutes les vérifications incluent automatiquement les délégations

### **4. Hooks React**
- ✅ `useDelegations()` - Liste toutes les délégations
- ✅ `useUserDelegations()` - Délégations d'un utilisateur spécifique
- ✅ `useCreateDelegation()` - Créer une délégation
- ✅ `useRevokeDelegation()` - Révoquer une délégation

### **5. Interface utilisateur**
- ✅ Page `/delegations` pour gérer les délégations
- ✅ Formulaire de création avec validation
- ✅ Liste des délégations avec statuts (active, expirée, révoquée, en attente)
- ✅ Bouton de révocation pour les délégations actives
- ✅ Badges visuels pour les statuts

### **6. Sécurité**
- ✅ OWNER peut déléguer toutes les permissions (sauf critiques)
- ✅ Autres utilisateurs : peuvent déléguer uniquement leurs propres permissions
- ✅ Impossible de déléguer des permissions critiques (company.delete, roles.*, users.delete)
- ✅ Impossible de se déléguer à soi-même
- ✅ RLS strict avec isolation par entreprise
- ✅ Audit logs pour toutes les actions

---

## 🚀 INSTALLATION

### **Étape 1 : Exécuter les migrations SQL**

#### **Script 14 : Créer le système de délégation**

[**supabase/migrations/20260105000014_create_delegations_system.sql**](supabase/migrations/20260105000014_create_delegations_system.sql)

**Ce qu'il fait :**
- Crée la table `delegations`
- Crée toutes les fonctions SQL
- Active RLS avec policies
- Crée la vue `active_delegations`

#### **Script 15 : Intégrer dans RBAC**

[**supabase/migrations/20260105000015_update_rbac_with_delegations.sql**](supabase/migrations/20260105000015_update_rbac_with_delegations.sql)

**Ce qu'il fait :**
- Met à jour `get_user_permissions()` pour utiliser les permissions effectives
- Met à jour `check_user_permission()` pour vérifier les délégations

**Comment exécuter :**
1. Va dans **Supabase SQL Editor**
2. Exécute le **Script 14** puis le **Script 15**
3. Vérifie qu'il n'y a pas d'erreurs

---

## 📖 UTILISATION

### **Créer une délégation**

1. **Va sur la page `/delegations`**
2. **Clique sur "Créer une délégation"**
3. **Remplis le formulaire :**
   - Utilisateur bénéficiaire
   - Permission à déléguer
   - Date de début
   - Date de fin
   - Raison (optionnel)
4. **Clique sur "Créer la délégation"**

### **Révoquer une délégation**

1. **Va sur la page `/delegations`**
2. **Trouve la délégation active**
3. **Clique sur "Révoquer"**
4. **Confirme la révocation**

### **Vérifier les permissions effectives**

Les permissions effectives sont automatiquement calculées dans :
- `usePermissions()` hook
- Toutes les vérifications RBAC
- Les guards de routes
- Les composants `PermissionGate`

**Aucun changement de code nécessaire !** Le système utilise automatiquement les permissions effectives.

---

## 🔒 RÈGLES DE SÉCURITÉ

### **Qui peut déléguer ?**

- **OWNER** : Peut déléguer n'importe quelle permission (sauf critiques)
- **Autres utilisateurs** : Peuvent déléguer uniquement les permissions qu'ils possèdent

### **Permissions non déléguables**

Les permissions suivantes **ne peuvent jamais être déléguées** :
- `company.delete.*` - Suppression d'entreprise
- `roles.*` - Gestion des rôles
- `users.delete.*` - Suppression d'utilisateurs

### **Contraintes**

- ✅ Impossible de se déléguer à soi-même
- ✅ Date de fin > Date de début
- ✅ Délégation limitée dans le temps (obligatoire)
- ✅ Isolation par entreprise (RLS)

---

## 📊 STRUCTURE DE LA TABLE

```sql
CREATE TABLE delegations (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  from_user_id UUID NOT NULL,  -- Délégant
  to_user_id UUID NOT NULL,     -- Bénéficiaire
  permission_key TEXT NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,         -- NULL si active
  reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎯 PERMISSIONS DÉLÉGABLES

Par défaut, ces permissions peuvent être déléguées :

- `planning.read`, `planning.create`, `planning.update`
- `employees.read`
- `invoices.read`, `invoices.send`
- `payments.read`
- `clients.read`, `clients.create`, `clients.update`
- `projects.read`, `projects.create`, `projects.update`
- `quotes.read`, `quotes.create`, `quotes.send`

**Note :** La liste complète est dans `DelegationsManagement.tsx` dans `DELEGATABLE_PERMISSIONS`.

---

## 🔄 EXPIRATION AUTOMATIQUE

Les délégations expirent automatiquement à la date de fin. Pour marquer les expirations :

1. **Créer un cron job Supabase** (optionnel, pour logs)
2. **Appeler `expire_delegations()`** périodiquement

**Note :** Les délégations expirées ne sont pas prises en compte automatiquement dans les vérifications (grâce à `ends_at > now()`).

---

## 📝 AUDIT LOGS

Toutes les actions sont enregistrées dans `audit_logs` :

- `delegation.created` - Création d'une délégation
- `delegation.revoked` - Révocation d'une délégation

---

## 🧪 TESTER

### **Test 1 : Créer une délégation**

1. Connecte-toi en tant qu'OWNER
2. Va sur `/delegations`
3. Crée une délégation pour un autre utilisateur
4. Vérifie qu'elle apparaît dans la liste

### **Test 2 : Vérifier les permissions effectives**

1. Connecte-toi avec l'utilisateur bénéficiaire
2. Vérifie que la permission déléguée est disponible
3. Teste l'action correspondante (ex: lire le planning)

### **Test 3 : Révoquer une délégation**

1. Retourne sur `/delegations` en tant qu'OWNER
2. Révoque la délégation
3. Vérifie que l'utilisateur bénéficiaire n'a plus la permission

---

## 🛠️ TROUBLESHOOTING

### **Erreur "Vous n'avez pas le droit de déléguer cette permission"**

→ Vérifie que tu as la permission que tu veux déléguer (ou que tu es OWNER)

### **Erreur "Vous ne pouvez pas vous déléguer à vous-même"**

→ Sélectionne un autre utilisateur que toi-même

### **La délégation n'apparaît pas dans les permissions**

→ Vérifie que :
- La date de début est passée
- La date de fin n'est pas passée
- La délégation n'est pas révoquée
- Tu es dans la bonne entreprise

### **Erreur SQL lors de l'exécution**

→ Vérifie que :
- Le Script 14 a été exécuté avant le Script 15
- La fonction `current_company_id()` existe
- La table `audit_logs` existe

---

## 📚 DOCUMENTATION TECHNIQUE

### **Fonctions SQL**

- `get_user_effective_permissions(user_id, company_id)` → `TEXT[]`
- `check_user_effective_permission(user_id, company_id, permission)` → `BOOLEAN`
- `can_delegate_permission(delegator_id, company_id, permission)` → `BOOLEAN`
- `get_active_delegated_permissions(user_id, company_id)` → `TEXT[]`
- `revoke_delegation(delegation_id, revoker_id)` → `BOOLEAN`
- `expire_delegations()` → `INTEGER`

### **Hooks React**

- `useDelegations()` - Liste toutes les délégations
- `useUserDelegations(userId)` - Délégations d'un utilisateur
- `useCreateDelegation()` - Créer une délégation
- `useRevokeDelegation()` - Révoquer une délégation

### **Routes**

- `/delegations` - Page de gestion des délégations

---

## 🎉 RÉSULTAT

✅ **Système de délégation temporaire complet et sécurisé**
✅ **Intégration transparente avec le RBAC existant**
✅ **Interface utilisateur professionnelle**
✅ **Audit logs pour traçabilité**
✅ **Expiration automatique**
✅ **Contrôle total pour le patron**

---

**🔥 EXÉCUTE LES SCRIPTS 14 ET 15 POUR ACTIVER LE SYSTÈME ! 🔥**
