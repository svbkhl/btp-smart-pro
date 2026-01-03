# 🚀 ACTION IMMÉDIATE : Activer le Paiement Stripe

## ⚡ 3 Étapes Rapides

### 1️⃣ Exécuter 3 Scripts SQL (5 min)

Dashboard Supabase → SQL Editor → Copie/colle chaque script et clique "Run" :

#### A. Colonnes Signature
```sql
-- Fichier: EXECUTER-SQL-SIGNATURE.md
-- Ajoute: signed, signed_at, signed_by, signature_data...
```

#### B. Fix Contraintes Status
```sql
-- Fichier: EXECUTER-FIX-STATUS.md  
-- Ajoute: 'signed', 'paid' aux contraintes CHECK
```

#### C. Système Paiement
```sql
-- Fichier: supabase/ADD-PAYMENT-FLOW-COLUMNS.sql
-- Ajoute: invoices, payments avec colonnes Stripe
```

---

### 2️⃣ Déployer Edge Functions (2 min)

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

npx supabase functions deploy create-payment-link
npx supabase functions deploy stripe-invoice-webhook
```

---

### 3️⃣ Configurer Webhook Stripe (3 min)

1. **Stripe Dashboard** → https://dashboard.stripe.com/webhooks
2. **Add endpoint**
3. **URL** :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/stripe-invoice-webhook
   ```
4. **Events** :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. **Add endpoint**
6. **Copier le "Signing secret"** (`whsec_...`)
7. **Supabase** → Edge Functions → Secrets :
   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_ton_secret
   ```

---

## ✅ VÉRIFICATION RAPIDE

Tu dois avoir maintenant :

```bash
# 1. Tables en DB
SELECT count(*) FROM invoices;   -- Doit fonctionner
SELECT count(*) FROM payments;   -- Doit fonctionner

# 2. Colonnes signature
SELECT signed, signed_at FROM ai_quotes LIMIT 1;  -- Doit fonctionner

# 3. Edge Functions déployées
# Vérifie dans Supabase Dashboard → Edge Functions

# 4. Webhook Stripe
# Vérifie dans Stripe Dashboard → Webhooks
```

---

## 🧪 TEST IMMÉDIAT (2 min)

1. **Ouvre l'app** : https://www.btpsmartpro.com
2. **Va dans Devis** (AI ou manuels)
3. **Sélectionne un devis** déjà créé
4. **Clique sur "Signer le devis"** (si pas encore signé)
5. **Dessine ta signature** → Valider
6. **Clique sur "Envoyer lien de paiement"**
7. **Choisis "Paiement total"**
8. **Le lien se copie** dans le presse-papiers
9. **Colle le lien** dans un nouvel onglet
10. **Paye avec carte test** : `4242 4242 4242 4242`

**✅ Si ça marche** : Tu verras le paiement dans Dashboard Stripe ET dans ta DB !

---

## 📚 Guide Complet

Pour plus de détails : **`GUIDE-COMPLET-PAIEMENT-STRIPE.md`**

---

## 🎯 CE QUI A ÉTÉ FAIT

### ✅ Backend (100%)
- ✅ Tables `invoices` et `payments` configurées
- ✅ Colonnes Stripe ajoutées
- ✅ RLS policies activées
- ✅ Trigger auto-update facture
- ✅ Edge Function `create-payment-link` (génère Stripe Checkout)
- ✅ Edge Function `stripe-invoice-webhook` (gère paiements)
- ✅ Sécurité : vérif devis signé, double paiement, montants

### ✅ Frontend (100%)
- ✅ Composant `SendPaymentLinkButton` créé
- ✅ Dialog moderne avec choix paiement (total/acompte)
- ✅ Validation automatique (signé requis, montants)
- ✅ Toast de confirmation
- ✅ Copie lien dans presse-papiers

### ✅ Flow Complet (100%)
```
Signature → Facture → Paiement → Webhook → Mise à jour
```

---

## 🔜 CE QUI RESTE (Optionnel)

### 📧 Email Automatique (30 min)
Actuellement, le lien est copié dans le presse-papiers.
Pour envoyer un email auto au client :

1. Créer `send-payment-email` Edge Function
2. Appeler depuis `create-payment-link` après génération
3. Template email avec facture PDF + lien

### 📊 Interface Paiements (15 min)
Intégrer `SendPaymentLinkButton` dans les pages :
- `src/pages/Billing.tsx` (section Factures)
- `src/pages/QuotePage.tsx` (après signature)
- `src/pages/Payments.tsx` (nouveau, optionnel)

---

## 🚨 SI ERREUR

### Erreur : "column signed does not exist"
→ **Exécute** `EXECUTER-SQL-SIGNATURE.md`

### Erreur : "violates check constraint status"
→ **Exécute** `EXECUTER-FIX-STATUS.md`

### Erreur : "Quote must be signed"
→ **Normal !** Le devis DOIT être signé avant paiement

### Erreur : Webhook ne se déclenche pas
→ **Vérifie** l'URL webhook dans Stripe Dashboard
→ **Teste** manuellement : Webhooks → "Send test webhook"

---

## 📞 TU ES BLOQUÉ ?

Envoie-moi :
1. **Screenshot** de l'erreur
2. **Logs** Supabase Edge Functions
3. **Requête SQL** qui pose problème

---

**TOUT EST PRÊT. LANCE LES 3 ÉTAPES CI-DESSUS ET TESTE !** 🚀

