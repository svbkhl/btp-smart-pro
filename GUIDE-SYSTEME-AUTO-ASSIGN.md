# 🚀 SYSTÈME AUTOMATIQUE D'ASSIGNATION - GUIDE COMPLET

## 🎯 Objectif

**Résoudre définitivement** tous les problèmes d'assignation utilisateur-entreprise :
- ✅ Plus jamais d'erreur "Company ID manquant"
- ✅ Plus jamais d'erreur "Pas d'employé trouvé"
- ✅ Assignation automatique à chaque création
- ✅ Synchronisation automatique entre `company_users` et `employees`

---

## 📋 EXÉCUTION (5 MINUTES)

### **Étape 1: Fix immédiat pour vous**

1. Ouvrez **Supabase Dashboard** → **SQL Editor** → **New query**
2. Copiez le contenu de **`FIX-SK-AGENCY-USER-CORRECTED.sql`**
3. Collez et cliquez sur **"Run"**
4. Attendez: `🎉 FIX TERMINÉ AVEC SUCCÈS !`

**Résultat** : Vous êtes maintenant correctement associé à SK Agency ✅

---

### **Étape 2: Installer le système automatique**

1. Toujours dans **SQL Editor** → **New query**
2. Copiez le contenu de **`SYSTEM-AUTO-ASSIGN-USERS-COMPANIES.sql`**
3. Collez et cliquez sur **"Run"**
4. Attendez les messages :

```
🎉 SYSTÈME AUTOMATIQUE INSTALLÉ AVEC SUCCÈS !
✅ Contraintes uniques ajoutées
✅ Fonction auto_assign_user_to_company() créée
✅ Trigger trigger_auto_assign_user_to_company créé
✅ Fonction create_company_and_assign_owner() créée
✅ Migration des données existantes effectuée
```

**Résultat** : Le système automatique est installé pour TOUS les utilisateurs futurs ✅

---

## 🔧 CE QUE LE SYSTÈME FAIT

### **1️⃣ Contraintes uniques**

```sql
-- Sur employees
UNIQUE (user_id, company_id)

-- Sur company_users
UNIQUE (user_id, company_id)
```

**Avantage** : Empêche les doublons, permet `ON CONFLICT`

---

### **2️⃣ Trigger automatique**

**Quand un utilisateur est ajouté à `company_users`** :

```sql
INSERT INTO company_users (user_id, company_id, ...) VALUES (...);
```

**Le trigger crée automatiquement l'entrée dans `employees`** :

```sql
-- Exécuté automatiquement par le trigger
INSERT INTO employees (user_id, company_id, nom, prenom, ...) VALUES (...);
```

---

### **3️⃣ Fonction de création d'entreprise**

```sql
-- Créer une entreprise et assigner l'owner en une seule commande
SELECT create_company_and_assign_owner('Nom Entreprise', 'user-uuid');
```

**Cette fonction** :
1. Crée l'entreprise
2. Associe l'owner dans `company_users`
3. Le trigger crée automatiquement l'entrée dans `employees`

---

### **4️⃣ Migration des données existantes**

Le script migre automatiquement tous les utilisateurs déjà dans `company_users` vers `employees`.

---

## 📊 COMPARAISON AVANT/APRÈS

### **AVANT (Système manuel)**

```sql
-- 1. Créer entreprise
INSERT INTO companies (name, ...) VALUES ('SK Agency', ...);

-- 2. Associer utilisateur
INSERT INTO company_users (user_id, company_id, ...) VALUES (...);

-- 3. ⚠️ OUBLIÉ ! Créer entrée employees
-- → Erreur "Pas d'employé trouvé"
```

---

### **APRÈS (Système automatique)**

```sql
-- 1. Créer entreprise + assigner owner
SELECT create_company_and_assign_owner('SK Agency', 'user-uuid');

-- ✅ Automatique :
-- - Entreprise créée
-- - Owner dans company_users
-- - Owner dans employees (par trigger)
```

OU

```sql
-- Ajouter un nouvel employé
INSERT INTO company_users (user_id, company_id, role_id, status)
VALUES ('new-user-uuid', 'company-uuid', 'role-uuid', 'active');

-- ✅ Automatique :
-- - Ajouté dans employees (par trigger)
```

---

## 🧪 TESTER LE SYSTÈME

### **Test 1 : Ajouter un utilisateur manuellement**

```sql
-- Insérer dans company_users
INSERT INTO company_users (user_id, company_id, role_id, status, created_at)
VALUES (
  'votre-user-uuid',
  'votre-company-uuid',
  (SELECT id FROM roles WHERE slug = 'owner' LIMIT 1),
  'active',
  NOW()
);

-- Vérifier que l'entrée a été créée automatiquement dans employees
SELECT * FROM employees 
WHERE user_id = 'votre-user-uuid' 
AND company_id = 'votre-company-uuid';
```

**Résultat attendu** : ✅ 1 ligne trouvée (créée automatiquement)

---

### **Test 2 : Créer une nouvelle entreprise**

```sql
-- Utiliser la fonction
SELECT create_company_and_assign_owner('Test Company', 'owner-user-uuid');

-- Vérifier dans company_users
SELECT * FROM company_users WHERE user_id = 'owner-user-uuid';

-- Vérifier dans employees
SELECT * FROM employees WHERE user_id = 'owner-user-uuid';
```

**Résultat attendu** : ✅ Présent dans les deux tables

---

## 🔍 VÉRIFICATIONS

### **Vérifier que les contraintes sont installées**

```sql
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid IN (
  'public.employees'::regclass,
  'public.company_users'::regclass
)
AND contype = 'u';
```

**Résultat attendu** :
```
employees_user_company_unique    | u
company_users_user_company_unique | u
```

---

### **Vérifier que le trigger existe**

```sql
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_auto_assign_user_to_company';
```

**Résultat attendu** :
```
trigger_auto_assign_user_to_company | O (enabled)
```

---

### **Vérifier les statistiques**

```sql
SELECT 
  (SELECT COUNT(*) FROM company_users) as company_users_count,
  (SELECT COUNT(*) FROM employees) as employees_count;
```

**Les deux nombres devraient être identiques ou très proches** ✅

---

## 📋 CHECKLIST FINALE

Après exécution des deux scripts :

```
☑ Fix immédiat exécuté (FIX-SK-AGENCY-USER-CORRECTED.sql)
☑ Système automatique installé (SYSTEM-AUTO-ASSIGN-USERS-COMPANIES.sql)
☑ Contraintes uniques vérifiées
☑ Trigger vérifié (enabled)
☑ Migration des données effectuée
☑ Application rechargée (Ctrl+R / Cmd+R)
☑ Plus d'erreurs dans la console
```

---

## 🎯 RÉSULTAT

### **Pour vous maintenant :**
- ✅ Associé à SK Agency
- ✅ currentCompanyId défini
- ✅ Toutes les fonctionnalités disponibles

### **Pour tous les utilisateurs futurs :**
- ✅ Assignation automatique
- ✅ Plus d'erreurs "Company ID manquant"
- ✅ Plus d'erreurs "Pas d'employé trouvé"
- ✅ Synchronisation automatique

---

## 💡 UTILISATION FUTURE

### **Créer une nouvelle entreprise**

```typescript
// Dans votre code TypeScript
const { data, error } = await supabase.rpc('create_company_and_assign_owner', {
  p_company_name: 'Nouvelle Entreprise',
  p_owner_user_id: user.id
});
```

### **Ajouter un employé à une entreprise existante**

```typescript
// Simple insert dans company_users
const { data, error } = await supabase
  .from('company_users')
  .insert({
    user_id: newUserId,
    company_id: companyId,
    role_id: roleId,
    status: 'active'
  });

// ✅ L'entrée dans employees est créée automatiquement par le trigger !
```

---

**Le système est maintenant robuste et automatique !** 🎉
