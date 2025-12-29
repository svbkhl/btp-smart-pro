# 🏗️ Guide Complet - Architecture Multi-Payment Providers

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Utilisation](#utilisation)
6. [Ajouter un Nouveau Provider](#ajouter-un-nouveau-provider)
7. [Tests](#tests)
8. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

Cette architecture permet de supporter plusieurs fournisseurs de paiement de manière modulaire :

- ✅ **Stripe** (existant, refactorisé)
- ✅ **SumUp** (nouveau)
- ✅ **PayPlug** (nouveau)
- ✅ **Stancer** (nouveau)
- ✅ **GoCardless** (nouveau)

### Avantages

- **Modularité** : Chaque provider est isolé dans son adapter
- **Extensibilité** : Ajouter un provider = créer un adapter
- **Rétrocompatibilité** : Stripe continue de fonctionner comme avant
- **Unification** : Interface unique pour tous les providers

---

## 🏛️ Architecture

### Structure des Fichiers

```
src/
├── payment_providers/
│   ├── interfaces/
│   │   └── IPaymentProvider.ts          # Interface de base
│   ├── adapters/
│   │   ├── stripe_adapter.ts            # Stripe
│   │   ├── sumup_adapter.ts             # SumUp
│   │   ├── payplug_adapter.ts           # PayPlug
│   │   ├── stancer_adapter.ts           # Stancer
│   │   └── gocardless_adapter.ts        # GoCardless
│   ├── registry/
│   │   └── PaymentProviderRegistry.ts   # Factory
│   └── types/
│       └── PaymentTypes.ts              # Types partagés
├── services/
│   └── PaymentService.ts                # Service unifié
└── components/
    └── settings/
        └── PaymentProviderSettings.tsx   # UI de configuration

supabase/
├── functions/
│   ├── create-payment-session/
│   │   └── index.ts                     # Création de session
│   └── payment-webhook/
│       └── index.ts                     # Webhooks unifiés
└── migrations/
    └── add_payment_providers.sql        # Migration SQL
```

### Flux de Données

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ PaymentButton   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ PaymentService  │
└──────┬──────────┘
       │
       ▼
┌──────────────────────┐
│ ProviderRegistry     │
└──────┬───────────────┘
       │
       ▼
┌─────────────────┐
│ Provider Adapter │ (Stripe, SumUp, etc.)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Provider API   │
└─────────────────┘
```

---

## 🚀 Installation

### 1. Exécuter la Migration SQL

```sql
-- Dans Supabase Dashboard → SQL Editor
-- Exécuter: supabase/migrations/add_payment_providers.sql
```

### 2. Installer les Dépendances

```bash
# Stripe SDK (déjà installé probablement)
npm install stripe

# Pour les autres providers, les appels API sont faits via fetch
# Pas de SDK requis pour SumUp, PayPlug, Stancer, GoCardless
```

### 3. Déployer les Edge Functions

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer les fonctions
supabase functions deploy create-payment-session
supabase functions deploy payment-webhook
```

### 4. Configurer les Variables d'Environnement

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :

```env
# Stripe (par défaut)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SumUp (optionnel)
SUMUP_CLIENT_ID=...
SUMUP_CLIENT_SECRET=...
SUMUP_WEBHOOK_SECRET=...

# PayPlug (optionnel)
PAYPLUG_SECRET_KEY=sk_live_...
PAYPLUG_WEBHOOK_SECRET=...

# Stancer (optionnel)
STANCER_SECRET_KEY=sk_live_...
STANCER_WEBHOOK_SECRET=...

# GoCardless (optionnel)
GOCARDLESS_ACCESS_TOKEN=live_...
GOCARDLESS_WEBHOOK_SECRET=...
```

---

## ⚙️ Configuration

### Configuration via l'Interface

1. Aller dans **Paramètres → Payment Providers**
2. Sélectionner le provider souhaité
3. Entrer les credentials (clés API)
4. Cliquer sur **Sauvegarder**

### Configuration via la Base de Données

```sql
-- Exemple: Configurer Stripe pour un utilisateur
INSERT INTO payment_provider_credentials (
  user_id,
  provider_type,
  credentials,
  is_active
) VALUES (
  'user-uuid',
  'stripe',
  '{"secretKey": "sk_live_..."}'::jsonb,
  true
);
```

---

## 💻 Utilisation

### Créer une Session de Paiement

```typescript
import { paymentService } from '@/services/PaymentService';

const session = await paymentService.createPaymentSession(
  {
    amount: 1000, // 10.00 EUR
    currency: 'EUR',
    customerEmail: 'client@example.com',
    customerName: 'John Doe',
    description: 'Paiement facture #123',
    successUrl: 'https://yourapp.com/payment/success',
    cancelUrl: 'https://yourapp.com/payment/error',
    invoiceId: 'invoice-uuid',
  },
  userId
);

// Rediriger vers session.checkoutUrl
window.location.href = session.checkoutUrl;
```

### Créer un Lien de Paiement

```typescript
const link = await paymentService.createPaymentLink(
  {
    amount: 1000,
    currency: 'EUR',
    description: 'Paiement devis #456',
  },
  userId
);

// Envoyer link.url par email
```

### Rembourser un Paiement

```typescript
const refund = await paymentService.refund(
  {
    paymentId: 'payment-id-from-provider',
    amount: 500, // Rembourser 5.00 EUR (optionnel, rembourse tout si non spécifié)
    reason: 'customer_request',
  },
  'stripe', // provider type
  userId
);
```

### Vérifier le Statut d'un Paiement

```typescript
const status = await paymentService.getPaymentStatus(
  'payment-id-from-provider',
  'stripe',
  userId
);

console.log(status.status); // 'succeeded', 'pending', 'failed', etc.
```

---

## 🔌 Ajouter un Nouveau Provider

### Étape 1: Créer l'Adapter

Créer `src/payment_providers/adapters/[provider]_adapter.ts` :

```typescript
import type { IPaymentProvider } from '../interfaces/IPaymentProvider';
import type { ... } from '../types/PaymentTypes';

export class NewProviderAdapter implements IPaymentProvider {
  public readonly name = 'New Provider';
  public readonly type = 'newprovider';
  
  // Implémenter toutes les méthodes de IPaymentProvider
  async initialize(config: PaymentProviderConfig): Promise<void> { ... }
  async createPaymentSession(params: PaymentSessionParams): Promise<PaymentSessionResult> { ... }
  // ... etc
}
```

### Étape 2: Ajouter au Registry

Dans `src/payment_providers/registry/PaymentProviderRegistry.ts` :

```typescript
import { NewProviderAdapter } from '../adapters/newprovider_adapter';

// Dans createProvider():
case 'newprovider':
  provider = new NewProviderAdapter();
  break;
```

### Étape 3: Ajouter le Type

Dans `src/payment_providers/types/PaymentTypes.ts` :

```typescript
export type PaymentProviderType = 
  | 'stripe' 
  | 'sumup' 
  | 'payplug' 
  | 'stancer' 
  | 'gocardless'
  | 'newprovider'; // Ajouter ici
```

### Étape 4: Mettre à Jour la Migration SQL

Dans `supabase/migrations/add_payment_providers.sql` :

```sql
-- Ajouter 'newprovider' dans les CHECK constraints
CHECK (provider_type IN ('stripe', 'sumup', 'payplug', 'stancer', 'gocardless', 'newprovider'))
```

### Étape 5: Ajouter l'UI

Dans `src/components/settings/PaymentProviderSettings.tsx` :

```typescript
const PROVIDER_INFO: Record<PaymentProviderType, ...> = {
  // ...
  newprovider: {
    name: 'New Provider',
    description: 'Description du provider',
    website: 'https://newprovider.com',
  },
};
```

---

## 🧪 Tests

### Tests Unitaires

```typescript
// Exemple: Tester l'adapter Stripe
import { StripeAdapter } from '@/payment_providers/adapters/stripe_adapter';

describe('StripeAdapter', () => {
  it('should create a payment session', async () => {
    const adapter = new StripeAdapter();
    await adapter.initialize({
      providerType: 'stripe',
      credentials: { secretKey: 'sk_test_...' },
      isActive: true,
    });

    const session = await adapter.createPaymentSession({
      amount: 1000,
      currency: 'EUR',
      customerEmail: 'test@example.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });

    expect(session.checkoutUrl).toBeDefined();
    expect(session.sessionId).toBeDefined();
  });
});
```

### Tests d'Intégration

```typescript
// Tester le PaymentService avec un provider mock
import { paymentService } from '@/services/PaymentService';

// Mock du registry
jest.mock('@/payment_providers/registry/PaymentProviderRegistry');

// Test
it('should use the correct provider', async () => {
  const session = await paymentService.createPaymentSession(
    { ... },
    userId
  );
  
  expect(session).toBeDefined();
});
```

### Tests End-to-End

1. Configurer un provider en staging
2. Créer une session de paiement
3. Compléter le paiement (mode test)
4. Vérifier que le webhook met à jour le statut

---

## 🔧 Dépannage

### Le Provider ne se Charge Pas

**Problème** : `Error: Provider not initialized`

**Solution** :
1. Vérifier que les credentials sont corrects
2. Vérifier que `is_active = true` dans la base
3. Vérifier les logs de l'Edge Function

### Les Webhooks ne Fonctionnent Pas

**Problème** : Les webhooks ne sont pas reçus

**Solution** :
1. Vérifier l'URL du webhook dans le dashboard du provider
2. Vérifier que le secret webhook est correct
3. Vérifier les logs de `payment-webhook` Edge Function

### Erreur de Signature Webhook

**Problème** : `Invalid webhook signature`

**Solution** :
1. Vérifier que le secret webhook correspond
2. Vérifier que le body n'est pas modifié (pas de parsing JSON avant vérification)
3. Vérifier l'implémentation de `verifyWebhook` dans l'adapter

---

## 📚 Ressources

### Documentation des Providers

- **Stripe** : https://stripe.com/docs
- **SumUp** : https://developer.sumup.com/
- **PayPlug** : https://docs.payplug.com/
- **Stancer** : https://docs.stancer.com/
- **GoCardless** : https://developer.gocardless.com/

### Support

Pour toute question ou problème, consulter :
- La documentation de l'architecture : `docs/PAYMENT-ARCHITECTURE.md`
- Les logs des Edge Functions dans Supabase Dashboard
- Les issues GitHub du projet

---

## ✅ Checklist de Déploiement

- [ ] Migration SQL exécutée
- [ ] Edge Functions déployées
- [ ] Variables d'environnement configurées
- [ ] Webhooks configurés dans les dashboards des providers
- [ ] Tests effectués en staging
- [ ] Documentation à jour
- [ ] Credentials chiffrés en production

---

**Architecture prête pour la production !** 🚀














