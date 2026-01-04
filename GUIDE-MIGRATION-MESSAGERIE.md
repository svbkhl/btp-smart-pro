

# 📧 GUIDE MIGRATION MESSAGERIE - SYSTÈME COMPLET

## 🎯 OBJECTIF

Remplacer l'ancien système de messagerie par une architecture propre, centralisée et fiable.

---

## ✅ CE QUI A ÉTÉ CRÉÉ

### 1️⃣ Nouvelle table `messages`
**Fichier** : `supabase/migrations/20260104_create_messages_table_v2.sql`

Structure propre et cohérente:
- ✅ Colonnes bien nommées (`recipient_email`, `subject`, `body`, etc.)
- ✅ Types de messages (`quote`, `invoice`, `payment_link`, `signature`, `reminder`, `confirmation`)
- ✅ Statuts (`pending`, `sent`, `delivered`, `opened`, `failed`)
- ✅ Liens vers clients et documents
- ✅ Pièces jointes (JSONB)
- ✅ Messages immuables (audit trail)
- ✅ Index pour performances

### 2️⃣ MessageService centralisé
**Fichier** : `src/services/messageService.ts`

Service unique pour TOUS les envois d'emails:
- `sendMessage()` - Envoie + enregistrement automatique
- `getMessages()` - Récupération avec filtres
- `getMessagesByDocument()` - Messages d'un document
- `markAsDelivered()`, `markAsOpened()` - Suivi

### 3️⃣ Adapters pour migration progressive
**Fichier** : `src/services/emailAdapters.ts`

Wrappers compatibles avec le code existant:
- `sendQuoteEmail()` - Envoi de devis
- `sendInvoiceEmail()` - Envoi de facture
- `sendPaymentLinkEmail()` - Envoi de lien de paiement
- `sendConfirmationEmail()` - Confirmations
- `sendReminderEmail()` - Relances

### 4️⃣ Nouvelle page Messagerie
**Fichier** : `src/pages/MessagingNew.tsx`

Interface moderne et professionnelle:
- 📊 Statistiques en temps réel
- 🔍 Recherche et filtres avancés
- 📧 Liste chronologique
- 👁️ Modal détail avec contenu complet
- 🔗 Liens directs vers documents

**Route mise à jour** : `/messaging` → `MessagingNew`

---

## 🚀 ÉTAPES D'INSTALLATION

### Étape 1 : Exécuter la migration SQL

1. **Ouvrir SQL Editor Supabase** :
   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

2. **Copier le contenu de** :
   `supabase/migrations/20260104_create_messages_table_v2.sql`

3. **Exécuter** (Click "Run")

4. **Vérifier** :
```sql
SELECT count(*) FROM messages;
-- Doit retourner 0 (table vide mais créée)

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public';
-- Doit lister toutes les colonnes
```

---

## 🔄 MIGRATION PROGRESSIVE DES ENVOIS EXISTANTS

### Option 1 : Utiliser les adapters (RECOMMANDÉ)

**Avant** :
```typescript
// Ancien code utilisant Edge Function directement
await supabase.functions.invoke('send-email', {
  body: {
    to: clientEmail,
    subject: `Devis ${quoteNumber}`,
    html: emailHtml,
    quote_id: quoteId,
  }
});
```

**Après** :
```typescript
// Nouveau code utilisant l'adapter
import { sendQuoteEmail } from '@/services/emailAdapters';

await sendQuoteEmail({
  quoteId,
  quoteNumber,
  clientEmail,
  clientName,
  clientId,
  includePDF: true,
  includeSignatureLink: true,
  signatureUrl,
});
```

**Avantages** :
- ✅ Enregistrement automatique dans `messages`
- ✅ Lien automatique avec le client et le document
- ✅ Mise à jour automatique du statut du document
- ✅ Historique complet dans la Messagerie

---

### Option 2 : Utiliser MessageService directement

Pour plus de contrôle :

```typescript
import { sendMessage } from '@/services/messageService';

await sendMessage({
  messageType: 'quote',
  recipientEmail: clientEmail,
  recipientName: clientName,
  subject: `Devis ${quoteNumber}`,
  body: messageText,
  bodyHtml: messageHtml,
  clientId,
  documentId: quoteId,
  documentType: 'quote',
  documentNumber: quoteNumber,
  attachments: [{
    name: `Devis-${quoteNumber}.pdf`,
    url: pdfUrl,
    type: 'application/pdf',
    size: pdfSize,
  }],
});
```

---

## 📝 REFACTORISATION FICHIER PAR FICHIER

### 1. SendToClientModal.tsx

**Fichier** : `src/components/billing/SendToClientModal.tsx`

**Remplacer** :
```typescript
// Ancien import
import { sendQuoteEmailFromUser } from "@/services/sendQuoteEmailService";
```

**Par** :
```typescript
// Nouveau import
import { sendQuoteEmail, sendInvoiceEmail } from "@/services/emailAdapters";
```

**Modifier la logique d'envoi** :
```typescript
// AVANT
if (documentType === "quote") {
  await sendQuoteEmailFromUser({
    quoteId: document.id,
    quoteNumber: document.quote_number,
    clientEmail: email,
    clientName: document.client_name,
    includePDF,
  });
}

// APRÈS
if (documentType === "quote") {
  const result = await sendQuoteEmail({
    quoteId: document.id,
    quoteNumber: document.quote_number || document.id,
    clientEmail: email,
    clientName: document.client_name || "Client",
    clientId: document.client_id,
    includePDF,
    includeSignatureLink,
    signatureUrl,
  });
  
  if (!result.success) {
    throw new Error(result.error);
  }
}
```

**Supprimer** :
```typescript
// Ces lignes ne sont plus nécessaires
await trackEmailSent(documentType, document.id, email, subject);
```

**Pourquoi ?** `sendQuoteEmail()` gère déjà l'enregistrement ET la mise à jour du statut !

---

### 2. PaymentsTab.tsx (Liens de paiement)

**Fichier** : `src/components/payments/PaymentsTab.tsx`

**Ajouter l'import** :
```typescript
import { sendPaymentLinkEmail } from "@/services/emailAdapters";
```

**Remplacer l'envoi** :
```typescript
// AVANT
await supabase.functions.invoke('send-payment-link-email', {
  body: {
    quote_id: quoteId,
    payment_url: paymentUrl,
    client_email: clientEmail,
    client_name: clientName,
    amount,
    payment_type,
  }
});

// APRÈS
const result = await sendPaymentLinkEmail({
  quoteId,
  quoteNumber: quote.quote_number || quoteId.substring(0, 8),
  clientEmail,
  clientName,
  clientId: quote.client_id,
  paymentUrl,
  amount,
  paymentType,
});

if (!result.success) {
  toast.error(result.error || "Erreur lors de l'envoi de l'email");
  return;
}
```

---

### 3. Autres envois à refactoriser

**Chercher dans le projet** :
```bash
# Trouver tous les appels directs aux Edge Functions
grep -r "supabase.functions.invoke('send" src/
grep -r "sendQuoteEmailFromUser" src/
grep -r "sendInvoiceEmail" src/
grep -r "send-email" src/
```

**Pour chaque occurrence, remplacer par l'adapter approprié !**

---

## 🔗 AJOUTER LIENS VERS MESSAGERIE

### Dans QuoteDetail.tsx

Ajouter un bouton pour voir l'historique des messages :

```typescript
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';

const navigate = useNavigate();

// Dans le JSX
<Button
  variant="outline"
  onClick={() => navigate(`/messaging?quote=${quoteId}`)}
>
  <Mail className="w-4 h-4 mr-2" />
  Voir les messages
</Button>
```

### Dans InvoiceDetail.tsx (similaire)

```typescript
<Button
  variant="outline"
  onClick={() => navigate(`/messaging?invoice=${invoiceId}`)}
>
  <Mail className="w-4 h-4 mr-2" />
  Voir les messages
</Button>
```

### Modifier MessagingNew.tsx pour accepter les filtres URL

Dans `src/pages/MessagingNew.tsx`, ajouter :

```typescript
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();
const quoteIdFilter = searchParams.get('quote');
const invoiceIdFilter = searchParams.get('invoice');

// Appliquer le filtre
const { data: messagesData } = useQuery({
  queryKey: ["messages", quoteIdFilter, invoiceIdFilter],
  queryFn: () => getMessages({
    documentId: quoteIdFilter || invoiceIdFilter || undefined,
  }),
});
```

---

## 🧪 TESTS APRÈS MIGRATION

### Test 1 : Envoi de devis

1. **Créer un devis** → IA → Nouveau devis
2. **Envoyer par email** → Click "Envoyer"
3. **Vérifier Messagerie** → `/messaging`
   - ✅ Le message apparaît
   - ✅ Type: "Devis"
   - ✅ Lié au bon client
   - ✅ Numéro du devis affiché
4. **Click sur le message** → Modal s'ouvre
   - ✅ Contenu complet visible
   - ✅ Bouton "Voir le document" fonctionne

### Test 2 : Lien de paiement

1. **Créer un lien de paiement**
2. **Envoyer par email**
3. **Vérifier Messagerie** → Type: "Lien de paiement"

### Test 3 : Filtres

1. **Utiliser la recherche** → Chercher par email client
2. **Filtrer par type** → Sélectionner "Devis"
3. **Filtrer par statut** → Sélectionner "Envoyé"

### Test 4 : Statistiques

1. **Vérifier les KPIs** → Haut de page
   - Total messages
   - Envoyés
   - Lus
   - Échecs

---

## 🗑️ NETTOYAGE APRÈS MIGRATION

### Fichiers à supprimer (après migration complète)

```bash
# Anciens services (une fois tous remplacés)
rm src/services/sendQuoteEmailService.ts
rm src/services/statusTrackingService.ts

# Ancienne page Messagerie
rm src/pages/Messaging.tsx

# Anciens hooks email_messages
rm src/hooks/useEmailMessages.ts
rm src/hooks/useInboxEmails.ts
```

### Edge Functions à supprimer (sur Supabase Dashboard)

Après migration complète, supprimer :
- ❌ `send-email-from-user` (remplacé par send-email + MessageService)
- ❌ `send-payment-link-email` (remplacé par adapter)

**Garder** :
- ✅ `send-email` (utilisé par MessageService)

---

## 📊 CHECKLIST FINALE

### Migration complète

- [ ] Migration SQL exécutée
- [ ] Table `messages` créée et vide
- [ ] Nouvelle page Messagerie accessible (`/messaging`)
- [ ] Envoi de devis refactorisé (SendToClientModal)
- [ ] Envoi de facture refactorisé
- [ ] Envoi de lien de paiement refactorisé
- [ ] Liens "Voir dans Messagerie" ajoutés
- [ ] Tests complets passés
- [ ] Anciens fichiers supprimés
- [ ] Anciennes Edge Functions supprimées

### Tests de non-régression

- [ ] Envoi de devis fonctionne
- [ ] Envoi de facture fonctionne
- [ ] Envoi de lien de paiement fonctionne
- [ ] Tous les emails apparaissent dans Messagerie
- [ ] Filtres et recherche fonctionnent
- [ ] Modal détail fonctionne
- [ ] Liens vers documents fonctionnent
- [ ] Statistiques exactes

---

## 🎯 RÉSULTAT FINAL

Après migration complète :

✅ **Un seul point d'entrée** pour TOUS les envois d'emails (MessageService)

✅ **Historique complet** de toutes les communications dans Messagerie

✅ **Traçabilité parfaite** (qui, quoi, quand, à qui)

✅ **Liens bidirectionnels** :
- Document → Messages liés
- Message → Document d'origine

✅ **Architecture évolutive** prête pour :
- Réponses clients
- Messagerie bidirectionnelle
- Notifications internes
- Webhooks

✅ **Performance optimisée** (index, pagination)

✅ **Sécurité garantie** (RLS, messages immuables)

---

## 💡 PROCHAINES ÉVOLUTIONS POSSIBLES

1. **Réponses clients** : Permettre aux clients de répondre aux emails
2. **Notifications push** : Alertes quand un email est ouvert
3. **Templates personnalisables** : Créer des modèles d'emails
4. **Pièces jointes multiples** : Joindre plusieurs documents
5. **Messagerie interne** : Communication entre collaborateurs
6. **Webhooks** : Notifications vers services externes
7. **Analytics** : Taux d'ouverture, de clic, etc.

---

## 🚀 COMMENCER MAINTENANT

**Étape 1** : Exécute la migration SQL
**Étape 2** : Teste la nouvelle page Messagerie
**Étape 3** : Refactorise un fichier à la fois
**Étape 4** : Teste après chaque refactorisation

**BON COURAGE ! 🎉**
