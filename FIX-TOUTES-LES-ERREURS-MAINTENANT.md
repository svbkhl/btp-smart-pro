# 🔧 FIX TOUTES LES ERREURS - SCRIPTS À EXÉCUTER

## 📋 ERREURS À CORRIGER

Tu as 3 erreurs :
1. ❌ `stack depth limit exceeded` - Récursion infinie
2. ❌ `column company_users.status does not exist` - Colonne inexistante
3. ❌ `invalid input syntax for type uuid: "events"` - Validation UUID

---

## 🔗 SCRIPTS À EXÉCUTER (2 SCRIPTS)

### **1️⃣ Script 20 : Fix récursion infinie**

[**supabase/migrations/20260105000020_fix_recursion_and_errors.sql**](supabase/migrations/20260105000020_fix_recursion_and_errors.sql)

**Ce qu'il fait :**
- ✅ Crée `get_user_role_permissions()` (rôle uniquement, pas de récursion)
- ✅ Crée `check_user_role_permission()` (rôle uniquement)
- ✅ Corrige `get_user_effective_permissions()` pour éviter la récursion
- ✅ Corrige `check_user_effective_permission()` pour éviter la récursion

**Comment l'exécuter :**
1. **Clique sur le lien rose** ci-dessus
2. **Copie TOUT** (Cmd+A puis Cmd+C)
3. **Va dans Supabase SQL Editor**
4. **Colle et clique sur "Run"**

---

### **2️⃣ Script 21 : Retirer références à status**

[**supabase/migrations/20260105000021_fix_all_status_references.sql**](supabase/migrations/20260105000021_fix_all_status_references.sql)

**Ce qu'il fait :**
- ✅ Retire toutes les références à `cu.status = 'active'`
- ✅ Corrige `get_user_permissions()` (version originale)
- ✅ Corrige `check_user_permission()` (version originale)
- ✅ Corrige `is_owner()`

**Comment l'exécuter :**
1. **Clique sur le lien rose** ci-dessus
2. **Copie TOUT** (Cmd+A puis Cmd+C)
3. **Va dans Supabase SQL Editor**
4. **Colle et clique sur "Run"**

---

## ✅ APRÈS L'EXÉCUTION

1. **Rafraîchis l'app** (Cmd+R ou F5)
2. **Les erreurs devraient disparaître :**
   - ✅ Plus d'erreur `stack depth limit exceeded`
   - ✅ Plus d'erreur `column company_users.status does not exist`
   - ✅ Validation renforcée pour events

---

## 🧪 TESTER

### **1. Tester les permissions**

1. **Connecte-toi avec ton compte ADMIN**
2. **Vérifie que tu n'as plus d'erreurs rouges** dans la console
3. **Vérifie que les permissions se chargent** correctement

### **2. Tester la création d'événement**

1. **Va dans le Calendrier**
2. **Crée un événement**
3. **L'événement devrait être créé** sans erreur

---

## 🛠️ SI PROBLÈME PERSISTE

### **Erreur "events" persiste**

→ Vérifie dans la console les logs `🔍 [useCreateEvent]` :
- `user_id` doit être un UUID
- `company_id` doit être un UUID
- Aucun ne doit être égal à `"events"`

Si l'un des deux est `"events"`, déconnecte-toi et reconnecte-toi.

### **Erreur stack depth persiste**

→ Vérifie que le Script 20 a bien été exécuté et qu'il n'y a pas eu d'erreur.

### **Erreur status persiste**

→ Vérifie que le Script 21 a bien été exécuté.

---

## 📊 RÉSULTAT ATTENDU

Après l'exécution des 2 scripts :

- ✅ **Plus d'erreur stack depth** (récursion corrigée)
- ✅ **Plus d'erreur status** (références retirées)
- ✅ **Validation renforcée** pour events (UUID vérifiés)
- ✅ **Permissions fonctionnent** correctement
- ✅ **Création d'événements** fonctionne

---

**🔥 EXÉCUTE LES SCRIPTS 20 ET 21 PUIS RAFRAÎCHIS L'APP ! 🔥**
