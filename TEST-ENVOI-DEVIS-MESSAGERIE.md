# 📧 TEST ENVOI DEVIS → MESSAGERIE

## ✅ BONNE NOUVELLE !

La fonction `send-email-from-user` **enregistre déjà** tous les emails envoyés dans la messagerie ! 🎉

```typescript
// Ligne 514-525 dans send-email-from-user/index.ts
await supabaseClient.from("email_messages").insert({
  user_id: user.id,
  recipient_email: clientEmail,
  subject: `Devis ${quoteNumber} - ${clientName}`,
  body_html: emailHtml,
  body_text: emailText,
  email_type: emailType,  // "signature_request" ou "quote_sent"
  status: "sent",
  external_id: result.email_id,
  sent_at: new Date().toISOString(),
  quote_id: quoteId,
});
```

---

## 🎯 TYPES D'EMAILS TRACKÉS

Tous ces emails apparaissent dans "Messagerie → Envoyés" :

| Type d'email | Détecté quand | Icône |
|--------------|---------------|-------|
| **Devis avec signature** | Email contient `/sign/` | 📝 |
| **Devis simple** | Email de devis sans signature | 📄 |
| **Lien de paiement** | Envoyé via `send-payment-link-email` | 💳 |
| **Facture** | Email de facture | 🧾 |
| **Confirmation signature** | Après qu'un client signe | ✅ |

---

## 🚀 ÉTAPE 1: DÉPLOYER LA FONCTION

La fonction doit être déployée sur Supabase :

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

# Déployer send-email-from-user
npx supabase functions deploy send-email-from-user --no-verify-jwt
```

**Si erreur `npm EPERM` :**
```bash
# Donner permissions
sudo chown -R $(whoami) ~/.npm

# Réessayer
npx supabase functions deploy send-email-from-user --no-verify-jwt
```

---

## 🧪 ÉTAPE 2: TESTER L'ENVOI

### Mode Incognito (pour éviter cache)
```
Cmd + Shift + N
```

### Workflow complet:

```
1. Aller sur https://www.btpsmartpro.com
2. Se connecter
3. Créer un devis:
   ┌────────────────────────────┐
   │ IA → Créer devis           │
   │ Client: Test Email         │
   │ Email: ton-email@gmail.com │ ← Ton email pour tester
   │ Montant: 1000              │
   │ → Créer                    │
   └────────────────────────────┘

4. Envoyer le devis par email:
   ┌────────────────────────────┐
   │ Facturation → Devis        │
   │ Trouver le devis créé      │
   │ Click ✉️ "Envoyer"         │
   │ Vérifier email pré-rempli  │
   │ → Envoyer                  │
   └────────────────────────────┘

5. Vérifier la messagerie:
   ┌────────────────────────────┐
   │ Messagerie → Envoyés       │
   │ → Email doit apparaître !  │
   └────────────────────────────┘
```

---

## 🔍 VÉRIFIER EN SQL

Si l'email n'apparaît pas dans la messagerie, vérifie en SQL :

### Ouvrir SQL Editor Supabase
```
https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
```

### Query 1: Compter les emails
```sql
SELECT COUNT(*) as total_emails
FROM email_messages
WHERE user_id = auth.uid();
```

### Query 2: Voir les derniers emails
```sql
SELECT 
  created_at,
  email_type,
  recipient_email,
  subject,
  status
FROM email_messages
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

### Query 3: Vérifier les emails de type devis
```sql
SELECT 
  created_at,
  email_type,
  recipient_email,
  subject,
  quote_id
FROM email_messages
WHERE user_id = auth.uid()
  AND email_type IN ('quote_sent', 'signature_request')
ORDER BY created_at DESC;
```

---

## 🐛 PROBLÈMES POSSIBLES

### 1️⃣ Messagerie vide après envoi

**Cause:** Fonction pas déployée ou erreur silencieuse

**Solution:**
```bash
# Redéployer la fonction
npx supabase functions deploy send-email-from-user --no-verify-jwt

# Vérifier les logs
# Dashboard Supabase → Edge Functions → send-email-from-user → Logs
```

### 2️⃣ Erreur lors de l'envoi

**Cause:** Configuration email manquante

**Solution:**
```
1. Aller dans Paramètres → Email
2. Configurer ton compte email
3. Réessayer l'envoi
```

### 3️⃣ Email envoyé mais pas dans messagerie

**Cause:** Problème d'insertion dans `email_messages`

**Solution:**
```sql
-- Vérifier les RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'email_messages';

-- Doit avoir une policy pour INSERT
```

---

## 📊 DIAGNOSTIC COMPLET

Copie-colle ça dans la console (F12) **sur la page Messagerie** :

```javascript
// Vérifier l'état de la messagerie
console.log("🔍 Diagnostic Messagerie");

// 1. Vérifier si fake data est activé
const fakeData = localStorage.getItem('fake-data-enabled');
console.log("Mode démo:", fakeData);

// 2. Vérifier la connexion Supabase
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

// 3. Tester la requête email_messages
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const { data: session } = await supabase.auth.getSession();
console.log("User ID:", session?.session?.user?.id);

const { data, error, count } = await supabase
  .from('email_messages')
  .select('*', { count: 'exact' })
  .eq('user_id', session?.session?.user?.id)
  .order('created_at', { ascending: false });

console.log("Emails trouvés:", count);
console.log("Données:", data);
console.log("Erreur:", error);
```

---

## ✅ RÉSULTAT ATTENDU

Après avoir envoyé un devis :

### Dans Messagerie → Envoyés
```
┌─────────────────────────────────────┐
│ 📧 DEVIS-2026-004 - Test Email      │
│ À: ton-email@gmail.com              │
│ 📝 Envoyé il y a 2 minutes          │
│ Type: Signature request             │
└─────────────────────────────────────┘
```

### Détails de l'email
```
Objet: Devis DEVIS-2026-004 - Test Email
Contenu: HTML avec lien de signature
Pièce jointe: PDF du devis (si activé)
```

---

## 🎯 WORKFLOW COMPLET

```mermaid
1. Créer devis
   ↓
2. Click "Envoyer par email"
   ↓
3. send-email-from-user appelée
   ↓
4. Email envoyé via Resend
   ↓
5. INSERT dans email_messages
   ↓
6. Email visible dans Messagerie → Envoyés
   ↓
7. ✅ SUCCESS !
```

---

## 🆘 SI ÇA NE MARCHE TOUJOURS PAS

Envoie-moi :
1. **Screenshot de la console** (F12) après envoi de devis
2. **Screenshot des logs** Supabase Edge Function
3. **Résultat de la query SQL** `SELECT * FROM email_messages`

---

**🚀 ACTION: DÉPLOIE LA FONCTION ET TESTE L'ENVOI ! 🚀**

```bash
npx supabase functions deploy send-email-from-user --no-verify-jwt
```

**Puis envoie un devis de test et vérifie la messagerie !** ✨
