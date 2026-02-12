# Stripe Connect au niveau Entreprise — À appliquer

**Objectif :** Un seul compte Stripe par entreprise. Tous les owners partagent la même config Stripe.

---

## 1. Migration SQL (Supabase)

Exécuter dans **Supabase Dashboard → SQL Editor** :

```sql
-- Colonnes Stripe Connect sur companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_stripe_connect_account_id
  ON public.companies(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- Migrer les données existantes : user_settings → companies
DO $$
DECLARE
  rec RECORD;
  v_company_id UUID;
BEGIN
  FOR rec IN
    SELECT us.user_id, us.stripe_account_id, us.stripe_connected,
           us.stripe_charges_enabled, us.stripe_payouts_enabled, us.stripe_details_submitted
    FROM public.user_settings us
    WHERE us.stripe_account_id IS NOT NULL
  LOOP
    SELECT cu.company_id INTO v_company_id
    FROM public.company_users cu
    WHERE cu.user_id = rec.user_id AND cu.role = 'owner'
    ORDER BY cu.created_at ASC
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      UPDATE public.companies
      SET
        stripe_connect_account_id = rec.stripe_account_id,
        stripe_connect_connected = COALESCE(rec.stripe_connected, false),
        stripe_connect_charges_enabled = COALESCE(rec.stripe_charges_enabled, false),
        stripe_connect_payouts_enabled = COALESCE(rec.stripe_payouts_enabled, false),
        stripe_connect_details_submitted = COALESCE(rec.stripe_details_submitted, false),
        updated_at = NOW()
      WHERE id = v_company_id
        AND (stripe_connect_account_id IS NULL OR stripe_connect_account_id = '');
    END IF;
  END LOOP;
END $$;
```

Ou via CLI : `supabase db push` (si la migration `20260211000001_stripe_connect_company_level.sql` est listée).

---

## 2. Edge Functions à déployer

```bash
supabase functions deploy stripe-create-account-link
supabase functions deploy stripe-connect-callback
```

Elles utilisent déjà `companies.stripe_connect_*` :

- **stripe-create-account-link** : récupère `company_id` via `company_users` (owner), lit/écrit dans `companies`
- **stripe-connect-callback** : met à jour `companies` selon `stripe_connect_account_id`

---

## 3. Frontend (déjà en place)

- `ConnectWithStripe.tsx` : lit `stripe_connect_account_id` et `stripe_connect_connected` depuis la company
- `StripeCallback.tsx` : récupère le compte depuis la company
- `create-payment-link` / `create-payment-link-v2` : utilisent `companies.stripe_connect_account_id`

---

## 4. Vérifications

| Élément | Statut |
|--------|--------|
| Colonnes `companies` | Migration SQL |
| Migration `user_settings` → `companies` | Inclus dans la migration |
| `stripe-create-account-link` | Déployer |
| `stripe-connect-callback` | Déployer |
| `ConnectWithStripe` | Code à jour |
| `StripeCallback` | Code à jour |
| `create-payment-link` | Code à jour |

---

## 5. Ordre recommandé

1. Exécuter la migration SQL dans Supabase
2. Déployer les Edge Functions
3. Tester : owner connecte Stripe → callback → tous les owners de l’entreprise voient le même compte Stripe
