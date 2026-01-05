# 🚀 GUIDE D'ACTIVATION : SYSTÈME DE DÉLÉGATION

## 📋 RÉSUMÉ

Système complet de délégation temporaire de permissions permettant au patron (OWNER) de déléguer temporairement des permissions à d'autres utilisateurs sans modifier leur rôle.

---

## ✅ CE QUI A ÉTÉ CRÉÉ

### **1. Base de données**
- ✅ Table `delegations` avec tous les champs
- ✅ Fonctions SQL pour gestion des délégations
- ✅ RLS policies strictes
- ✅ Vue `active_delegations` avec statuts

### **2. Backend**
- ✅ Intégration dans RBAC (permissions effectives)
- ✅ Vérification automatique des délégations
- ✅ Expiration automatique

### **3. Frontend**
- ✅ Hooks React (`useDelegations`, `useCreateDelegation`, etc.)
- ✅ Page UI `/delegations` complète
- ✅ Lien dans Sidebar (visible pour OWNER)
- ✅ Formulaire de création avec validation

### **4. Sécurité**
- ✅ OWNER peut déléguer toutes permissions (sauf critiques)
- ✅ Autres utilisateurs : uniquement leurs propres permissions
- ✅ Impossible de déléguer permissions critiques
- ✅ Isolation par entreprise (RLS)

---

## 🚀 ACTIVATION (4 SCRIPTS SQL)

### **Ordre d'exécution :**

#### **1️⃣ Script 14 : Créer le système de délégation**

[**supabase/migrations/20260105000014_create_delegations_system.sql**](supabase/migrations/20260105000014_create_delegations_system.sql)

**Ce qu'il fait :**
- Crée la table `delegations`
- Crée toutes les fonctions SQL
- Active RLS avec policies
- Crée la vue `active_delegations`

#### **2️⃣ Script 15 : Intégrer dans RBAC**

[**supabase/migrations/20260105000015_update_rbac_with_delegations.sql**](supabase/migrations/20260105000015_update_rbac_with_delegations.sql)

**Ce qu'il fait :**
- Met à jour `get_user_permissions()` pour utiliser les permissions effectives
- Met à jour `check_user_permission()` pour vérifier les délégations

#### **3️⃣ Script 2 (mise à jour) : Ajouter les permissions**

[**supabase/migrations/20260105000002_seed_permissions.sql**](supabase/migrations/20260105000002_seed_permissions.sql)

**Ce qu'il fait :**
- Ajoute `delegations.read` et `delegations.manage` dans les permissions

**Note :** Si tu as déjà exécuté ce script, exécute juste cette partie :

```sql
INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('delegations.read', 'delegations', 'read', 'Voir les délégations temporaires', 'users'),
('delegations.manage', 'delegations', 'manage', 'Gérer les délégations temporaires', 'users')
ON CONFLICT (key) DO NOTHING;
```

#### **4️⃣ Script 16 : Ajouter aux rôles existants**

[**supabase/migrations/20260105000016_add_delegations_permission.sql**](supabase/migrations/20260105000016_add_delegations_permission.sql)

**Ce qu'il fait :**
- Ajoute `delegations.manage` à tous les rôles OWNER existants
- Ajoute `delegations.read` aux rôles qui ont `users.read`

---

## 📖 COMMENT UTILISER

### **1. Accéder à la page**

1. **Connecte-toi en tant qu'OWNER**
2. **Va dans le Sidebar** → Section "Paramètres"
3. **Clique sur "Délégations"** (icône UserCog)

### **2. Créer une délégation**

1. **Clique sur "Créer une délégation"**
2. **Remplis le formulaire :**
   - **Utilisateur bénéficiaire** : Sélectionne un utilisateur
   - **Permission** : Choisis la permission à déléguer
   - **Date de début** : Quand la délégation commence
   - **Date de fin** : Quand elle expire (obligatoire)
   - **Raison** : Pourquoi cette délégation (optionnel)
3. **Clique sur "Créer la délégation"**

### **3. Révoquer une délégation**

1. **Trouve la délégation active** dans la liste
2. **Clique sur "Révoquer"**
3. **Confirme la révocation**

---

## 🔒 RÈGLES DE SÉCURITÉ

### **Qui peut déléguer ?**

- **OWNER** : Peut déléguer toutes permissions (sauf critiques)
- **Autres utilisateurs** : Peuvent déléguer uniquement leurs propres permissions

### **Permissions non déléguables**

Ces permissions **ne peuvent jamais être déléguées** :
- `company.delete.*` - Suppression d'entreprise
- `roles.*` - Gestion des rôles
- `users.delete.*` - Suppression d'utilisateurs

### **Contraintes**

- ✅ Impossible de se déléguer à soi-même
- ✅ Date de fin > Date de début (obligatoire)
- ✅ Délégation limitée dans le temps
- ✅ Isolation par entreprise (RLS)

---

## 📊 STATUTS DES DÉLÉGATIONS

Les délégations peuvent avoir 4 statuts :

- **🟢 Active** : En cours (starts_at ≤ now < ends_at, non révoquée)
- **🟡 En attente** : Pas encore commencée (starts_at > now)
- **⚪ Expirée** : Date de fin passée (ends_at ≤ now)
- **🔴 Révoquée** : Révoquée manuellement (revoked_at IS NOT NULL)

---

## 🧪 TESTER

### **Test 1 : Créer une délégation**

1. Connecte-toi en tant qu'OWNER
2. Va sur `/delegations`
3. Crée une délégation pour un autre utilisateur
4. Vérifie qu'elle apparaît dans la liste avec le statut "Active"

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

### **Le lien "Délégations" n'apparaît pas dans le Sidebar**

→ Vérifie que :
- Tu es connecté en tant qu'OWNER
- Ou tu as la permission `delegations.manage`
- Le Script 16 a été exécuté

### **Erreur "Vous n'avez pas le droit de déléguer cette permission"**

→ Vérifie que :
- Tu es OWNER (peut tout déléguer sauf critiques)
- Ou tu as la permission que tu veux déléguer

### **La délégation n'apparaît pas dans les permissions**

→ Vérifie que :
- La date de début est passée
- La date de fin n'est pas passée
- La délégation n'est pas révoquée
- Tu es dans la bonne entreprise

### **Erreur SQL lors de l'exécution**

→ Vérifie que :
- Les Scripts 14 et 15 ont été exécutés dans l'ordre
- La fonction `current_company_id()` existe
- La table `audit_logs` existe

---

## 📚 DOCUMENTATION TECHNIQUE

### **Fonctions SQL**

- `get_user_effective_permissions(user_id, company_id)` → Permissions effectives
- `check_user_effective_permission(user_id, company_id, permission)` → Vérifie une permission
- `can_delegate_permission(delegator_id, company_id, permission)` → Peut déléguer ?
- `get_active_delegated_permissions(user_id, company_id)` → Délégations actives
- `revoke_delegation(delegation_id, revoker_id)` → Révoque une délégation

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

**🔥 EXÉCUTE LES 4 SCRIPTS SQL DANS L'ORDRE ET LE SYSTÈME SERA ACTIF ! 🔥**
