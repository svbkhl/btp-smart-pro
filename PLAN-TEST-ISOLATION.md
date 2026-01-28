# 🧪 PLAN DE TEST D'ISOLATION MULTI-TENANT

## ✅ ÉTAT ACTUEL (d'après Supabase)
- ✅ `company_id` : Présent sur toutes les tables
- ✅ `Status` : NOT NULL sur toutes les tables
- ✅ `RLS` : Activé sur toutes les tables
- ✅ `Policies` : 4 policies par table (SELECT, INSERT, UPDATE, DELETE)
- ✅ `Trigger` : `force_company_id` actif sur toutes les tables

## 🎯 OBJECTIF DES TESTS
Vérifier que les données sont **strictement isolées** entre les entreprises :
1. ✅ Lecture : Une entreprise ne voit QUE ses données
2. ✅ Création : Un client créé n'apparaît QUE dans l'entreprise qui l'a créé
3. ✅ Modification : Impossible de modifier les données d'une autre entreprise
4. ✅ Suppression : Impossible de supprimer les données d'une autre entreprise

## 📋 TESTS À EFFECTUER

### TEST 1 : LECTURE (SELECT)
**Objectif :** Vérifier qu'une entreprise ne voit QUE ses clients

**Étapes :**
1. Connectez-vous avec un compte utilisateur (Entreprise A)
2. Notez le nombre de clients visibles
3. Notez les noms des clients visibles
4. Connectez-vous avec un autre compte utilisateur (Entreprise B)
5. Vérifiez que :
   - Les clients de l'Entreprise A ne sont PAS visibles
   - Seuls les clients de l'Entreprise B sont visibles

**Résultat attendu :** ✅ Aucun client de l'Entreprise A visible dans l'Entreprise B

---

### TEST 2 : CRÉATION (INSERT)
**Objectif :** Vérifier qu'un client créé n'apparaît QUE dans l'entreprise qui l'a créé

**Étapes :**
1. Connectez-vous avec Entreprise A
2. Créez un nouveau client avec un nom unique (ex: "TEST-ISOLATION-A-2025")
3. Vérifiez que le client apparaît dans la liste de l'Entreprise A
4. Notez l'ID du client créé
5. Connectez-vous avec Entreprise B
6. Vérifiez que "TEST-ISOLATION-A-2025" n'apparaît PAS dans la liste
7. Tentez d'accéder directement au client par son ID (si possible) → doit retourner null/erreur

**Résultat attendu :** ✅ Le client créé n'est visible QUE dans l'Entreprise A

---

### TEST 3 : MODIFICATION (UPDATE)
**Objectif :** Vérifier qu'on ne peut pas modifier les données d'une autre entreprise

**Étapes :**
1. Connectez-vous avec Entreprise A
2. Créez un client "TEST-UPDATE-A"
3. Notez l'ID du client
4. Connectez-vous avec Entreprise B
5. Tentez de modifier "TEST-UPDATE-A" (si l'interface le permet) → doit échouer ou ne rien modifier
6. Reconnectez-vous avec Entreprise A
7. Vérifiez que "TEST-UPDATE-A" n'a pas été modifié

**Résultat attendu :** ✅ Impossible de modifier les données d'une autre entreprise

---

### TEST 4 : SUPPRESSION (DELETE)
**Objectif :** Vérifier qu'on ne peut pas supprimer les données d'une autre entreprise

**Étapes :**
1. Connectez-vous avec Entreprise A
2. Créez un client "TEST-DELETE-A"
3. Notez l'ID du client
4. Connectez-vous avec Entreprise B
5. Tentez de supprimer "TEST-DELETE-A" (si l'interface le permet) → doit échouer
6. Reconnectez-vous avec Entreprise A
7. Vérifiez que "TEST-DELETE-A" existe toujours

**Résultat attendu :** ✅ Impossible de supprimer les données d'une autre entreprise

---

## 📊 VÉRIFICATION DES LOGS

Après chaque test, les logs seront générés dans :
- **Fichier :** `.cursor/debug.log`
- **Format :** NDJSON (une ligne JSON par événement)

**Logs à vérifier :**
1. `Before query - currentCompanyId check` : Vérifier que `currentCompanyId` est correct
2. `After query - results with filter` : Vérifier que `allMatchCompanyId: true` et `rlsWorking: true`
3. `Client created successfully` : Vérifier que `companyIdMatch: true` et `triggerWorked: true`
4. `Cache invalidation after create` : Vérifier que le bon `companyId` est utilisé

## 🔍 ANALYSE DES RÉSULTATS

Après les tests, je vais analyser les logs pour confirmer :
- ✅ RLS fonctionne correctement (les données sont filtrées par `company_id`)
- ✅ Le trigger `force_company_id` fonctionne (les nouveaux clients ont le bon `company_id`)
- ✅ Le cache React Query est isolé par `company_id`
- ✅ Aucune fuite de données entre entreprises

## ⚠️ SI UN PROBLÈME EST DÉTECTÉ

Si les tests révèlent un problème :
1. Les logs indiqueront exactement où le problème se situe
2. Je créerai un script de correction ciblé
3. Nous ré-exécuterons les tests jusqu'à confirmation

---

**Prêt pour les tests !** Suivez les étapes ci-dessus et dites-moi quand vous avez terminé.
