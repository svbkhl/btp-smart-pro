# 🔍 GUIDE DE TEST D'ISOLATION - ÉTAPES DÉTAILLÉES

## 📋 AVANT DE COMMENCER

1. **Exécutez le script de diagnostic SQL** :
   - Ouvrez Supabase Dashboard > SQL Editor
   - Exécutez : `supabase/DIAGNOSTIC-ISOLATION-COMPLET.sql`
   - Notez les résultats (RLS activé ? Policies présentes ? Trigger actif ?)

2. **Vérifiez que vous avez au moins 2 entreprises** avec des utilisateurs différents

---

## 🧪 TEST 1 : VÉRIFICATION VISUELLE

### Étape 1.1 : Entreprise A
1. Connectez-vous avec un compte utilisateur (Entreprise A)
2. Allez sur `/clients`
3. **Notez** :
   - Le nombre de clients visibles
   - Les noms des 3 premiers clients
   - Prenez une capture d'écran si possible

### Étape 1.2 : Entreprise B
1. **Déconnectez-vous complètement**
2. Connectez-vous avec un AUTRE compte utilisateur (Entreprise B)
3. Allez sur `/clients`
4. **Vérifiez** :
   - Les clients de l'Entreprise A sont-ils visibles ? ❌ (ne doivent PAS être visibles)
   - Seuls les clients de l'Entreprise B sont-ils visibles ? ✅

**Résultat attendu :** ✅ Aucun client de l'Entreprise A visible dans l'Entreprise B

---

## 🧪 TEST 2 : CRÉATION DE CLIENT

### Étape 2.1 : Créer un client dans l'Entreprise A
1. Connectez-vous avec Entreprise A
2. Allez sur `/clients`
3. Cliquez sur "Nouveau client" ou le bouton "+"
4. Créez un client avec un nom **unique et identifiable** :
   - Nom : `TEST-ISOLATION-A-2025-01-22`
   - Remplissez les autres champs si nécessaire
5. Sauvegardez
6. **Vérifiez** : Le client apparaît-il dans la liste ? ✅

### Étape 2.2 : Vérifier dans l'Entreprise B
1. **Déconnectez-vous**
2. Connectez-vous avec Entreprise B
3. Allez sur `/clients`
4. **Vérifiez** : `TEST-ISOLATION-A-2025-01-22` apparaît-il ? ❌ (ne doit PAS apparaître)

**Résultat attendu :** ✅ Le client créé n'est visible QUE dans l'Entreprise A

---

## 🧪 TEST 3 : MODIFICATION

### Étape 3.1 : Créer un client test
1. Connectez-vous avec Entreprise A
2. Créez un client : `TEST-UPDATE-A`
3. Notez l'ID ou le nom exact

### Étape 3.2 : Tenter de modifier depuis l'Entreprise B
1. **Déconnectez-vous**
2. Connectez-vous avec Entreprise B
3. Allez sur `/clients`
4. **Vérifiez** : `TEST-UPDATE-A` est-il visible ? ❌ (ne doit PAS être visible)
5. Si vous pouvez accéder au client (par URL directe), tentez de le modifier → doit échouer

### Étape 3.3 : Vérifier que rien n'a changé
1. Reconnectez-vous avec Entreprise A
2. Vérifiez que `TEST-UPDATE-A` n'a pas été modifié

**Résultat attendu :** ✅ Impossible de modifier les données d'une autre entreprise

---

## 🧪 TEST 4 : SUPPRESSION

### Étape 4.1 : Créer un client test
1. Connectez-vous avec Entreprise A
2. Créez un client : `TEST-DELETE-A`

### Étape 4.2 : Tenter de supprimer depuis l'Entreprise B
1. **Déconnectez-vous**
2. Connectez-vous avec Entreprise B
3. Allez sur `/clients`
4. **Vérifiez** : `TEST-DELETE-A` est-il visible ? ❌ (ne doit PAS être visible)
5. Si vous pouvez accéder au client, tentez de le supprimer → doit échouer

### Étape 4.3 : Vérifier que le client existe toujours
1. Reconnectez-vous avec Entreprise A
2. Vérifiez que `TEST-DELETE-A` existe toujours

**Résultat attendu :** ✅ Impossible de supprimer les données d'une autre entreprise

---

## 📊 APRÈS LES TESTS

1. **Exécutez à nouveau le diagnostic SQL** :
   - `supabase/DIAGNOSTIC-ISOLATION-COMPLET.sql`
   - Comparez avec les résultats d'avant

2. **Vérifiez les logs** (si l'application a été utilisée) :
   - Fichier : `.cursor/debug.log`
   - Cherchez les messages avec `⚠️ CRITIQUE` ou `company_id mismatch`

3. **Rapportez les résultats** :
   - Quels tests ont réussi ? ✅
   - Quels tests ont échoué ? ❌
   - Y a-t-il des clients visibles dans plusieurs entreprises ? ❌

---

## ⚠️ PROBLÈMES POSSIBLES

### Problème 1 : Les clients apparaissent dans toutes les entreprises
**Cause possible :** RLS désactivé ou policies incorrectes
**Solution :** Exécutez `supabase/ACTIVER-RLS-FORCE-ABSOLU.sql`

### Problème 2 : Les nouveaux clients n'ont pas de company_id
**Cause possible :** Trigger `force_company_id` inactif
**Solution :** Vérifiez le trigger dans le diagnostic SQL

### Problème 3 : Impossible de créer un client
**Cause possible :** Policy INSERT trop restrictive
**Solution :** Vérifiez les policies dans le diagnostic SQL

---

**Suivez ces étapes et rapportez les résultats !**
