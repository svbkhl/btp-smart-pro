# 🧪 TEST D'ISOLATION - ÉTAPES SIMPLES

## ✅ ÉTAT BACKEND (d'après le diagnostic SQL)
- ✅ RLS Activé
- ✅ 4 Policies en place
- ✅ Trigger `force_company_id` actif
- ✅ Fonction `current_company_id()` existe
- ✅ Pas de clients orphelins

## 🎯 OBJECTIF
Vérifier que les clients créés dans une entreprise ne sont **PAS** visibles dans une autre entreprise.

---

## 📋 ÉTAPES DE TEST

### ÉTAPE 1 : Préparer le test
1. **Ouvrez l'application** dans votre navigateur (si ce n'est pas déjà fait)
2. **Assurez-vous d'avoir 2 comptes utilisateurs** dans 2 entreprises différentes
   - Si vous n'en avez pas, créez-les d'abord dans Supabase

### ÉTAPE 2 : Test avec Entreprise A
1. **Connectez-vous** avec le compte de l'Entreprise A
2. **Allez sur la page `/clients`**
3. **Notez** :
   - Combien de clients sont visibles ?
   - Les noms des 3 premiers clients (ex: "Client 1", "Client 2", etc.)

### ÉTAPE 3 : Créer un client test
1. **Toujours connecté avec Entreprise A**, cliquez sur **"Nouveau client"** ou le bouton **"+"**
2. **Créez un client avec un nom unique** :
   - Nom : `TEST-ISOLATION-A-2025-01-22`
   - Remplissez les autres champs si nécessaire
3. **Sauvegardez** le client
4. **Vérifiez** : Le client `TEST-ISOLATION-A-2025-01-22` apparaît-il dans la liste ? ✅

### ÉTAPE 4 : Test avec Entreprise B
1. **Déconnectez-vous complètement** de l'Entreprise A
2. **Connectez-vous** avec le compte de l'Entreprise B
3. **Allez sur la page `/clients`**
4. **Vérifiez** :
   - ❌ Le client `TEST-ISOLATION-A-2025-01-22` **NE DOIT PAS** apparaître
   - ✅ Seuls les clients de l'Entreprise B doivent être visibles
   - ❌ Les clients notés à l'ÉTAPE 2 (de l'Entreprise A) **NE DOIVENT PAS** être visibles

### ÉTAPE 5 : Créer un client dans Entreprise B
1. **Toujours connecté avec Entreprise B**, créez un nouveau client :
   - Nom : `TEST-ISOLATION-B-2025-01-22`
2. **Vérifiez** : Le client apparaît dans la liste de l'Entreprise B ✅

### ÉTAPE 6 : Vérifier l'isolation
1. **Reconnectez-vous** avec l'Entreprise A
2. **Allez sur `/clients`**
3. **Vérifiez** :
   - ✅ `TEST-ISOLATION-A-2025-01-22` est visible
   - ❌ `TEST-ISOLATION-B-2025-01-22` **NE DOIT PAS** être visible

---

## ✅ RÉSULTAT ATTENDU

**Si l'isolation fonctionne correctement :**
- ✅ Chaque entreprise ne voit QUE ses propres clients
- ✅ Les clients créés dans une entreprise ne sont PAS visibles dans une autre
- ✅ Aucune fuite de données entre entreprises

**Si l'isolation NE fonctionne PAS :**
- ❌ Les clients de l'Entreprise A sont visibles dans l'Entreprise B
- ❌ Les clients créés dans une entreprise apparaissent dans toutes les entreprises
- ❌ Les clients supprimés dans une entreprise sont aussi supprimés dans une autre

---

## 📊 APRÈS LES TESTS

Une fois les tests terminés :
1. **Dites-moi** :
   - ✅ Les tests ont-ils réussi ? (isolation fonctionne)
   - ❌ Les tests ont-ils échoué ? (problème d'isolation)
2. **Je vais analyser les logs** automatiquement pour identifier le problème exact

---

**Prêt ? Commencez par l'ÉTAPE 1 !** 🚀
