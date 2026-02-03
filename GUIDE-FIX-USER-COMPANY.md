# 🔧 GUIDE: Résolution du problème "Aucun employé"

## 🎯 Problème identifié

**Cause**: Votre utilisateur n'est pas associé à une entreprise dans la base de données.

```
currentCompanyId: null  ← Pas d'entreprise
isAdmin: false
Nombre d'employés: 0    ← Aucun employé affiché
```

---

## ✅ SOLUTION: Exécuter le script SQL

### **Étape 1: Ouvrir Supabase Dashboard**

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet **BTP SMART PRO**

### **Étape 2: Ouvrir l'éditeur SQL**

1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New query"** (Nouvelle requête)

### **Étape 3: Copier-coller le script SQL**

1. Ouvrez le fichier `FIX-USER-COMPANY.sql` à la racine du projet
2. **Copiez tout le contenu** du fichier
3. **Collez-le** dans l'éditeur SQL de Supabase

### **Étape 4: Exécuter le script**

1. Cliquez sur le bouton **"Run"** (Exécuter) en bas à droite
2. Attendez la confirmation d'exécution

### **Étape 5: Vérifier le résultat**

Vous devriez voir des messages comme:
```
NOTICE: Entreprise créée avec ID: abc-123-def...
NOTICE: Utilisateur associé à l'entreprise
NOTICE: Entrée employé créée/mise à jour
NOTICE: FIX TERMINÉ AVEC SUCCÈS !
```

### **Étape 6: Recharger l'application**

1. Retournez sur votre application BTP SMART PRO
2. **Rechargez complètement la page** (Ctrl+R ou Cmd+R)
3. Ouvrez la console (F12)
4. Vérifiez les logs:
   - `currentCompanyId` devrait maintenant avoir une valeur
   - `Nombre d'employés: 1` (vous!)

---

## 🧪 VÉRIFICATION

### **Console de l'application (F12)**

Après le rechargement, vous devriez voir:

```javascript
🔵 [EmployeesPlanning] - currentCompanyId: "abc-123..." ✅
🔵 [EmployeesPlanning] - isAdmin: false
🔵 [EmployeesPlanning] Nombre d'employés: 1 ✅
```

### **Interface utilisateur**

- **Page Planning Employés**: "Employés (1)" au lieu de "Employés (0)"
- **Votre nom** devrait apparaître dans la liste des employés

---

## ❓ SI ÇA NE FONCTIONNE PAS

### **Erreur lors de l'exécution du script**

Si vous voyez une erreur dans Supabase:
1. **Copiez le message d'erreur complet**
2. **Partagez-le moi**
3. Je vais adapter le script

### **Toujours "Aucun employé" après le rechargement**

1. **Videz le cache du navigateur**:
   - Chrome/Edge: Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
   - Cochez "Cookies et autres données de sites"
   - Cliquez sur "Effacer les données"

2. **Déconnectez-vous et reconnectez-vous**

3. **Vérifiez le localStorage**:
   - Ouvrez la console (F12)
   - Tapez: `localStorage.getItem('currentCompanyId')`
   - Si c'est `null`, tapez: `localStorage.clear()` puis rechargez

---

## 📋 ALTERNATIVE: Script depuis le terminal (si vous avez les clés API)

Si vous préférez exécuter depuis le terminal:

```bash
# Assurez-vous d'avoir les variables d'environnement définies
export VITE_SUPABASE_URL="https://votre-projet.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="votre-service-role-key"

# Exécutez le script
npx tsx scripts/fix-user-company.ts
```

---

## 🎉 RÉSULTAT ATTENDU

Après l'exécution réussie:

✅ **Entreprise créée**: "Mon Entreprise BTP"  
✅ **Vous êtes associé** comme propriétaire  
✅ **Vous apparaissez** dans la liste des employés  
✅ **Le planning** fonctionne correctement  

---

**Besoin d'aide ?** Partagez-moi les messages d'erreur ou les logs de la console !
