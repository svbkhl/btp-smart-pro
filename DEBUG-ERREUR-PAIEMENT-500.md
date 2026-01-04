# 🔍 DEBUG - Erreur 500 Création Lien de Paiement

## ❌ ERREUR

```
Failed to load resource: create-payment-link
Edge Function returned a non-2xx status code (500)
```

---

## 🔍 ÉTAPE 1 : VOIR LES LOGS SUPABASE

### Va dans Supabase Dashboard

1. **Supabase Dashboard** : https://supabase.com/dashboard
2. **Ton projet** → Edge Functions
3. **Click sur `create-payment-link`**
4. **Onglet "Logs"**
5. **Regarde les derniers logs** (les plus récents en haut)

**Tu devrais voir l'erreur exacte !**

Exemples d'erreurs possibles :
- ❌ `STRIPE_SECRET_KEY is not defined`
- ❌ `Invalid quote_id`
- ❌ `Quote not found`
- ❌ `Stripe API error`
- ❌ `Missing stripe_account_id`

**📋 COPIE-COLLE L'ERREUR ICI !**

---

## 🔍 ÉTAPE 2 : VÉRIFIER LES SECRETS

Les Edge Functions ont besoin de ces secrets :

```bash
npx supabase secrets list
```

**Tu dois avoir :**
- ✅ `STRIPE_SECRET_KEY` (commence par `sk_`)
- ✅ `APP_URL` (https://www.btpsmartpro.com)
- ✅ `RESEND_API_KEY` (pour les emails)

**Si un secret manque, l'ajouter :**

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
npx supabase secrets set APP_URL=https://www.btpsmartpro.com
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

## 🔍 ÉTAPE 3 : VÉRIFIER LE DEVIS

Le devis doit avoir :
- ✅ `signed = true`
- ✅ `estimated_cost` > 0
- ✅ Un `client_email` valide

**Vérifier dans Supabase SQL Editor :**

```sql
SELECT 
  id,
  quote_number,
  client_name,
  client_email,
  estimated_cost,
  signed,
  signed_at
FROM ai_quotes
WHERE signed = true
ORDER BY signed_at DESC
LIMIT 5;
```

---

## 🔍 ÉTAPE 4 : VÉRIFIER STRIPE CONNECT

Si tu utilises Stripe Connect (chaque entreprise son compte) :

**Dans Supabase SQL Editor :**

```sql
SELECT 
  user_id,
  stripe_account_id,
  stripe_charges_enabled,
  stripe_payouts_enabled
FROM user_settings
WHERE stripe_account_id IS NOT NULL;
```

**Le `stripe_account_id` doit être présent !**

Si absent :
1. Va dans **Paramètres → Stripe**
2. Click "Connecter Stripe"
3. Complète le questionnaire Stripe

---

## 🔍 CAUSES FRÉQUENTES D'ERREUR 500

### 1. Stripe Secret Key manquant
**Erreur :** `STRIPE_SECRET_KEY is not defined`

**Solution :**
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

---

### 2. Stripe Connect non configuré
**Erreur :** `No stripe_account_id found`

**Solution :**
- Va dans Paramètres → Stripe
- Click "Connecter Stripe"
- Complète le questionnaire

---

### 3. Devis non signé
**Erreur :** `Quote is not signed`

**Solution :**
- Le devis doit être signé avant de créer un lien de paiement
- Va sur le lien de signature et signe le devis d'abord

---

### 4. Email client manquant
**Erreur :** `client_email is required`

**Solution :**
- Ajoute un email client au devis
```sql
UPDATE ai_quotes
SET client_email = 'client@example.com'
WHERE id = 'ton_quote_id';
```

---

### 5. Montant invalide
**Erreur :** `amount must be at least 0.50 eur`

**Solution :**
- Le montant minimum Stripe est 0,50 €
- Vérifie que `estimated_cost >= 0.50`

---

## 🔍 ÉTAPE 5 : TESTER MANUELLEMENT

**Dans Supabase Dashboard → Edge Functions :**

1. Click sur `create-payment-link`
2. Onglet "Invocations"
3. **Teste avec ce payload :**

```json
{
  "quote_id": "TON_QUOTE_ID_ICI",
  "payment_type": "total"
}
```

**Remplace `TON_QUOTE_ID_ICI` par un vrai ID de devis signé.**

**Regarde la réponse !**

---

## 📊 CHECKLIST DE VÉRIFICATION

Coche ce qui est OK :

- [ ] Logs Supabase consultés → Erreur identifiée
- [ ] Secrets Supabase configurés (STRIPE_SECRET_KEY, APP_URL)
- [ ] Devis signé (`signed = true`)
- [ ] Email client présent
- [ ] Montant > 0,50 €
- [ ] Stripe Connect configuré (si multi-tenant)
- [ ] Fonction `create-payment-link` déployée

---

## 🆘 SI TU ES BLOQUÉ

**Envoie-moi :**
1. Les logs de l'erreur (Supabase Dashboard → Edge Functions → Logs)
2. Le résultat de `npx supabase secrets list`
3. Le résultat de la requête SQL du devis

**Je pourrai alors te donner la solution exacte ! 🎯**

---

## 🎯 SOLUTION RAPIDE (SI SECRETS MANQUANTS)

Si l'erreur est juste les secrets :

```bash
# Stripe
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# URL de l'app
npx supabase secrets set APP_URL=https://www.btpsmartpro.com

# Resend (emails)
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx

# Redéployer la fonction
npx supabase functions deploy create-payment-link --no-verify-jwt
```

---

**📋 COMMENCE PAR REGARDER LES LOGS SUPABASE !**

**C'est là que tu verras l'erreur exacte ! 🔍**

