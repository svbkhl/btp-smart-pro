# 🔄 GUIDE : Paiement en Plusieurs Fois

## 📋 Vue d'Ensemble

Ce guide explique le système de **paiement échelonné** (2x, 3x, 4x, etc.) dans BTP Smart Pro.

### 🎯 Cas d'Usage

- Client ne peut pas payer le montant total immédiatement
- Étalement du paiement sur plusieurs mois
- Facilite l'encaissement pour les gros montants
- Alternative à l'acompte + solde

---

## 🔁 Flow Métier

```
1️⃣ Devis signé par le client
    ↓
2️⃣ Admin crée une facture
    ↓
3️⃣ Admin choisit "Paiement en plusieurs fois" (ex: 3x)
    ↓
4️⃣ Système génère 3 échéances automatiquement:
   - Échéance 1: 333.33€ - Aujourd'hui
   - Échéance 2: 333.33€ - Dans 30 jours
   - Échéance 3: 333.34€ - Dans 60 jours
    ↓
5️⃣ Lien de paiement généré pour l'échéance 1
    ↓
6️⃣ Email envoyé au client avec lien échéance 1
    ↓
7️⃣ Client paye l'échéance 1
    ↓
8️⃣ Webhook Stripe → Échéance 1 = "payé"
    ↓
9️⃣ Lien échéance 2 devient disponible (30j après échéance 1)
    ↓
🔁 Répète pour échéance 2, puis 3
    ↓
🎉 Toutes les échéances payées → Facture = "payée"
```

---

## 🛠️ Configuration Initiale

### 1️⃣ Exécuter le Script SQL

**Dashboard Supabase** → **SQL Editor** → **New query**

Copie-colle **TOUT LE CONTENU** de `supabase/ADD-PAYMENT-SCHEDULES.sql` :

```sql
-- Ce script crée :
-- - Table payment_schedules (échéancier)
-- - Colonnes payment_plan_type, installments_count dans invoices
-- - Colonnes schedule_id, installment_number dans payments
-- - Fonctions SQL : generate_payment_schedule(), is_previous_installment_paid(), etc.
-- - Trigger automatique pour mise à jour facture
-- - RLS policies
```

**Clique sur "Run"** → Tu devrais voir :

```
✅ SYSTÈME DE PAIEMENT EN PLUSIEURS FOIS
Table payment_schedules créée
Colonnes invoices/payments mises à jour
Fonctions utilitaires créées
Triggers automatiques configurés
RLS activé
```

### 2️⃣ Déployer l'Edge Function V2

```bash
# Dans le terminal :
npx supabase functions deploy create-payment-link-v2
```

**Note** : L'ancienne fonction `create-payment-link` reste valide. La V2 ajoute juste le support des paiements fractionnés.

### 3️⃣ Le Webhook est Déjà Configuré

Si tu as suivi `GUIDE-COMPLET-PAIEMENT-STRIPE.md`, le webhook `stripe-invoice-webhook` est déjà déployé et configuré.

✅ Il gère automatiquement les échéances maintenant.

---

## 💻 Utilisation Frontend

### A. Composant SendPaymentLinkButton (Amélioré)

Le composant existant a été amélioré avec une 3ème option : "Paiement en plusieurs fois".

```tsx
<SendPaymentLinkButton
  quoteId={quote.id}
  invoiceId={invoice.id}
  quoteSigned={quote.signed}
  clientEmail={quote.client_email}
  clientName={quote.client_name}
  totalAmount={quote.estimated_cost}
  amountPaid={invoice.amount_paid || 0}
  onSuccess={() => {
    // Recharger les données
  }}
/>
```

**Ce qui a changé** :
- ✅ Nouveau type : `"installments"`
- ✅ Select pour choisir 2x, 3x, 4x, 5x, 6x, 12x
- ✅ Calcul automatique du montant par échéance
- ✅ Appelle `create-payment-link-v2`

### B. Nouveau Composant : PaymentScheduleDisplay

Affiche l'échéancier complet pour une facture.

```tsx
import PaymentScheduleDisplay from "@/components/invoices/PaymentScheduleDisplay";

// Dans ta page Facture :
<PaymentScheduleDisplay
  invoiceId={invoice.id}
  onScheduleUpdate={() => {
    // Callback optionnel après envoi d'un lien
  }}
/>
```

**Features** :
- ✅ Liste toutes les échéances
- ✅ Badge statut (payé / en attente / en cours / en retard)
- ✅ Bouton "Envoyer lien" par échéance
- ✅ Désactivé si l'échéance précédente n'est pas payée
- ✅ Résumé : X/N payées, montant payé/restant

---

## 🎨 Intégration dans les Pages

### Page Factures (`/billing`)

```tsx
import PaymentScheduleDisplay from "@/components/invoices/PaymentScheduleDisplay";

// Dans le détail d'une facture :
{invoice.payment_plan_type === 'installments' && (
  <PaymentScheduleDisplay 
    invoiceId={invoice.id} 
    onScheduleUpdate={refetch}
  />
)}
```

### Page Devis (`/quotes/:id`)

Après signature du devis, proposer les 3 types de paiement :

```tsx
{quote.signed && (
  <SendPaymentLinkButton
    quoteId={quote.id}
    quoteSigned={true}
    clientEmail={quote.client_email}
    clientName={quote.client_name}
    totalAmount={quote.estimated_cost}
  />
)}
```

L'admin pourra choisir :
1. **Paiement total** (1x)
2. **Acompte** (montant custom)
3. **Paiement en plusieurs fois** (2x, 3x, 4x...)

---

## 🔐 Sécurité

### Vérifications Automatiques

✅ **Le système vérifie automatiquement** :

1. **Échéance précédente payée** :
   ```sql
   SELECT is_previous_installment_paid(invoice_id, installment_number);
   ```
   - ✅ Si `FALSE` → Erreur : "Previous installment must be paid first"

2. **Contrainte UNIQUE** :
   ```sql
   UNIQUE (invoice_id, installment_number)
   ```
   - ✅ Impossible de créer 2 fois la même échéance

3. **Session Stripe unique** :
   ```sql
   stripe_session_id TEXT UNIQUE
   ```
   - ✅ Aucun double paiement

4. **Montant total correct** :
   ```sql
   -- La dernière échéance compense les erreurs d'arrondi
   last_installment_amount = total - (installment_amount * (count - 1))
   ```

5. **RLS activé** :
   - ✅ Chaque user ne voit que ses propres échéances

---

## 🧪 Tests

### Test 1 : Paiement en 3x

1. **Crée un devis** avec montant 1000€
2. **Signe le devis**
3. **Clique sur "Envoyer lien de paiement"**
4. **Choisis "Paiement en plusieurs fois" → "3 fois"**
5. **Clique "Envoyer le lien"**
6. **Vérifie en DB** :
   ```sql
   SELECT * FROM payment_schedules WHERE invoice_id = 'ton-invoice-id' ORDER BY installment_number;
   ```
   Tu devrais voir :
   ```
   installment_1: 333.33€, due_date: aujourd'hui, status: processing
   installment_2: 333.33€, due_date: +30j, status: pending
   installment_3: 333.34€, due_date: +60j, status: pending
   ```

7. **Copie le lien** de l'échéance 1
8. **Ouvre dans nouvel onglet**
9. **Paye avec carte test** : `4242 4242 4242 4242`
10. **Vérifie** :
    - ✅ Échéance 1 `status = 'paid'`
    - ✅ Facture `installments_paid = 1`
    - ✅ Facture `status = 'partially_paid'`
    - ✅ Facture `amount_paid = 333.33`
    - ✅ Facture `amount_remaining = 666.67`

### Test 2 : Payer l'échéance 2

1. **Dans l'interface**, clique sur **"Envoyer lien"** pour l'échéance 2
2. **Copie le lien**
3. **Paye**
4. **Vérifie** :
    - ✅ Échéance 2 `status = 'paid'`
    - ✅ Facture `installments_paid = 2`
    - ✅ Facture `amount_paid = 666.66`

### Test 3 : Payer l'échéance 3 (Solde)

1. **Envoie et paye** l'échéance 3
2. **Vérifie** :
    - ✅ Échéance 3 `status = 'paid'`
    - ✅ Facture `installments_paid = 3`
    - ✅ Facture `status = 'paid'`
    - ✅ Facture `amount_paid = 1000.00`
    - ✅ Facture `amount_remaining = 0`

### Test 4 : Erreur - Payer Échéance 3 AVANT Échéance 2

1. **Essaye d'envoyer le lien** de l'échéance 3 AVANT que l'échéance 2 soit payée
2. **Vérifie** :
    - ✅ Bouton "Envoyer lien" **désactivé** (si pas de lien déjà généré)
    - ✅ Si force via API : Erreur "Previous installment must be paid first"

---

## 📊 Monitoring

### Vérifier les Échéances en DB

```sql
-- Voir toutes les échéances d'une facture
SELECT 
  installment_number,
  total_installments,
  amount,
  due_date,
  status,
  paid_at,
  payment_link IS NOT NULL as has_link
FROM payment_schedules
WHERE invoice_id = 'ton-invoice-id'
ORDER BY installment_number;

-- Statistiques par facture
SELECT 
  i.invoice_number,
  i.installments_count as total,
  i.installments_paid as paid,
  i.installments_count - i.installments_paid as remaining,
  i.status
FROM invoices i
WHERE i.payment_plan_type = 'installments'
ORDER BY i.created_at DESC;

-- Voir les échéances en retard (overdue)
SELECT 
  ps.*,
  i.invoice_number
FROM payment_schedules ps
LEFT JOIN invoices i ON ps.invoice_id = i.id
WHERE ps.status = 'pending'
AND ps.due_date < CURRENT_DATE
ORDER BY ps.due_date;
```

### Logs Webhook

**Supabase Dashboard** → **Edge Functions** → **Logs** → Filtre `stripe-invoice-webhook`

Tu verras :
```
💰 [checkout.session.completed] session_id: cs_test_...
✅ Paiement trouvé: payment-id
📅 Paiement lié à une échéance: schedule-id
✅ Échéance marquée comme payée
💡 Échéance suivante trouvée: schedule-id-2
📧 TODO: Envoyer email avec lien de paiement échéance 2
✅ Facture mise à jour
```

---

## 🔧 Dépannage

### Problème : Échéance précédente non payée mais lien quand même envoyé

**Solution** :
1. Vérifie que la fonction SQL `is_previous_installment_paid()` existe :
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'is_previous_installment_paid';
   ```
2. Si manquante, exécute `ADD-PAYMENT-SCHEDULES.sql`

### Problème : Montant total incorrect (erreur d'arrondi)

**Solution** :
Le script gère automatiquement les arrondis. La **dernière échéance** compense :
```sql
last_installment_amount = total_amount - (installment_amount * (count - 1))
```

Exemple (1000€ en 3x) :
- Échéance 1 : 333.33€
- Échéance 2 : 333.33€
- Échéance 3 : 333.34€ ← Compense +0.01€
- **Total** : 1000.00€ ✅

### Problème : Webhook ne met pas à jour l'échéance

**Solution** :
1. Vérifie que le paiement a bien `schedule_id` renseigné
2. Vérifie les logs du webhook (Supabase Dashboard)
3. Si `schedule_id = null`, le webhook skip la logique des échéances

---

## 📧 Email Automatique (TODO)

Actuellement, après paiement d'une échéance, le lien suivant **n'est PAS** envoyé automatiquement.

**Deux options** :

### Option 1 : Manuel (actuel)
L'admin voit l'échéance suivante dans l'interface et clique sur "Envoyer lien".

### Option 2 : Automatique (à implémenter)

Créer une Edge Function `send-installment-email` :

```typescript
// supabase/functions/send-installment-email/index.ts
export async function sendInstallmentEmail(scheduleId: string) {
  // 1. Récupérer l'échéance
  const schedule = await getSchedule(scheduleId);
  
  // 2. Générer le lien de paiement
  const paymentLink = await createPaymentLink(schedule);
  
  // 3. Envoyer l'email
  await sendEmail({
    to: schedule.client_email,
    subject: `Échéance ${schedule.installment_number}/${schedule.total_installments} - Facture ${schedule.invoice_number}`,
    body: `...lien: ${paymentLink}...`,
  });
}
```

Appeler depuis le webhook après paiement :
```typescript
// Dans stripe-invoice-webhook/index.ts
if (nextSchedule) {
  await supabase.functions.invoke('send-installment-email', {
    body: { schedule_id: nextSchedule.id }
  });
}
```

---

## 📚 Améliorations Futures

1. **Rappels automatiques**
   - Si échéance impayée après `due_date + 7 jours`
   - Envoyer email de rappel

2. **Échéances en retard**
   - Cron job quotidien
   - Marquer `status = 'overdue'` si `due_date < now()`

3. **Modification du plan**
   - Permettre à l'admin de modifier une échéance impayée
   - Changement de montant, date, annulation

4. **Dashboard analytics**
   - Taux de paiement des échéances
   - Échéances en retard
   - Revenus prévisionnels

5. **Pénalités de retard**
   - Ajouter des frais si échéance en retard > X jours

---

## ✅ CHECKLIST FINALE

Avant de considérer le système comme production-ready :

- [ ] ✅ Script SQL exécuté (`ADD-PAYMENT-SCHEDULES.sql`)
- [ ] ✅ Edge Function déployée (`create-payment-link-v2`)
- [ ] ✅ Webhook déjà configuré (si `GUIDE-COMPLET-PAIEMENT-STRIPE.md` fait)
- [ ] ✅ Composant `SendPaymentLinkButton` intégré
- [ ] ✅ Composant `PaymentScheduleDisplay` intégré
- [ ] ✅ Test paiement 3x réussi
- [ ] ✅ Test paiement hors ordre (erreur attendue)
- [ ] ✅ Logs webhook vérifiés
- [ ] ✅ Données DB correctes (échéances, facture)
- [ ] 📧 Email automatique échéance suivante (optionnel)

---

## 🎯 RÉCAPITULATIF

Tu as maintenant :

✅ **Paiement en plusieurs fois (2x à 12x)**  
✅ **Génération automatique du plan de paiement**  
✅ **Liens de paiement individuels par échéance**  
✅ **Sécurité : respect de l'ordre des échéances**  
✅ **Webhook automatique pour mise à jour**  
✅ **Interface admin pour gérer l'échéancier**  
✅ **Traçabilité complète en base de données**  

**Flow complet : Signature → Facture → Plan 3x → Paiement échéance par échéance** 🔄

---

## 📞 Support

Si tu rencontres un problème :

1. **Vérifie les logs** Supabase Edge Functions
2. **Vérifie les échéances** en DB (requêtes SQL ci-dessus)
3. **Vérifie le webhook** Stripe Dashboard
4. **Envoie-moi** :
   - Les logs de l'Edge Function
   - Le message d'erreur complet
   - Les screenshots du problème

Bon courage ! 🚀

