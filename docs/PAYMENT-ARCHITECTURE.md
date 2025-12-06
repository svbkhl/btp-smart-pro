# 🏗️ Architecture Multi-Fournisseurs de Paiement

## 📋 Vue d'ensemble

Cette architecture permet de supporter plusieurs fournisseurs de paiement (Stripe, SumUp, PayPlug, Stancer, GoCardless) de manière modulaire et extensible.

## 🎯 Principes de Conception

1. **Interface Unifiée** : Tous les providers implémentent la même interface `IPaymentProvider`
2. **Factory Pattern** : Un registre de providers charge le bon adapter selon les paramètres
3. **Séparation des Responsabilités** : Chaque provider est isolé dans son propre adapter
4. **Rétrocompatibilité** : Stripe continue de fonctionner exactement comme avant
5. **Extensibilité** : Ajouter un nouveau provider = créer un nouvel adapter

## 📁 Structure des Fichiers

```
src/
├── payment_providers/
│   ├── interfaces/
│   │   └── IPaymentProvider.ts          # Interface de base
│   ├── adapters/
│   │   ├── stripe_adapter.ts            # Stripe (existant, refactorisé)
│   │   ├── sumup_adapter.ts             # SumUp
│   │   ├── payplug_adapter.ts           # PayPlug
│   │   ├── stancer_adapter.ts           # Stancer
│   │   └── gocardless_adapter.ts        # GoCardless
│   ├── registry/
│   │   └── PaymentProviderRegistry.ts   # Factory pour charger les providers
│   └── types/
│       └── PaymentTypes.ts              # Types partagés
├── services/
│   └── PaymentService.ts                # Service unifié (utilise les adapters)
└── components/
    └── settings/
        └── PaymentProviderSettings.tsx  # UI pour configurer les providers

supabase/
├── functions/
│   ├── create-payment-session/
│   │   └── index.ts                     # Utilise PaymentService
│   └── payment-webhook/
│       └── index.ts                     # Route les webhooks vers le bon provider
└── migrations/
    └── add_payment_providers.sql        # Tables pour stocker les providers
```

## 🔌 Interface IPaymentProvider

Tous les adapters doivent implémenter cette interface :

```typescript
interface IPaymentProvider {
  // Créer une session de paiement
  createPaymentSession(params: PaymentSessionParams): Promise<PaymentSessionResult>;
  
  // Créer un lien de paiement
  createPaymentLink(params: PaymentLinkParams): Promise<PaymentLinkResult>;
  
  // Rembourser un paiement
  refund(paymentId: string, amount?: number): Promise<RefundResult>;
  
  // Vérifier un webhook
  verifyWebhook(request: Request, secret: string): Promise<WebhookEvent>;
  
  // Récupérer le statut d'un paiement
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  
  // Créer un client
  createCustomer(customerData: CustomerData): Promise<CustomerResult>;
}
```

## 🏭 PaymentProviderRegistry

Le registre charge le bon provider selon :
1. Les paramètres de l'entreprise (`user_settings.payment_provider`)
2. Les credentials stockés (`payment_provider_credentials`)
3. Le contexte (invoice, quote, etc.)

## 🔐 Stockage des Credentials

Les credentials sont stockés de manière chiffrée dans `payment_provider_credentials` :
- `provider_type` : 'stripe' | 'sumup' | 'payplug' | 'stancer' | 'gocardless'
- `credentials` : JSON chiffré avec les clés API
- `is_active` : booléen pour activer/désactiver
- `company_id` : Lien vers l'entreprise

## 🔄 Flux de Paiement

1. **Client clique sur "Payer"**
   → `PaymentButton` appelle `PaymentService.createPayment()`

2. **PaymentService**
   → Récupère le provider configuré pour l'entreprise
   → Charge l'adapter correspondant via le Registry
   → Appelle `adapter.createPaymentSession()`

3. **Adapter**
   → Crée la session avec l'API du provider
   → Retourne l'URL de checkout

4. **Client redirigé**
   → Vers le checkout du provider

5. **Webhook**
   → Reçu par `payment-webhook` Edge Function
   → Routé vers le bon adapter selon le provider
   → Mise à jour du statut dans la base

## 📊 Base de Données

### Table `payment_provider_credentials`
Stocke les credentials chiffrés pour chaque entreprise.

### Table `payments`
Enrichie avec :
- `provider_type` : Le provider utilisé
- `provider_payment_id` : ID du paiement côté provider
- `provider_session_id` : ID de session côté provider

## 🚀 Ajouter un Nouveau Provider

1. Créer `src/payment_providers/adapters/[provider]_adapter.ts`
2. Implémenter `IPaymentProvider`
3. Ajouter le type dans `PaymentProviderRegistry`
4. Créer les Edge Functions pour les webhooks si nécessaire
5. Ajouter l'UI dans `PaymentProviderSettings`

## ✅ Tests

Chaque adapter doit être testable indépendamment :
- Tests unitaires pour chaque méthode
- Tests d'intégration avec les APIs mockées
- Tests end-to-end avec les vrais providers (en staging)







