# 🚀 GUIDE COMPLET : Système de Paiement Stripe

## 📋 Vue d'Ensemble

Ce guide explique comment configurer et utiliser le système complet de paiement Stripe dans BTP Smart Pro.

### 🎯 Flow Métier

```
1️⃣ Devis créé
    ↓
2️⃣ Devis envoyé au client par email
    ↓
3️⃣ Client signe le devis électroniquement
    ↓ (OBLIGATOIRE)
4️⃣ Facture générée automatiquement
    ↓
5️⃣ Lien de paiement Stripe créé
    ↓
6️⃣ Email envoyé au client avec lien
    ↓
7️⃣ Client paye via Stripe Checkout
    ↓
8️⃣ Webhook Stripe → Mise à jour automatique
    ↓
9️⃣ Facture marquée "payée" ou "partiellement payée"
    ↓
🎉 Paiement complété
```

---

## 🛠️ PARTIE 1 : Configuration Initiale

### 1️⃣ Exécuter le Script SQL

**Dashboard Supabase** → **SQL Editor** → **New query**

Copie-colle **TOUT LE CONTENU** de `supabase/ADD-PAYMENT-FLOW-COLUMNS.sql` :

```sql
-- Le fichier complet ajoute :
-- - Colonnes à invoices (quote_id, amount_paid, amount_remaining, etc.)
-- - Colonnes à payments (stripe_session_id, payment_link, etc.)
-- - Contraintes CHECK mises à jour
-- - Index pour performances
-- - RLS policies
-- - Trigger auto pour mise à jour facture
```

**Clique sur "Run"** → Tu devrais voir :

```
✅ SYSTÈME DE PAIEMENT STRIPE CONFIGURÉ
Tables: invoices, payments
Colonnes Stripe ajoutées
RLS activé
Trigger auto-update facture créé
```

### 2️⃣ Déployer les Edge Functions

```bash
# Dans le terminal, depuis le dossier du projet :
npx supabase functions deploy create-payment-link
npx supabase functions deploy stripe-invoice-webhook
```

### 3️⃣ Configurer le Webhook Stripe

#### A. Créer le Webhook dans Stripe Dashboard

1. Va sur https://dashboard.stripe.com/webhooks
2. Clique sur **"Add endpoint"**
3. **Endpoint URL** : 
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/stripe-invoice-webhook
   ```
4. **Events to send** :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Clique sur **"Add endpoint"**

#### B. Récupérer le Signing Secret

Après création du webhook, tu verras un **"Signing secret"** qui commence par `whsec_...`

#### C. Ajouter le Secret dans Supabase

**Dashboard Supabase** → **Edge Functions** → **Settings** → **Secrets**

```bash
# Ou via CLI :
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_ton_secret_ici
```

---

## 💻 PARTIE 2 : Utilisation Frontend

### 1️⃣ Depuis un Devis Signé

Dans n'importe quel composant qui affiche un devis :

```tsx
import SendPaymentLinkButton from "@/components/invoices/SendPaymentLinkButton";

// Dans ton composant :
<SendPaymentLinkButton
  quoteId={quote.id}
  quoteSigned={quote.signed}
  clientEmail={quote.client_email}
  clientName={quote.client_name}
  totalAmount={quote.estimated_cost}
  amountPaid={0}
  onSuccess={() => {
    // Recharger les données
    console.log("Lien de paiement envoyé !");
  }}
/>
```

### 2️⃣ Depuis une Facture

```tsx
<SendPaymentLinkButton
  quoteId={invoice.quote_id}
  invoiceId={invoice.id}
  quoteSigned={true} // Déjà vérifié si facture existe
  clientEmail={invoice.client_email}
  clientName={invoice.client_name}
  totalAmount={invoice.amount}
  amountPaid={invoice.amount_paid || 0}
  onSuccess={() => {
    // Recharger la facture
  }}
/>
```

---

## 🎨 PARTIE 3 : Intégration dans les Pages

### A. Page Devis (`/quotes/:id`)

Après le tableau des détails du devis :

```tsx
{quote.signed && quote.signed_at && (
  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
    <p className="text-sm text-green-800 mb-3">
      ✅ Devis signé le {new Date(quote.signed_at).toLocaleDateString("fr-FR")}
    </p>
    <SendPaymentLinkButton
      quoteId={quote.id}
      quoteSigned={true}
      clientEmail={quote.client_email}
      clientName={quote.client_name}
      totalAmount={quote.estimated_cost}
      variant="default"
      size="default"
    />
  </div>
)}
```

### B. Page Factures (`/billing` - Section Factures)

Dans le tableau des factures, ajouter une colonne "Actions" :

```tsx
<TableCell>
  {invoice.status !== 'paid' && (
    <SendPaymentLinkButton
      quoteId={invoice.quote_id}
      invoiceId={invoice.id}
      quoteSigned={true}
      clientEmail={invoice.client_email}
      clientName={invoice.client_name}
      totalAmount={invoice.amount}
      amountPaid={invoice.amount_paid || 0}
      variant="ghost"
      size="sm"
    />
  )}
</TableCell>
```

### C. Page Paiements (`/billing` - Section Paiements)

Afficher l'historique des paiements :

```tsx
const { data: payments } = useQuery({
  queryKey: ['payments'],
  queryFn: async () => {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(*),
        quote:ai_quotes(*)
      `)
      .order('created_at', { ascending: false });
    return data;
  },
});

// Afficher dans un tableau :
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Date</TableHead>
      <TableHead>Facture</TableHead>
      <TableHead>Montant</TableHead>
      <TableHead>Type</TableHead>
      <TableHead>Statut</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {payments?.map((payment) => (
      <TableRow key={payment.id}>
        <TableCell>
          {new Date(payment.created_at).toLocaleDateString("fr-FR")}
        </TableCell>
        <TableCell>{payment.invoice?.invoice_number}</TableCell>
        <TableCell>
          {payment.amount.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}
        </TableCell>
        <TableCell>
          {payment.payment_type === 'total' ? 'Total' : 'Acompte'}
        </TableCell>
        <TableCell>
          <Badge variant={payment.status === 'completed' ? 'success' : 'warning'}>
            {payment.status}
          </Badge>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 🔐 PARTIE 4 : Sécurité

### Vérifications Automatiques

✅ **Le système vérifie automatiquement** :

1. **Devis signé** : Impossible de créer un lien si `quote.signed = false`
2. **Double paiement** : Vérifie `invoice.status !== 'paid'`
3. **Montant acompte** : Ne peut pas dépasser le restant à payer
4. **Montant reçu vs attendu** : Le webhook compare les montants
5. **Session Stripe unique** : `stripe_session_id` est UNIQUE en DB
6. **Permissions** : RLS activé sur `invoices` et `payments`

### Protection Webhook

```typescript
// Vérification signature Stripe (automatique)
const event = stripe.webhooks.constructEvent(
  body, 
  signature, 
  STRIPE_WEBHOOK_SECRET
);
// ✅ Si signature invalide → Erreur 400
```

---

## 🧪 PARTIE 5 : Tests

### Test 1 : Paiement Total

1. **Crée un devis** avec montant 1000€
2. **Envoie-le au client** (email)
3. **Signe le devis** (canvas signature)
4. **Clique sur "Envoyer lien de paiement"**
5. **Choisis "Paiement total"**
6. **Copie le lien** Stripe
7. **Ouvre le lien** dans un nouvel onglet
8. **Paye avec carte test** : `4242 4242 4242 4242`, date future, CVC quelconque
9. **Vérifie** :
   - ✅ Facture `status = 'paid'`
   - ✅ Paiement `status = 'completed'`
   - ✅ Devis `status = 'paid'`

### Test 2 : Acompte (30%)

1. **Même devis** (1000€)
2. **"Envoyer lien de paiement"** → **"Acompte"**
3. **Montant** : `300`
4. **Paye** la session
5. **Vérifie** :
   - ✅ Facture `status = 'partially_paid'`
   - ✅ Facture `amount_paid = 300`
   - ✅ Facture `amount_remaining = 700`
   - ✅ Paiement `status = 'completed'`, `amount = 300`

### Test 3 : 2ème Paiement (Solde)

1. **Depuis la même facture** (restant 700€)
2. **"Envoyer lien de paiement"** → **"Paiement total"** (auto = 700€)
3. **Paye**
4. **Vérifie** :
   - ✅ Facture `status = 'paid'`
   - ✅ Facture `amount_paid = 1000`
   - ✅ Facture `amount_remaining = 0`
   - ✅ 2 paiements dans la table `payments`

### Test 4 : Erreur - Devis Non Signé

1. **Crée un devis** SANS le signer
2. **Clique sur "Envoyer lien de paiement"**
3. **Vérifie** :
   - ✅ Bouton désactivé
   - ✅ Message d'erreur si forcé

### Test 5 : Erreur - Double Paiement

1. **Facture déjà payée** intégralement
2. **Clique sur "Envoyer lien de paiement"**
3. **Vérifie** :
   - ✅ Bouton désactivé
   - ✅ Message "Facture déjà payée"

---

## 📊 PARTIE 6 : Monitoring

### Vérifier les Webhooks

**Stripe Dashboard** → **Webhooks** → Clique sur ton endpoint

Tu verras :
- ✅ **Attempts** : Toutes les tentatives d'envoi
- ✅ **Response** : 200 si OK, 400/500 si erreur
- ✅ **Payload** : Données envoyées

### Logs Supabase

**Dashboard Supabase** → **Edge Functions** → **Logs**

Filtre par fonction :
- `create-payment-link`
- `stripe-invoice-webhook`

Tu verras tous les logs console.log :
```
✅ Devis trouvé et signé: abc-123
💰 Montant à payer: { paymentAmount: 1000, payment_type: 'total' }
✅ Stripe Checkout Session créée: cs_test_...
✅ Paiement créé en base: payment-id
```

### Vérifier en Base

```sql
-- Voir les paiements récents
SELECT 
  p.id,
  p.amount,
  p.status,
  p.payment_type,
  p.created_at,
  i.invoice_number,
  i.status as invoice_status
FROM payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Voir les factures avec montants
SELECT 
  id,
  invoice_number,
  amount as total,
  amount_paid,
  amount_remaining,
  status,
  created_at
FROM invoices
WHERE status != 'draft'
ORDER BY created_at DESC;
```

---

## 🔧 PARTIE 7 : Dépannage

### Problème : Webhook ne se déclenche pas

**Solution** :
1. Vérifie que l'URL webhook est correcte dans Stripe Dashboard
2. Vérifie que les événements cochés sont : `checkout.session.completed`, `payment_intent.succeeded`
3. Teste manuellement dans Stripe Dashboard → Webhooks → "Send test webhook"

### Problème : Erreur "Quote not signed"

**Solution** :
1. Vérifie que `ai_quotes.signed = true`
2. Vérifie que `ai_quotes.signed_at` est renseigné
3. Si besoin, exécute le script `EXECUTER-SQL-SIGNATURE.md` pour ajouter les colonnes

### Problème : Erreur "violates check constraint"

**Solution** :
1. Exécute `EXECUTER-FIX-STATUS.md` pour ajouter `'signed'` et `'paid'` aux contraintes
2. Vérifie que les statuts autorisés incluent : `draft`, `sent`, `signed`, `accepted`, `rejected`, `paid`, `cancelled`

### Problème : Montant incorrect dans facture

**Solution** :
1. Vérifie que `estimated_cost` est en TTC (pas HT)
2. Le trigger `update_invoice_remaining_amount()` recalcule automatiquement `amount_remaining`
3. Si nécessaire, reset manuellement :
   ```sql
   UPDATE invoices 
   SET amount_remaining = amount - COALESCE(amount_paid, 0)
   WHERE id = 'facture-id';
   ```

---

## 📚 PARTIE 8 : Améliorations Futures

### À Implémenter (Optionnel)

1. **Email automatique au client**
   - Utiliser `send-quote-email` ou créer `send-payment-email`
   - Inclure facture PDF en pièce jointe
   - Inclure le lien de paiement dans l'email

2. **Notifications push**
   - Notification admin quand paiement reçu
   - Notification client quand paiement confirmé

3. **Rappels automatiques**
   - Si `invoice.status = 'sent'` et date > due_date + 7 jours
   - Envoyer rappel par email

4. **Export comptable**
   - Export CSV/Excel des paiements
   - Export pour logiciel comptable

5. **Remboursements**
   - Interface pour créer un remboursement Stripe
   - Mise à jour automatique des montants

---

## ✅ CHECKLIST FINALE

Avant de considérer le système comme production-ready :

- [ ] ✅ Script SQL exécuté (`ADD-PAYMENT-FLOW-COLUMNS.sql`)
- [ ] ✅ Colonnes signature ajoutées (`EXECUTER-SQL-SIGNATURE.md`)
- [ ] ✅ Contraintes status fixées (`EXECUTER-FIX-STATUS.md`)
- [ ] ✅ Edge Functions déployées (`create-payment-link`, `stripe-invoice-webhook`)
- [ ] ✅ Webhook Stripe configuré dans Dashboard
- [ ] ✅ `STRIPE_WEBHOOK_SECRET` ajouté dans Supabase
- [ ] ✅ Composant `SendPaymentLinkButton` intégré dans les pages
- [ ] ✅ Tests paiement total réussi
- [ ] ✅ Tests acompte réussi
- [ ] ✅ Tests 2ème paiement réussi
- [ ] ✅ Tests erreurs (non signé, déjà payé) réussis
- [ ] ✅ Webhook vérifié dans Stripe Dashboard (tentatives, réponses)
- [ ] ✅ Logs Supabase vérifiés
- [ ] ✅ Données en DB correctes (factures, paiements)

---

## 🎯 RÉCAPITULATIF

Tu as maintenant :

✅ **Un système complet de paiement Stripe**  
✅ **Génération automatique de factures**  
✅ **Liens de paiement sécurisés**  
✅ **Support acomptes et paiements partiels**  
✅ **Webhooks pour mises à jour automatiques**  
✅ **Traçabilité complète en base de données**  
✅ **Sécurité : aucun paiement sans signature**  
✅ **Interface moderne et intuitive**  

**Flow complet : Signature → Facture → Paiement → Confirmation** 🚀

---

## 📞 Support

Si tu rencontres un problème :

1. **Vérifie les logs** Supabase Edge Functions
2. **Vérifie les webhooks** Stripe Dashboard
3. **Vérifie les données** SQL Editor (requêtes ci-dessus)
4. **Envoie-moi** :
   - Les logs de l'Edge Function
   - Le message d'erreur complet
   - Les captures d'écran du problème

Bon courage ! 🚀

