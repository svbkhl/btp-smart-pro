# 🔄 Guide de Migration - Multi-Payment Providers

## 📋 Vue d'Ensemble

Ce guide explique comment migrer le code existant vers la nouvelle architecture multi-providers.

---

## 🎯 Objectifs de la Migration

1. **Remplacer** les appels directs à Stripe par `PaymentService`
2. **Conserver** la compatibilité avec le code existant
3. **Activer** progressivement les nouveaux providers

---

## 📝 Étapes de Migration

### Étape 1: Exécuter la Migration SQL

```sql
-- Dans Supabase Dashboard → SQL Editor
-- Exécuter: supabase/migrations/add_payment_providers.sql
```

### Étape 2: Mettre à Jour les Imports

**Avant :**
```typescript
import { createDepositPaymentLink } from '@/services/stripePaymentService';
```

**Après :**
```typescript
import { paymentService } from '@/services/PaymentService';
```

### Étape 3: Remplacer les Appels de Service

#### Créer une Session de Paiement

**Avant :**
```typescript
const { data, error } = await supabase.functions.invoke(
  "create-payment-session",
  {
    body: {
      invoice_id: invoice.id,
      payment_type: "invoice",
      amount: invoice.amount_ttc,
    },
  }
);
```

**Après :**
```typescript
// Option 1: Utiliser directement PaymentService (recommandé)
const session = await paymentService.createPaymentSession(
  {
    amount: invoice.amount_ttc,
    currency: 'EUR',
    customerEmail: invoice.client_email,
    successUrl: `${baseUrl}/payment/success`,
    cancelUrl: `${baseUrl}/payment/error`,
    invoiceId: invoice.id,
  },
  userId
);

// Option 2: Continuer à utiliser l'Edge Function (fonctionne toujours)
// L'Edge Function utilise maintenant PaymentService en interne
const { data, error } = await supabase.functions.invoke(
  "create-payment-session",
  {
    body: {
      invoice_id: invoice.id,
      payment_type: "invoice",
      amount: invoice.amount_ttc,
    },
  }
);
```

#### Créer un Lien de Paiement

**Avant :**
```typescript
import { createDepositPaymentLink } from '@/services/stripePaymentService';

const link = await createDepositPaymentLink(quoteId, {
  depositPercentage: 30,
  quoteAmount: 1000,
});
```

**Après :**
```typescript
import { paymentService } from '@/services/PaymentService';

const link = await paymentService.createPaymentLink(
  {
    amount: 1000 * 0.3, // 30% de 1000
    currency: 'EUR',
    description: `Acompte pour devis ${quoteId}`,
    metadata: {
      quote_id: quoteId,
      deposit_percentage: '30',
    },
  },
  userId
);
```

### Étape 4: Mettre à Jour les Composants

#### PaymentButton.tsx

**Avant :**
```typescript
// Appel direct à l'Edge Function
const { data, error } = await supabase.functions.invoke(
  "create-payment-session",
  { body: { ... } }
);
```

**Après :**
```typescript
// Option 1: Utiliser PaymentService directement
import { paymentService } from '@/services/PaymentService';

const session = await paymentService.createPaymentSession(
  { ... },
  user.id
);
window.location.href = session.checkoutUrl;

// Option 2: Continuer avec l'Edge Function (fonctionne toujours)
// Aucun changement nécessaire, l'Edge Function utilise PaymentService
```

### Étape 5: Mettre à Jour les Webhooks

**Avant :**
- Webhook Stripe : `supabase/functions/stripe-webhook/index.ts`

**Après :**
- Webhook unifié : `supabase/functions/payment-webhook/index.ts`
- Supporte tous les providers

**Configuration :**
1. Dans chaque dashboard de provider, changer l'URL du webhook vers :
   ```
   https://[PROJECT-REF].supabase.co/functions/v1/payment-webhook
   ```

2. Ajouter les secrets webhook dans Supabase :
   - `STRIPE_WEBHOOK_SECRET`
   - `SUMUP_WEBHOOK_SECRET`
   - `PAYPLUG_WEBHOOK_SECRET`
   - `STANCER_WEBHOOK_SECRET`
   - `GOCARDLESS_WEBHOOK_SECRET`

---

## 🔧 Migration Progressive

### Phase 1: Préparation (Sans Impact)

1. ✅ Exécuter la migration SQL
2. ✅ Déployer les nouvelles Edge Functions
3. ✅ Ajouter PaymentProviderSettings dans Settings
4. ✅ Tester que Stripe continue de fonctionner

### Phase 2: Migration du Code (Optionnel)

1. Remplacer progressivement les appels directs par PaymentService
2. Tester chaque changement
3. Déployer en staging puis production

### Phase 3: Activation des Nouveaux Providers

1. Configurer SumUp, PayPlug, etc. dans PaymentProviderSettings
2. Tester avec les APIs de test
3. Activer en production

---

## ⚠️ Points d'Attention

### Compatibilité Ascendante

- ✅ Le code existant continue de fonctionner
- ✅ Les Edge Functions existantes sont compatibles
- ✅ Aucune migration forcée nécessaire

### Données Existantes

- Les paiements existants avec `stripe_session_id` sont automatiquement migrés
- La colonne `stripe_session_id` est renommée en `provider_session_id`
- Les anciens paiements gardent `provider_type = NULL` (compatible)

### Performance

- Aucun impact sur les performances
- Les adapters sont chargés à la demande
- Le registry cache les instances

---

## 🧪 Tests de Migration

### Test 1: Vérifier que Stripe Fonctionne

1. Créer un paiement avec Stripe
2. Vérifier que la session est créée
3. Compléter le paiement
4. Vérifier que le webhook met à jour le statut

### Test 2: Tester un Nouveau Provider

1. Configurer SumUp dans PaymentProviderSettings
2. Créer un paiement avec SumUp
3. Vérifier que tout fonctionne

### Test 3: Vérifier la Migration des Données

```sql
-- Vérifier que les anciens paiements sont toujours accessibles
SELECT id, provider_type, provider_session_id, stripe_session_id
FROM payments
WHERE stripe_session_id IS NOT NULL;
```

---

## 📊 Checklist de Migration

- [ ] Migration SQL exécutée
- [ ] Edge Functions déployées
- [ ] Variables d'environnement configurées
- [ ] Webhooks configurés
- [ ] PaymentProviderSettings accessible dans Settings
- [ ] Tests Stripe réussis
- [ ] Code existant toujours fonctionnel
- [ ] Documentation à jour

---

## 🆘 Support

En cas de problème :

1. Vérifier les logs des Edge Functions
2. Vérifier la configuration dans PaymentProviderSettings
3. Vérifier les credentials dans la base de données
4. Consulter la documentation complète : `PAYMENT-PROVIDERS-COMPLETE-GUIDE.md`

---

**Migration prête !** 🚀







