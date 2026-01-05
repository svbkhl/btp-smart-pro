# 🔥 EXÉCUTER LES SCRIPTS DE DÉLÉGATION MAINTENANT

## 📋 ORDRE D'EXÉCUTION (4 SCRIPTS)

Exécute les scripts **DANS L'ORDRE** ci-dessous. Clique sur chaque lien pour ouvrir le script, puis copie-colle dans Supabase SQL Editor.

---

## 1️⃣ SCRIPT 14 : Créer le système de délégation

**📄 [supabase/migrations/20260105000014_create_delegations_system.sql](supabase/migrations/20260105000014_create_delegations_system.sql)**

**Ce qu'il fait :**
- ✅ Crée la table `delegations`
- ✅ Crée toutes les fonctions SQL (6 fonctions)
- ✅ Active RLS avec policies strictes
- ✅ Crée la vue `active_delegations`

**Comment l'exécuter :**
1. **Clique sur le lien rose** ci-dessus
2. **Copie TOUT** (Cmd+A puis Cmd+C)
3. **Va dans Supabase Dashboard** → SQL Editor
4. **Colle et clique sur "Run"**

**Résultat attendu :**
```
✅ Table delegations créée
✅ Indexes créés pour performance
✅ Fonctions SQL créées
✅ RLS activé avec policies strictes
✅ Vue active_delegations créée

🎉 SYSTÈME DE DÉLÉGATION CRÉÉ !
```

---

## 2️⃣ SCRIPT 15 : Intégrer dans RBAC

**📄 [supabase/migrations/20260105000015_update_rbac_with_delegations.sql](supabase/migrations/20260105000015_update_rbac_with_delegations.sql)**

**Ce qu'il fait :**
- ✅ Met à jour `get_user_permissions()` pour utiliser les permissions effectives
- ✅ Met à jour `check_user_permission()` pour vérifier les délégations

**Comment l'exécuter :**
1. **Clique sur le lien rose** ci-dessus
2. **Copie TOUT** (Cmd+A puis Cmd+C)
3. **Va dans Supabase Dashboard** → SQL Editor
4. **Colle et clique sur "Run"**

**Résultat attendu :**
```
✅ RBAC MIS À JOUR AVEC DÉLÉGATIONS
✅ get_user_permissions() utilise maintenant les permissions effectives
✅ check_user_permission() vérifie maintenant les délégations
```

---

## 3️⃣ SCRIPT 2 (MISE À JOUR) : Ajouter les permissions

**📄 [supabase/migrations/20260105000002_seed_permissions.sql](supabase/migrations/20260105000002_seed_permissions.sql)**

**Ce qu'il fait :**
- ✅ Ajoute `delegations.read` dans les permissions
- ✅ Ajoute `delegations.manage` dans les permissions

**⚠️ IMPORTANT :**
- Si tu as **déjà exécuté** ce script avant, exécute juste cette partie :

```sql
-- Ajouter les permissions de délégation
INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('delegations.read', 'delegations', 'read', 'Voir les délégations temporaires', 'users'),
('delegations.manage', 'delegations', 'manage', 'Gérer les délégations temporaires', 'users')
ON CONFLICT (key) DO NOTHING;
```

- Si tu **n'as pas encore exécuté** ce script, exécute-le en entier.

**Comment l'exécuter :**
1. **Clique sur le lien rose** ci-dessus
2. **Copie TOUT** (Cmd+A puis Cmd+C)
3. **Va dans Supabase Dashboard** → SQL Editor
4. **Colle et clique sur "Run"**

---

## 4️⃣ SCRIPT 16 : Ajouter aux rôles existants

**📄 [supabase/migrations/20260105000016_add_delegations_permission.sql](supabase/migrations/20260105000016_add_delegations_permission.sql)**

**Ce qu'il fait :**
- ✅ Ajoute `delegations.manage` à tous les rôles OWNER existants
- ✅ Ajoute `delegations.read` aux rôles qui ont `users.read`

**Comment l'exécuter :**
1. **Clique sur le lien rose** ci-dessus
2. **Copie TOUT** (Cmd+A puis Cmd+C)
3. **Va dans Supabase Dashboard** → SQL Editor
4. **Colle et clique sur "Run"**

**Résultat attendu :**
```
✅ PERMISSIONS DELEGATIONS AJOUTÉES
✅ X rôles avec delegations.manage
✅ X rôles avec delegations.read
🔒 Les OWNER peuvent maintenant gérer les délégations
```

---

## ✅ VÉRIFICATION APRÈS EXÉCUTION

### **1. Vérifier que la table existe**

Exécute ce script dans Supabase SQL Editor :

```sql
SELECT 
  'delegations' as table_name,
  COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'delegations';
```

**Résultat attendu :** `row_count = 1` (la table existe)

### **2. Vérifier que les fonctions existent**

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'can_delegate_permission',
  'get_active_delegated_permissions',
  'get_user_effective_permissions',
  'check_user_effective_permission',
  'revoke_delegation',
  'expire_delegations'
)
ORDER BY routine_name;
```

**Résultat attendu :** 6 fonctions listées

### **3. Vérifier que les permissions existent**

```sql
SELECT key, description
FROM public.permissions
WHERE key LIKE 'delegations.%'
ORDER BY key;
```

**Résultat attendu :**
- `delegations.read`
- `delegations.manage`

### **4. Vérifier que OWNER a la permission**

```sql
SELECT 
  r.name as role_name,
  p.key as permission_key
FROM public.roles r
JOIN public.role_permissions rp ON rp.role_id = r.id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE r.slug = 'owner'
AND p.key = 'delegations.manage';
```

**Résultat attendu :** 1 ligne (OWNER a la permission)

---

## 🧪 TESTER L'INTERFACE

### **1. Vérifier le lien dans le Sidebar**

1. **Connecte-toi en tant qu'OWNER**
2. **Regarde le Sidebar** → Section "Paramètres"
3. **Tu devrais voir :**
   - ⚙️ Paramètres
   - 🛡️ Rôles
   - 👥 Utilisateurs
   - 🔐 Délégations ← **NOUVEAU !**

### **2. Accéder à la page**

1. **Clique sur "Délégations"** dans le Sidebar
2. **Tu devrais voir la page** `/delegations`
3. **Tu devrais voir le bouton** "Créer une délégation"

### **3. Créer une délégation test**

1. **Clique sur "Créer une délégation"**
2. **Remplis le formulaire :**
   - Utilisateur : Sélectionne un autre utilisateur
   - Permission : `planning.read`
   - Date début : Aujourd'hui
   - Date fin : Dans 7 jours
3. **Clique sur "Créer la délégation"**
4. **Tu devrais voir** la délégation dans la liste avec le statut "Active"

---

## 🛠️ SI PROBLÈME

### **Erreur "relation does not exist: delegations"**

→ Le Script 14 n'a pas été exécuté ou a échoué. Réexécute-le.

### **Erreur "function does not exist: get_user_effective_permissions"**

→ Le Script 15 n'a pas été exécuté. Réexécute-le.

### **Le lien "Délégations" n'apparaît pas**

→ Vérifie que :
- Tu es connecté en tant qu'OWNER
- Le Script 16 a été exécuté
- Rafraîchis la page (Cmd+R)

### **Erreur "permission denied"**

→ Vérifie que :
- Les RLS policies sont activées (Script 14)
- Tu es dans la bonne entreprise
- Tu as les permissions nécessaires

---

## 📊 RÉCAPITULATIF

**Scripts à exécuter :**
1. ✅ Script 14 : Créer le système
2. ✅ Script 15 : Intégrer RBAC
3. ✅ Script 2 : Ajouter permissions
4. ✅ Script 16 : Ajouter aux rôles

**Temps estimé :** 5 minutes

**Résultat :**
✅ Système de délégation 100% fonctionnel
✅ Interface accessible dans le Sidebar
✅ Permissions correctement assignées

---

**🔥 EXÉCUTE LES 4 SCRIPTS DANS L'ORDRE ET TESTE ! 🔥**
