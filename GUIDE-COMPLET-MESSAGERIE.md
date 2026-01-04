# 📧 GUIDE COMPLET : MESSAGERIE ET HISTORIQUE DES EMAILS

## 🎯 OBJECTIF

Tous les emails envoyés depuis l'application doivent apparaître dans **Messagerie → Envoyés**.

---

## ✅ CE QUI EST DÉJÀ FAIT

### 1. **Base de données**
La table `email_messages` existe et contient les colonnes nécessaires :
- `user_id` : ID de l'utilisateur
- `recipient_email` : Email du destinataire
- `subject` : Sujet de l'email
- `body_html` : Contenu HTML
- `body_text` : Contenu texte
- `email_type` : Type d'email (`quote_sent`, `signature_request`, `payment_link`, `generic`)
- `status` : Statut (`sent`, `failed`)
- `external_id` : ID Resend
- `sent_at` : Date d'envoi
- `quote_id` : ID du devis (si applicable)
- `invoice_id` : ID de la facture (si applicable)

### 2. **Edge Functions modifiées**

Toutes les fonctions d'envoi d'email enregistrent maintenant dans `email_messages` :

#### ✅ `send-email-from-user`
```typescript
// Ligne 514-525
await supabaseClient.from("email_messages").insert({
  user_id: user.id,
  recipient_email: clientEmail,
  subject: `Devis ${quoteNumber} - ${clientName}`,
  body_html: emailHtml,
  body_text: emailText,
  email_type: emailType, // "signature_request" ou "quote_sent"
  status: "sent",
  external_id: result.email_id,
  sent_at: new Date().toISOString(),
  quote_id: quoteId,
});
```

#### ✅ `send-payment-link-email`
```typescript
// Ligne 250-278
await supabaseClient.from('email_messages').insert({
  user_id: user.id,
  recipient_email: client_email,
  subject: `💳 Votre lien de paiement - ${quote.quote_number}`,
  body_html: htmlTemplate,
  body_text: `Votre lien de paiement: ${payment_url}`,
  email_type: 'payment_link',
  status: 'sent',
  external_id: resendData.id,
  sent_at: new Date().toISOString(),
  quote_id: quote_id,
});
```

#### ✅ `send-email`
```typescript
// Ligne 435-499
await supabaseClient.from("email_messages").insert({
  user_id: user.id,
  recipient_email: to,
  subject,
  body_html: htmlWithSignature,
  body_text: textWithSignature,
  email_type: emailType, // Déterminé automatiquement
  status: "sent",
  external_id: emailId,
  sent_at: new Date().toISOString(),
  invoice_id: invoice_id,
  quote_id: quote_id,
});
```

### 3. **Page Messagerie**

La page `Messaging.tsx` charge déjà les emails depuis `email_messages` pour le dossier "Envoyés" :

```typescript
// Ligne 154-176
const emailMessagesData = await supabaseClient
  .from('email_messages')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .order('sent_at', { ascending: false })
  .range(0, 49);
```

---

## ❌ LE PROBLÈME

**Les fonctions Edge ne sont pas déployées sur Supabase !**

Sans déploiement, les anciennes versions (sans enregistrement dans `email_messages`) continuent de s'exécuter.

---

## ✅ LA SOLUTION

### **Option 1 : Script automatique (RECOMMANDÉ)**

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
./deploy-all-email-functions.sh
```

Ce script :
1. ✅ Corrige les permissions npm automatiquement
2. ✅ Déploie les 3 fonctions email
3. ✅ Vérifie que tout est déployé
4. ✅ Affiche des instructions de test

---

### **Option 2 : Commandes manuelles**

#### 1. Corriger npm permissions
```bash
sudo chown -R $(whoami) ~/.npm
```

#### 2. Aller dans le projet
```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
```

#### 3. Déployer les fonctions une par une
```bash
npx supabase functions deploy send-email-from-user --no-verify-jwt
npx supabase functions deploy send-payment-link-email --no-verify-jwt
npx supabase functions deploy send-email --no-verify-jwt
```

#### 4. Vérifier
```bash
npx supabase functions list
```

Tu dois voir les 3 fonctions listées !

---

## 🧪 TESTER APRÈS DÉPLOIEMENT

### Test 1 : Envoi de devis

1. **Créer un devis**
   ```
   IA → Nouveau devis IA
   Client: Test Messagerie
   Email: ton-email@gmail.com
   → Créer
   ```

2. **Envoyer le devis**
   ```
   Click sur le devis → Page détail
   Click "Envoyer"
   → Envoyer par email
   ```

3. **Vérifier la messagerie**
   ```
   Messagerie → Envoyés
   → L'email DOIT apparaître ! ✅
   ```

### Test 2 : Lien de paiement

1. **Créer un lien de paiement**
   ```
   Facturation → Paiements
   Section orange "Devis signés"
   Click "Créer lien"
   ```

2. **Envoyer par email**
   ```
   Click "Envoyer par email"
   → Envoyer
   ```

3. **Vérifier la messagerie**
   ```
   Messagerie → Envoyés
   → L'email DOIT apparaître ! ✅
   ```

---

## 🔍 VÉRIFICATION EN SQL

Si la messagerie reste vide, vérifie en SQL que les emails sont bien enregistrés :

### 1. Ouvrir SQL Editor
https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

### 2. Vérifier les emails
```sql
SELECT 
  created_at,
  email_type,
  recipient_email,
  subject,
  status,
  external_id
FROM email_messages
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

### Résultats possibles :

#### ✅ Si des emails apparaissent
→ Les fonctions sont déployées et fonctionnent !
→ Le problème est dans l'affichage (cache navigateur)
→ **Solution** : Ouvre en mode incognito (Cmd+Shift+N)

#### ❌ Si 0 résultats
→ Les fonctions ne sont pas déployées ou ne s'exécutent pas
→ **Solution** : Redéploie les fonctions et réessaye

---

## 🐛 DÉPANNAGE

### Problème 1 : Cache navigateur
**Symptôme** : Les emails sont en SQL mais pas dans l'UI

**Solution** :
```bash
# Option 1 : Mode incognito
Cmd + Shift + N (Chrome/Brave)
Cmd + Shift + P (Firefox)
Cmd + Shift + N (Safari)

# Option 2 : Vider le cache
Cmd + Shift + R (hard refresh)
Ou
Ouvrir DevTools (F12) → Network → Disable cache
```

### Problème 2 : Permissions npm
**Symptôme** : `EPERM` lors du déploiement

**Solution** :
```bash
sudo chown -R $(whoami) ~/.npm
```

### Problème 3 : Fonction pas déployée
**Symptôme** : L'email s'envoie mais n'apparaît pas dans email_messages (SQL)

**Solution** :
1. Vérifier que la fonction est listée :
   ```bash
   npx supabase functions list
   ```
2. Redéployer :
   ```bash
   npx supabase functions deploy send-email-from-user --no-verify-jwt
   ```
3. Vérifier les logs Supabase :
   ```
   Dashboard → Edge Functions → [Nom de la fonction] → Logs
   ```

### Problème 4 : Erreur 400/500
**Symptôme** : L'email ne s'envoie pas du tout

**Solution** :
1. Vérifier les variables d'environnement Supabase :
   - `RESEND_API_KEY` : Clé API Resend (production)
   - `FROM_EMAIL` ou `RESEND_FROM_EMAIL` : Email vérifié
2. Vérifier les logs dans la console F12
3. Vérifier les logs Supabase

---

## 📊 ARCHITECTURE COMPLÈTE

```
Frontend (React)
    ↓
    └─ Envoyer devis
        ↓
        send-email-from-user (Edge Function)
        ↓
        ├─ Envoyer via Resend API ✅
        └─ INSERT dans email_messages ✅
            ↓
            Messagerie (React)
            ↓
            SELECT * FROM email_messages
            ↓
            Affichage dans "Envoyés" ✅
```

---

## 📋 RÉCAPITULATIF

### Ce qui fonctionne déjà :
✅ Table `email_messages` créée
✅ Edge Functions modifiées pour enregistrer
✅ Page Messagerie charge depuis `email_messages`
✅ Scripts de déploiement créés

### Ce qu'il faut faire :
🔧 Déployer les Edge Functions
🧪 Tester l'envoi d'email
✅ Vérifier dans Messagerie → Envoyés

---

## 🚀 ACTION IMMÉDIATE

**Copie-colle dans ton terminal :**

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
./deploy-all-email-functions.sh
```

**Puis :**
1. Envoie un devis de test
2. Vérifie Messagerie → Envoyés
3. Si ça marche, c'est terminé ! ✅
4. Si ça marche pas, vérifie en SQL (requête ci-dessus)

---

## 💡 POURQUOI C'ÉTAIT VIDE AVANT ?

```
Avant déploiement :
  Envoi email → Ancienne fonction (pas d'enregistrement) → Messagerie vide ❌

Après déploiement :
  Envoi email → Nouvelle fonction → INSERT email_messages → Messagerie ✅
```

---

**🎯 OBJECTIF FINAL :**

Chaque fois qu'un email est envoyé (devis, signature, paiement, facture), il apparaît automatiquement dans **Messagerie → Envoyés** avec :
- 📧 Destinataire
- 📄 Sujet
- 🕐 Date d'envoi
- 🏷️ Type (Devis, Paiement, Signature)
- ✅ Statut (Envoyé)

**C'EST DÉJÀ CODÉ, IL SUFFIT DE DÉPLOYER ! 🚀**
