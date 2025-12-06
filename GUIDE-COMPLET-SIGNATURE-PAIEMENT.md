# 📋 Guide Complet : Signature + Paiement Conditionnel

## ✅ Système Implémenté

Ce système gère le workflow complet :
1. **Email avec lien de signature** → Client reçoit un email
2. **Page de signature** → Client signe le document
3. **Vérification des préférences** → L'app vérifie si le paiement est activé
4. **Envoi conditionnel du lien de paiement** → Si activé, le client reçoit le lien
5. **Suivi dans l'app** → Statut de signature et paiement visible

---

## 🗄️ Tables SQL

### Table `signatures`
- `id` : UUID unique
- `quote_id` / `invoice_id` : Référence au document
- `client_email` : Email du client
- `signed` : Boolean (signé ou non)
- `signed_at` : Date de signature
- `signature_link` : Lien unique de signature

### Table `payments`
- `id` : UUID unique
- `quote_id` / `invoice_id` : Référence au document
- `client_email` : Email du client
- `payment_link` : Lien unique de paiement
- `paid` : Boolean (payé ou non)
- `paid_at` : Date de paiement
- `payment_provider` : Provider utilisé (stripe, paypal, etc.)

### Colonnes ajoutées à `user_settings`
- `payment_enabled` : Boolean (paiement activé ou non)
- `payment_provider` : Provider configuré (stripe, paypal, etc.)
- `stripe_public_key` : Clé publique Stripe (optionnel)
- `stripe_secret_key` : Clé secrète Stripe (optionnel)

---

## 📝 Script SQL à Exécuter

Exécutez le script `supabase/CREATE-COMPLETE-SIGNATURE-PAYMENT-SYSTEM.sql` dans Supabase Dashboard → SQL Editor.

Ce script :
- ✅ Crée les tables `signatures` et `payments`
- ✅ Ajoute les colonnes nécessaires à `user_settings`
- ✅ Configure les RLS policies
- ✅ Crée les index pour les performances
- ✅ Crée les triggers pour `updated_at`

---

## 🔧 Configuration Utilisateur

### Activer le Paiement

Dans l'app, l'utilisateur doit configurer ses préférences de paiement :

1. Aller dans **Settings** → **Paiements**
2. Activer `payment_enabled`
3. Sélectionner un `payment_provider` (stripe, paypal, etc.)
4. Configurer les clés API si nécessaire

### Code Frontend (exemple)

```typescript
// Dans Settings.tsx ou un composant dédié
const { data: settings } = await supabase
  .from("user_settings")
  .select("payment_enabled, payment_provider")
  .eq("user_id", user.id)
  .single();

// Mettre à jour
await supabase
  .from("user_settings")
  .update({
    payment_enabled: true,
    payment_provider: "stripe",
    stripe_public_key: "pk_...",
  })
  .eq("user_id", user.id);
```

---

## 📧 Envoi d'Email avec Lien de Signature

### Créer une Signature

```typescript
import { createSignature } from "@/services/signatureService";

const signature = await createSignature({
  quoteId: "quote-uuid",
  clientEmail: "client@example.com",
  clientName: "Client Name",
});

// signature.signature_link contient le lien unique
```

### Envoyer l'Email

```typescript
import { sendEmail } from "@/services/emailService";

const emailHtml = `
  <p>Bonjour,</p>
  <p>Merci de signer votre devis en cliquant sur le lien ci-dessous :</p>
  <p><a href="${signature.signature_link}">Signer le devis</a></p>
  <p>Après signature, vous recevrez le lien de paiement si activé dans nos paramètres.</p>
`;

await sendEmail({
  to: signature.client_email,
  subject: "Votre devis à signer",
  html: emailHtml,
  type: "signature_request",
});
```

---

## ✍️ Page de Signature

### Route
- `/signature/:id` (où `id` est le `signature_id`)

### Fonctionnalités
- ✅ Affiche le devis/facture
- ✅ Bouton "Signer"
- ✅ Met à jour `signatures.signed = true`
- ✅ Vérifie automatiquement les préférences utilisateur
- ✅ Envoie le lien de paiement si activé
- ✅ Redirige vers le paiement ou affiche une confirmation

### Code
Le composant `src/pages/Signature.tsx` gère tout automatiquement.

---

## 💳 Génération Conditionnelle du Lien de Paiement

### Logique Automatique

Quand un document est signé :

1. **Vérification des préférences** :
   ```typescript
   const { data: userSettings } = await supabase
     .from("user_settings")
     .select("payment_enabled, payment_provider")
     .eq("user_id", quoteOwnerId)
     .single();
   ```

2. **Si activé** :
   - Crée une entrée dans `payments`
   - Génère un lien unique
   - Envoie un email au client

3. **Si non activé** :
   - Aucun lien de paiement n'est généré
   - Le client reçoit juste une confirmation de signature

### Edge Function

L'Edge Function `send-payment-link-after-signature` gère automatiquement :
- ✅ Vérification des préférences utilisateur
- ✅ Création du paiement si activé
- ✅ Envoi de l'email avec le lien

---

## 📊 Suivi dans l'App

### Vérifier le Statut de Signature

```typescript
import { useSignatureByQuoteId } from "@/hooks/useSignatures";

const { data: signature } = useSignatureByQuoteId(quoteId);

if (signature?.signed) {
  console.log("Signé le :", signature.signed_at);
}
```

### Vérifier le Statut de Paiement

```typescript
import { usePaymentByQuoteId } from "@/hooks/usePayments";

const { data: payment } = usePaymentByQuoteId(quoteId);

if (payment?.paid) {
  console.log("Payé le :", payment.paid_at);
}
```

### Afficher dans l'UI

```tsx
const { data: signature } = useSignatureByQuoteId(quoteId);
const { data: payment } = usePaymentByQuoteId(quoteId);

<div>
  <Badge variant={signature?.signed ? "success" : "secondary"}>
    {signature?.signed ? "Signé" : "Non signé"}
  </Badge>
  {signature?.signed && (
    <Badge variant={payment?.paid ? "success" : "warning"}>
      {payment?.paid ? "Payé" : "En attente de paiement"}
    </Badge>
  )}
</div>
```

---

## 🚀 Déploiement

### 1. Exécuter le Script SQL

Dans Supabase Dashboard → SQL Editor :
```sql
-- Copier le contenu de CREATE-COMPLETE-SIGNATURE-PAYMENT-SYSTEM.sql
```

### 2. Déployer les Edge Functions

```bash
supabase functions deploy send-payment-link-after-signature
```

### 3. Configurer les Variables d'Environnement

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :
```
VITE_APP_URL = https://votre-app.com
```

### 4. Tester

1. Créer un devis
2. Générer un lien de signature
3. Envoyer l'email
4. Signer le document
5. Vérifier que le lien de paiement est envoyé (si activé)

---

## ✅ Checklist

- [ ] Script SQL exécuté
- [ ] Tables `signatures` et `payments` créées
- [ ] Colonnes ajoutées à `user_settings`
- [ ] Edge Functions déployées
- [ ] Route `/signature/:id` ajoutée dans `App.tsx`
- [ ] Configuration utilisateur testée
- [ ] Envoi d'email testé
- [ ] Signature testée
- [ ] Paiement conditionnel testé
- [ ] Suivi dans l'app testé

---

## 🆘 Dépannage

### Le lien de paiement n'est pas envoyé

1. Vérifier que `payment_enabled = true` dans `user_settings`
2. Vérifier que `payment_provider` est configuré
3. Vérifier les logs de l'Edge Function `send-payment-link-after-signature`

### La signature ne fonctionne pas

1. Vérifier que la route `/signature/:id` est bien ajoutée
2. Vérifier les RLS policies sur la table `signatures`
3. Vérifier les logs dans la console

### Le suivi ne s'affiche pas

1. Vérifier que les hooks `useSignatureByQuoteId` et `usePaymentByQuoteId` sont utilisés
2. Vérifier que les queries sont invalidées après les mutations

---

**Le système est maintenant complet et prêt à être utilisé !** 🎉



