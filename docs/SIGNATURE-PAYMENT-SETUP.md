# Guide de Configuration - Signature Électronique et Paiement

Ce guide explique comment configurer et déployer la page de signature électronique et paiement.

## 📁 Structure des fichiers

```
public/
├── signature-payment.html    # Page HTML principale
├── signature-payment.css     # Styles
└── signature-payment.js      # Logique JavaScript
```

## 🚀 Déploiement rapide

### Option 1 : Fichiers statiques

1. Copiez les 3 fichiers dans votre dossier `public/`
2. Accédez à : `https://votre-domaine.com/signature-payment.html?quote_id=123`

### Option 2 : Intégration React (recommandé)

Intégrez la logique dans votre composant React existant `PaymentPage.tsx`.

## ⚙️ Configuration Backend

### 1. Endpoint pour charger un devis

**Route :** `GET /api/quotes/:id` ou utiliser Supabase directement

**Réponse attendue :**
```json
{
  "id": "quote-123",
  "quote_number": "DEV-2024-001",
  "client_name": "Jean Dupont",
  "client_email": "jean.dupont@example.com",
  "estimated_cost": 1500.00,
  "currency": "EUR",
  "created_at": "2024-01-15T10:00:00Z",
  "details": {
    "description": "Description du devis"
  }
}
```

### 2. Endpoint pour enregistrer la signature

**Route :** `POST /api/signatures`

**Body :**
```json
{
  "quote_id": "quote-123",
  "signer_name": "Jean Dupont",
  "signature_data": "data:image/png;base64,iVBORw0KG...",
  "signed_at": "2024-01-15T10:30:00Z"
}
```

**Réponse :**
```json
{
  "id": "sig-123",
  "quote_id": "quote-123",
  "status": "signed",
  "signed_at": "2024-01-15T10:30:00Z"
}
```

**Implémentation Supabase :**
```typescript
// Dans votre Edge Function ou directement depuis le frontend
const { data, error } = await supabase
  .from('signatures')
  .insert({
    quote_id: payload.quote_id,
    signer_name: payload.signer_name,
    signature_data: payload.signature_data, // Stocker en base64 ou dans storage
    signed: true,
    signed_at: new Date().toISOString(),
  })
  .select()
  .single();
```

### 3. Endpoint pour créer la session Stripe

**Route :** `POST /api/payments/create-session` ou Edge Function `create-public-payment-session`

**Body :**
```json
{
  "quote_id": "quote-123",
  "signature_id": "sig-123",
  "amount": 1500.00,
  "currency": "EUR",
  "customer_email": "jean.dupont@example.com",
  "customer_name": "Jean Dupont"
}
```

**Réponse :**
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "session_id": "cs_test_abc123",
  "payment_id": "pay_xyz789"
}
```

**Implémentation Stripe (Edge Function) :**
```typescript
// supabase/functions/create-public-payment-session/index.ts
const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    mode: 'payment',
    payment_method_types: 'card',
    line_items: JSON.stringify([{
      price_data: {
        currency: 'eur',
        product_data: {
          name: `Devis ${quote.quote_number}`,
        },
        unit_amount: Math.round(amount * 100),
      },
      quantity: '1',
    }]),
    customer_email: customerEmail,
    success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/payment/error`,
  }),
});
```

## 🔧 Variables d'environnement

### Frontend (.env)
```env
VITE_APP_URL=https://votre-domaine.com
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

### Backend (Supabase Secrets)
```env
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
PUBLIC_URL=https://votre-domaine.com
```

## 📊 Base de données

### Table `signatures`
```sql
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES ai_quotes(id),
  invoice_id UUID REFERENCES invoices(id),
  signer_name TEXT NOT NULL,
  signature_data TEXT, -- Base64 ou URL vers storage
  signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMPTZ,
  payment_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES ai_quotes(id),
  invoice_id UUID REFERENCES invoices(id),
  signature_id UUID REFERENCES signatures(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 🔗 Intégration avec votre application

### 1. Modifier `signature-payment.js`

Remplacez les fonctions de simulation par de vrais appels API :

```javascript
// Dans loadQuote()
const { data, error } = await supabase
  .from('ai_quotes')
  .select('*')
  .eq('id', CONFIG.QUOTE_ID)
  .single();

// Dans handleSignatureSubmit()
const { data, error } = await supabase
  .from('signatures')
  .insert(signaturePayload)
  .select()
  .single();

// Dans handlePayment()
const { data, error } = await supabase.functions.invoke(
  'create-public-payment-session',
  { body: paymentPayload }
);
```

### 2. Routes dans votre application

Ajoutez dans `App.tsx` :
```tsx
<Route path="/signature-payment" element={<SignaturePaymentPage />} />
```

Ou utilisez directement :
```tsx
<Route path="/payment/quote/:id" element={<PaymentPage />} />
```

## 🧪 Tests

### Test local
1. Ouvrez `signature-payment.html` dans un navigateur
2. Les données de démo seront utilisées automatiquement
3. Testez la signature et le flux de paiement

### Test avec données réelles
1. Passez un `quote_id` réel dans l'URL
2. Vérifiez que le devis se charge depuis Supabase
3. Testez l'enregistrement de la signature
4. Testez la création de la session Stripe

## 📝 Logs et Debugging

La console affiche tous les événements :
- `🚀 Application initialisée`
- `📥 Chargement du devis...`
- `✅ Devis chargé`
- `✍️ Soumission de la signature...`
- `💳 Initiation du paiement...`
- `✅ Session de paiement créée`

## 🔒 Sécurité

1. **Validation côté serveur** : Toujours valider les données sur le backend
2. **RLS (Row Level Security)** : Configurez les politiques Supabase pour limiter l'accès
3. **Tokens** : Utilisez des tokens uniques pour chaque lien de paiement
4. **HTTPS** : Assurez-vous que tout passe en HTTPS en production

## 🎨 Personnalisation

### Modifier les couleurs
Éditez `signature-payment.css` :
```css
:root {
  --primary-color: #3b82f6; /* Votre couleur principale */
  --success-color: #10b981;
}
```

### Modifier le texte
Éditez `signature-payment.html` pour changer les labels et messages.

## ✅ Checklist de déploiement

- [ ] Fichiers copiés dans `public/`
- [ ] Variables d'environnement configurées
- [ ] Edge Functions déployées sur Supabase
- [ ] Clés Stripe configurées
- [ ] Tables de base de données créées
- [ ] RLS configuré pour les tables
- [ ] Test avec un devis réel
- [ ] Test du flux complet signature → paiement
- [ ] URLs de redirection configurées dans Stripe

## 🆘 Dépannage

### La signature ne s'affiche pas
- Vérifiez que le canvas est bien initialisé
- Testez sur un navigateur moderne (Chrome, Firefox, Safari)

### Le paiement ne fonctionne pas
- Vérifiez les clés Stripe dans les variables d'environnement
- Vérifiez les logs de l'Edge Function dans Supabase Dashboard
- Assurez-vous que les URLs de redirection sont correctes

### Le devis ne se charge pas
- Vérifiez que l'ID du devis est correct dans l'URL
- Vérifiez les politiques RLS sur la table `ai_quotes`
- Vérifiez les logs de la console pour les erreurs







