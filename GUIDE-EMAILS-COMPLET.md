# 📧 Guide Complet : Système d'Emails Optimisé

## ✅ Ce qui a été fait

### 1. **Service d'envoi unifié avec Resend**
- ✅ Edge Function `send-email` complètement fonctionnelle
- ✅ Intégration Resend API pour envois réels
- ✅ Gestion d'erreurs et retry automatique
- ✅ Logs dans `email_messages` pour traçabilité
- ✅ Signatures automatiques professionnelles

### 2. **Templates HTML modernes et responsive**
- ✅ `quote-email-modern.html` - Emails de devis
- ✅ `invoice-email-modern.html` - Emails de factures
- ✅ `signature-request-email.html` - Demandes de signature
- ✅ `payment-confirmation-email.html` - Confirmations de paiement
- ✅ Compatibles Gmail, Outlook, iPhone/Android
- ✅ Design professionnel avec dégradés et icônes
- ✅ Styles inline pour compatibilité maximale

### 3. **Système de signatures automatiques**
- ✅ Génération automatique avec logo et informations entreprise
- ✅ Signatures personnalisables dans les paramètres
- ✅ Responsive sur tous les appareils
- ✅ Intégrées automatiquement à tous les emails

### 4. **Validation des liens Stripe et signatures**
- ✅ Validation automatique des URLs Stripe
- ✅ Validation des liens de signature
- ✅ Service `emailTemplateService` pour gestion centralisée
- ✅ Fonctions helper pour créer des liens sécurisés

### 5. **Corrections des boutons**
- ✅ Bouton "Ajouter un compte" fonctionnel avec dialogue
- ✅ Bouton "Gérer les employés" redirige correctement
- ✅ Page Messagerie adaptée au mode démo

---

## 🚀 Configuration en 4 étapes

### Étape 1 : Configurer Resend (2 minutes)

#### 1.1 Créer un compte Resend
1. Allez sur https://resend.com
2. Créez un compte gratuit (100 emails/jour)
3. Vérifiez votre domaine (ou utilisez le domaine de test)

#### 1.2 Générer une clé API
1. Dans le dashboard Resend : **API Keys** → **Create API Key**
2. Copiez la clé (commence par `re_`)

#### 1.3 Ajouter la clé dans Supabase
1. Ouvrez **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. Cliquez sur **Secrets**
3. Ajoutez :
   - **Name** : `RESEND_API_KEY`
   - **Value** : Votre clé API Resend

### Étape 2 : Déployer les Edge Functions (3 minutes)

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref VOTRE_PROJECT_REF

# Déployer les fonctions
supabase functions deploy send-email
supabase functions deploy process-email-queue
supabase functions deploy stripe-create-payment-link

# Vérifier
supabase functions list
```

### Étape 3 : Configurer l'expéditeur (1 minute)

Dans **Supabase Dashboard** → **Edge Functions** → **Secrets**, ajoutez :

- **Name** : `FROM_EMAIL`
- **Value** : `noreply@votredomaine.com`

- **Name** : `FROM_NAME`
- **Value** : `BTP Smart Pro` (ou votre nom d'entreprise)

### Étape 4 : Configurer le Cron Job (optionnel)

Pour traiter automatiquement la queue d'emails :

1. Allez dans **Supabase Dashboard** → **Database** → **Cron Jobs**
2. Cliquez sur **New Cron Job**
3. Nom : `process-email-queue`
4. Schedule : `*/5 * * * *` (toutes les 5 minutes)
5. Command SQL :
```sql
SELECT net.http_post(
  url := 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/process-email-queue',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
  )
);
```

---

## 📝 Utilisation

### Envoyer un email de devis

```typescript
import { sendQuoteEmail } from "@/services/emailService";

await sendQuoteEmail({
  to: "client@example.com",
  quoteId: "quote-123",
  quoteNumber: "DEV-2024-001",
  clientName: "M. Martin",
  includePDF: true,
  includeSignatureLink: true,
  signatureUrl: "https://app.com/signature-quote/quote-123",
  customMessage: "Voici le devis pour vos travaux de rénovation.",
});
```

### Envoyer un email de facture

```typescript
import { sendInvoiceEmail } from "@/services/emailService";

await sendInvoiceEmail({
  to: "client@example.com",
  invoiceId: "inv-123",
  invoiceNumber: "FACT-2024-001",
  clientName: "M. Martin",
  includePDF: true,
  paymentLink: "https://checkout.stripe.com/...",
  signatureUrl: "https://app.com/signature/inv-123",
  customMessage: "Merci de procéder au règlement avant le 31/12/2024.",
});
```

### Envoyer une demande de signature

```typescript
import { sendSignatureRequestEmail } from "@/services/emailService";

await sendSignatureRequestEmail(
  "client@example.com",
  "invoice", // ou "quote"
  "FACT-2024-001",
  "M. Martin",
  "https://app.com/signature/inv-123",
  "Veuillez signer ce document pour validation."
);
```

### Envoyer une confirmation de paiement

```typescript
import { sendPaymentConfirmationEmail } from "@/services/emailService";

await sendPaymentConfirmationEmail(
  "client@example.com",
  "invoice",
  "FACT-2024-001",
  "M. Martin",
  1250.00,
  new Date()
);
```

---

## 🎨 Personnaliser les templates

### Modifier un template existant

1. Ouvrez le fichier template dans `templates/emails/`
2. Modifiez le HTML (respectez les styles inline)
3. Utilisez les variables avec `{{VARIABLE_NAME}}`
4. Testez l'envoi

### Variables disponibles

#### Communes à tous les templates
- `{{COMPANY_NAME}}` - Nom de l'entreprise
- `{{COMPANY_EMAIL}}` - Email de l'entreprise
- `{{COMPANY_PHONE}}` - Téléphone
- `{{COMPANY_SIRET}}` - SIRET
- `{{COMPANY_TVA}}` - Numéro TVA
- `{{CLIENT_NAME}}` - Nom du client
- `{{YEAR}}` - Année en cours

#### Devis
- `{{QUOTE_NUMBER}}` - Numéro de devis
- `{{WORK_TYPE}}` - Type de travaux
- `{{SURFACE}}` - Surface
- `{{ESTIMATED_COST}}` - Coût estimé
- `{{SIGNATURE_URL}}` - Lien de signature
- `{{CUSTOM_MESSAGE}}` - Message personnalisé

#### Factures
- `{{INVOICE_NUMBER}}` - Numéro de facture
- `{{INVOICE_DATE}}` - Date d'émission
- `{{DUE_DATE}}` - Date d'échéance
- `{{AMOUNT_TTC}}` - Montant TTC
- `{{PAYMENT_LINK}}` - Lien de paiement Stripe
- `{{SIGNATURE_URL}}` - Lien de signature
- `{{BANK_IBAN}}` - IBAN
- `{{BANK_BIC}}` - BIC

#### Blocs conditionnels

```html
{{#if PAYMENT_LINK}}
  <a href="{{PAYMENT_LINK}}">Payer maintenant</a>
{{/if}}
```

### Créer un nouveau template

1. Créez un fichier dans `templates/emails/mon-template.html`
2. Utilisez la structure de base :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon Template</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <!-- Votre contenu ici -->
      </td>
    </tr>
  </table>
</body>
</html>
```

3. Ajoutez une fonction dans `emailTemplateService.ts` :

```typescript
export async function generateMonTemplate(data: {
  clientName: string;
  // autres champs...
}): Promise<string> {
  return loadEmailTemplate("mon-template", data);
}
```

---

## 🔍 Vérification et tests

### Vérifier la configuration

```sql
-- Vérifier les emails en attente
SELECT * FROM email_queue WHERE status = 'pending' ORDER BY created_at DESC;

-- Vérifier les emails envoyés
SELECT * FROM email_queue WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 10;

-- Vérifier les emails échoués
SELECT * FROM email_queue WHERE status = 'failed' ORDER BY created_at DESC;
```

### Tester l'envoi

1. Allez dans **Paramètres** → **Email**
2. Configurez un compte email
3. Cliquez sur **Envoyer un test**
4. Vérifiez votre boîte de réception

### Déboguer les erreurs

#### Email non reçu
1. Vérifiez que `RESEND_API_KEY` est configuré
2. Vérifiez les logs : `supabase functions logs send-email`
3. Vérifiez la table `email_queue` pour les erreurs
4. Vérifiez les spams

#### Liens Stripe invalides
1. Vérifiez que `STRIPE_SECRET_KEY` est configuré
2. Vérifiez que la fonction `stripe-create-payment-link` est déployée
3. Testez le lien manuellement

#### Signature non visible
1. Vérifiez les paramètres utilisateur dans `user_settings`
2. Vérifiez que `signature_data` est défini
3. Rechargez la page des paramètres

---

## 📊 Statistiques et monitoring

### Taux d'envoi

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM email_queue
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Types d'emails les plus envoyés

```sql
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent
FROM email_queue
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY total DESC;
```

---

## 🛠️ Dépannage

### Problème : RESEND_API_KEY manquant

**Solution** : Ajoutez la clé dans Supabase Dashboard → Edge Functions → Secrets

### Problème : Emails en spam

**Solution** : 
1. Vérifiez votre domaine dans Resend
2. Configurez SPF, DKIM, DMARC
3. Évitez les mots "spam" dans l'objet

### Problème : Templates non chargés

**Solution** :
1. Vérifiez que les fichiers sont dans `public/templates/emails/`
2. Vérifiez les noms de fichiers (sensibles à la casse)
3. Rechargez l'application

### Problème : Signatures ne s'affichent pas

**Solution** :
1. Allez dans Paramètres → Email → Signature
2. Remplissez les informations
3. Cliquez sur "Enregistrer la signature"

---

## 📚 Ressources

- [Documentation Resend](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Email HTML Best Practices](https://www.campaignmonitor.com/css/)
- [Stripe Payment Links](https://stripe.com/docs/payment-links)

---

## ✅ Checklist de déploiement

- [ ] Compte Resend créé et vérifié
- [ ] Clé API Resend ajoutée dans Supabase
- [ ] Edge Functions déployées (send-email, process-email-queue)
- [ ] FROM_EMAIL et FROM_NAME configurés
- [ ] Templates copiés dans le dossier public
- [ ] Cron job créé (optionnel)
- [ ] Email de test envoyé et reçu
- [ ] Stripe configuré pour les paiements
- [ ] Signatures configurées dans les paramètres
- [ ] Documentation lue et comprise

---

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs : `supabase functions logs send-email`
2. Consultez la table `email_queue` pour les erreurs
3. Testez avec un email simple avant les cas complexes
4. Vérifiez que toutes les variables d'environnement sont configurées

**Version** : 2.0.0  
**Dernière mise à jour** : 29 novembre 2024


















