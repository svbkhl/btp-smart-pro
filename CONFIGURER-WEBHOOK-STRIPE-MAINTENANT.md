# 🔔 CONFIGURER WEBHOOK STRIPE (2 MIN)

## 🎯 Objectif

Le webhook permet à Stripe de **notifier automatiquement** ton application quand un paiement est effectué.

**Sans webhook** → Les paiements ne seront pas enregistrés dans ta base de données ❌  
**Avec webhook** → Paiements automatiquement traités ✅

---

## 🚀 ÉTAPE 1 : Créer le Webhook (1 min)

### 1️⃣ Ouvre le Dashboard Stripe

**Lien direct** : https://dashboard.stripe.com/webhooks

(Si tu es en mode test, assure-toi d'être en **mode Test**)

### 2️⃣ Clique sur "Add endpoint"

### 3️⃣ Configure l'endpoint

**Endpoint URL** (copie-colle exactement) :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/stripe-invoice-webhook
```

**Description** (optionnel) :
```
BTP Smart Pro - Webhook paiements
```

### 4️⃣ Sélectionne les événements

Clique sur **"Select events"**, puis ajoute ces **3 événements** :

- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`

**Comment trouver** :
1. Dans la barre de recherche, tape `checkout.session.completed`
2. Coche la case
3. Répète pour les 2 autres

### 5️⃣ Clique sur "Add endpoint"

✅ **Webhook créé !**

---

## 🔑 ÉTAPE 2 : Récupérer le Secret (1 min)

### 1️⃣ Sur la page du webhook que tu viens de créer

Tu devrais voir une section **"Signing secret"**

### 2️⃣ Clique sur "Reveal" ou "Click to reveal"

Tu verras un code qui commence par **`whsec_...`**

### 3️⃣ Copie ce code (clique sur l'icône copie)

Exemple :
```
whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

⚠️ **Important** : Garde ce code secret, ne le partage jamais !

---

## 🔧 ÉTAPE 3 : Ajouter le Secret dans Supabase

Tu as **2 options** :

### Option A : Via le Dashboard Supabase (Recommandé)

1. **Ouvre** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/vault

2. **Clique sur** "Edge Functions Secrets"

3. **Clique sur** "Add new secret"

4. **Nom** : `STRIPE_WEBHOOK_SECRET`

5. **Valeur** : Colle le `whsec_...` que tu as copié

6. **Clique sur** "Add secret"

✅ **Secret ajouté !**

### Option B : Via le CLI (Alternative)

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_TON_CODE_ICI --project-ref renmjmqlmafqjzldmsgs
```

---

## ✅ VÉRIFICATION

### 1️⃣ Vérifier le webhook dans Stripe

**Dashboard Stripe** → **Webhooks** :
- ✅ URL : `...stripe-invoice-webhook`
- ✅ Status : **Enabled**
- ✅ Events : 3 événements

### 2️⃣ Tester le webhook

**Dans Stripe Dashboard** → **Webhooks** → Clique sur ton webhook → **"Send test webhook"**

Choisis `checkout.session.completed` → **Send test webhook**

**Dans Supabase** → **Edge Functions** → **Logs** → Filtre `stripe-invoice-webhook`

Tu devrais voir les logs du webhook 📊

---

## 🎯 CE QUI VA SE PASSER MAINTENANT

Quand un client paye via Stripe :

```
1️⃣ Client paye sur Stripe Checkout
    ↓
2️⃣ Stripe envoie un événement à ton webhook
    ↓
3️⃣ Ton Edge Function reçoit l'événement
    ↓
4️⃣ Mise à jour automatique :
   - ✅ Paiement = completed
   - ✅ Facture = paid (ou partially_paid)
   - ✅ Échéance = paid (si paiement fractionné)
   - ✅ Devis = paid (si tout payé)
    ↓
5️⃣ Client et Admin voient le paiement ✅
```

---

## 🧪 TEST COMPLET (Après Configuration)

1. **Crée un devis** dans l'app
2. **Signe-le**
3. **Génère un lien de paiement** (paiement total ou 2x)
4. **Paye avec carte test** : `4242 4242 4242 4242`
5. **Vérifie dans la DB** :
   ```sql
   SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM invoices ORDER BY updated_at DESC LIMIT 1;
   ```
6. **Tu devrais voir** : paiement = `completed`, facture mise à jour ✅

---

## 🚨 SI PROBLÈME

### Webhook ne se déclenche pas

**Vérifie** :
1. L'URL du webhook est correcte (copie-colle exacte)
2. Le secret est bien configuré dans Supabase
3. L'Edge Function est déployée (on l'a fait ✅)

**Dans Stripe Dashboard** → **Webhooks** → Ton webhook → **Attempts**  
Tu verras les tentatives et les erreurs éventuelles

### Erreur "Invalid signature"

→ Le secret `STRIPE_WEBHOOK_SECRET` n'est pas correct  
→ Vérifie que tu as bien copié le bon secret

---

## 📚 APRÈS ÇA

Tu pourras :
- ✅ Accepter des paiements réels
- ✅ Paiements automatiquement enregistrés
- ✅ Factures automatiquement mises à jour
- ✅ Échéances gérées automatiquement
- ✅ Traçabilité complète

---

## 🎉 RÉCAPITULATIF

✅ **Scripts SQL exécutés** (4/4)  
✅ **Edge Functions déployées** (3/3)  
⏳ **Webhook Stripe** ← Tu es ici (2 min)  
⏳ **Tests** ← Après le webhook

---

**🎯 CONFIGURE LE WEBHOOK MAINTENANT !**

**Lien** : https://dashboard.stripe.com/webhooks

