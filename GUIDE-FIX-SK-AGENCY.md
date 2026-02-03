# 🔧 FIX RAPIDE: Association à SK Agency

## 🎯 Problème
Vous êtes connecté à "SK Agency" mais le système ne vous reconnaît pas comme membre de cette entreprise.

---

## ✅ SOLUTION (2 MINUTES)

### **Étape 1: Ouvrir Supabase**
1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous
3. Sélectionnez votre projet **BTP SMART PRO**

### **Étape 2: Exécuter le script**
1. Menu de gauche → **"SQL Editor"**
2. Cliquez sur **"New query"**
3. Ouvrez le fichier **`FIX-SK-AGENCY-USER.sql`** (à la racine du projet)
4. **Copiez tout** le contenu
5. **Collez** dans l'éditeur SQL
6. Cliquez sur **"Run"** (en bas à droite)

### **Étape 3: Vérifier les messages**
Vous devriez voir:
```
🔵 Début du fix pour SK Agency...
✅ Entreprise trouvée: abc-123...
✅ Utilisateur associé à l'entreprise
✅ Entrée employé créée/mise à jour
🎉 FIX TERMINÉ AVEC SUCCÈS !
```

### **Étape 4: Recharger l'application**
1. Retournez sur votre application BTP SMART PRO
2. **Rechargez la page** (Ctrl+R / Cmd+R)
3. **Ouvrez la console** (F12)
4. Vérifiez les logs:

**AVANT:**
```javascript
currentCompanyId: null                    ❌
Pas d'employé trouvé                     ❌
Company ID manquant                      ❌
```

**APRÈS:**
```javascript
currentCompanyId: "abc-123..."           ✅
Nombre d'employés: 1                     ✅
Plus d'erreurs                           ✅
```

---

## 🎯 CE QUE LE SCRIPT FAIT

1. ✅ Trouve l'entreprise "SK Agency"
2. ✅ Vous associe à cette entreprise dans `company_users`
3. ✅ Crée votre entrée dans `employees`
4. ✅ Définit votre rôle comme "Propriétaire"
5. ✅ Active votre statut

---

## ❓ SI ÇA NE FONCTIONNE PAS

### Erreur "SK Agency non trouvé"
- Le script cherchera automatiquement une autre entreprise
- Si aucune entreprise n'existe, il vous le dira

### Toujours les mêmes erreurs après rechargement
1. **Videz le cache**: Ctrl+Shift+Delete (Chrome/Edge)
2. **Déconnectez-vous** puis reconnectez-vous
3. **Vérifiez localStorage**:
   ```javascript
   // Dans la console (F12)
   localStorage.clear();
   location.reload();
   ```

---

## ✅ RÉSULTAT ATTENDU

- ✅ Vous apparaissez dans la liste des employés
- ✅ Le planning fonctionne
- ✅ Google Calendar accessible
- ✅ Toutes les fonctionnalités disponibles

---

**C'est tout ! Le fix prend 2 minutes.** 🚀
