# ✅ TEST : Correction MODE TTC FIRST

## 🎯 Objectif

Vérifier que la correction du bug critique TTC/HT fonctionne correctement.

**Bug avant** : Saisir 2000€ → affichait 2400€ (2000 + 20% TVA) ❌  
**Après correction** : Saisir 2000€ → affiche 2000€ TTC ✅

---

## 🧪 TEST 1 : Création de Devis Simple (5 min)

### 1️⃣ Va sur l'app

https://www.btpsmartpro.com

### 2️⃣ Va dans "Devis IA" → "Devis Simple"

### 3️⃣ Remplis le formulaire

- **Client** : Choisis un client existant
- **Prestation** : "Rénovation cuisine"
- **Surface** : 20
- **Montant TTC** : **2000** ← Important !

### 4️⃣ Vérifie l'aperçu

Tu devrais voir **IMMÉDIATEMENT** dans l'aperçu :

```
Total à payer (TTC) : 2 000,00 €  ← EN GROS ET EN PREMIER
dont TVA (20%) : 333,33 €
Total HT : 1 666,67 €
```

**✅ SI C'EST BON** : Les calculs sont corrects !

**❌ SI TU VOIS 2400€** : Il y a encore un problème, dis-le moi

### 5️⃣ Génère le devis

Clique sur "Générer le devis"

### 6️⃣ Vérifie le devis généré

Sur le devis affiché, tu devrais voir :

```
Total à payer (TTC) : 2 000,00 €  ← EN PREMIER ET EN GRAS
dont TVA (20%) : 333,33 €
Total HT : 1 666,67 €
```

**Ordre important** : TTC d'abord, puis TVA, puis HT

---

## 🧪 TEST 2 : Paiement Stripe (2 min)

### 1️⃣ Sur le devis que tu viens de créer

Va dans **Facturation** → Trouve ton devis

### 2️⃣ Signe le devis

(Si pas déjà signé)

### 3️⃣ Génère un lien de paiement

Clique sur "Envoyer lien de paiement" → "Paiement total"

### 4️⃣ Vérifie le montant

Le lien de paiement doit être pour **2000€** (pas 2400€)

### 5️⃣ Copie le lien et ouvre-le

Tu devrais arriver sur Stripe Checkout avec **2 000,00 €**

---

## 🧪 TEST 3 : Vérification en Base de Données (1 min)

### 1️⃣ Va sur Supabase

https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/editor

### 2️⃣ Exécute cette requête

```sql
SELECT 
  quote_number,
  estimated_cost,
  details->'total_ttc' as total_ttc,
  details->'total_ht' as total_ht,
  details->'vat_amount' as vat_amount,
  created_at
FROM ai_quotes
ORDER BY created_at DESC
LIMIT 1;
```

### 3️⃣ Vérifie les valeurs

Tu devrais voir pour ton devis de 2000€ :

| Colonne | Valeur attendue |
|---------|----------------|
| `estimated_cost` | 2000 |
| `total_ttc` | 2000 |
| `total_ht` | 1666.67 |
| `vat_amount` | 333.33 |

---

## ✅ RÉSULTATS ATTENDUS

### ✅ Ce qui DOIT être correct :

1. **Saisie** : Champ dit "Montant TTC" (pas juste "Prix")
2. **Aperçu** : TTC affiché EN PREMIER et EN GRAS
3. **Calculs** : 2000 TTC = 1666.67 HT + 333.33 TVA
4. **Devis** : TTC en premier, ordre TTC → TVA → HT
5. **Paiement** : Stripe demande 2000€ (pas 2400€)
6. **Base de données** : estimated_cost = 2000

### ❌ Ce qui NE DOIT PLUS arriver :

1. ❌ 2000€ saisi → 2400€ affiché
2. ❌ HT affiché avant TTC
3. ❌ Label "Prix" sans précision TTC
4. ❌ Calcul : TTC = HT × 1.20

---

## 📊 EXEMPLE COMPLET

| Montant saisi | TTC | TVA (20%) | HT |
|---------------|-----|-----------|-----|
| 1000€ | 1000.00€ | 166.67€ | 833.33€ |
| 2000€ | 2000.00€ | 333.33€ | 1666.67€ |
| 5000€ | 5000.00€ | 833.33€ | 4166.67€ |
| 10000€ | 10000.00€ | 1666.67€ | 8333.33€ |

**Formule** :
- TVA = TTC × (20 / 120) = TTC × 0.1666667
- HT = TTC - TVA

---

## 🚨 SI UN TEST ÉCHOUE

**Dis-moi :**
1. Quel test a échoué (1, 2 ou 3)
2. Quel montant tu as saisi
3. Quel montant s'affiche
4. Screenshot si possible

Je corrigerai immédiatement ! 🔧

---

## 🎉 SI TOUS LES TESTS PASSENT

**Bravo !** Le système est maintenant en **MODE TTC FIRST** ! 🚀

Tu peux maintenant :
- ✅ Créer des devis avec les bons montants
- ✅ Les clients paient le bon prix
- ✅ La comptabilité est correcte
- ✅ Stripe reçoit le bon montant

---

**🎯 LANCE LE TEST 1 MAINTENANT !**
