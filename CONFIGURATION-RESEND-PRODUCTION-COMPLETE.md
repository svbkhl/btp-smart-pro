# 🚀 Configuration Resend en Production - Guide Complet

## 📋 Objectif

Configurer Resend pour envoyer des emails depuis `contact@btpsmartpro.com` (ou votre domaine vérifié) vers n'importe quel destinataire, sans limitation du mode test.

---

## ✅ Étape 1 : Vérifier le Domaine sur Resend

### 1.1 Accéder à Resend Domains

1. **Connectez-vous** à https://resend.com
2. Allez dans **Domains** : https://resend.com/domains
3. Vérifiez que `btpsmartpro.com` est présent et **Verified** ✅

### 1.2 Si le Domaine n'est pas Vérifié

1. Cliquez sur **Add Domain**
2. Entrez : `btpsmartpro.com`
3. Cliquez sur **Add**

### 1.3 Ajouter les Enregistrements DNS

Resend vous donnera des enregistrements DNS à ajouter dans votre hébergeur de domaine :

#### SPF (TXT)
```
v=spf1 include:resend.com ~all
```

#### DKIM (TXT)
Resend génère automatiquement 3 enregistrements TXT pour DKIM. Ajoutez-les tous.

#### MX (optionnel, pour recevoir des emails)
```
10 feedback-smtp.resend.com
```

### 1.4 Vérifier le Domaine

1. Attendez 5-15 minutes (parfois jusqu'à 48h pour la propagation DNS)
2. Rechargez la page Resend Domains
3. Le statut devrait passer à **Verified** ✅

---

## ✅ Étape 2 : Créer une Clé API de Production

### 2.1 Créer la Clé

1. Allez dans **API Keys** : https://resend.com/api-keys
2. Cliquez sur **Create API Key**
3. **Nom** : `BTP Smart Pro Production`
4. **Permission** : `Sending access` (ou `Full access`)
5. Cliquez sur **Create**
6. **COPIEZ LA CLÉ** (elle ne sera affichée qu'une seule fois !)

⚠️ **Important** : 
- Utilisez une clé API de **production** (commence par `re_` mais pas `re_test_`)
- Les clés de test limitent l'envoi à votre propre adresse email

### 2.2 Vérifier le Type de Clé

- ✅ **Clé de production** : `re_AbCdEf123456...` (sans `test`)
- ❌ **Clé de test** : `re_test_AbCdEf123456...` (avec `test`)

---

## ✅ Étape 3 : Configurer dans Supabase

### 3.1 Accéder aux Secrets

1. Allez dans **Supabase Dashboard** : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Edge Functions** → **Secrets**

### 3.2 Ajouter/Modifier les Secrets

Ajoutez ou modifiez ces secrets :

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxx (votre clé API de production)
RESEND_FROM_EMAIL = contact@btpsmartpro.com
FROM_NAME = BTP Smart Pro
```

### 3.3 Vérifier les Secrets

Assurez-vous que :
- ✅ `RESEND_API_KEY` est une clé de **production** (pas de test)
- ✅ `RESEND_FROM_EMAIL` utilise le domaine **vérifié** (`btpsmartpro.com`)
- ✅ Le domaine de `RESEND_FROM_EMAIL` correspond au domaine vérifié sur Resend

---

## ✅ Étape 4 : Créer l'Adresse Email (Optionnel mais Recommandé)

### 4.1 Pourquoi Créer l'Adresse Réelle ?

Bien que Resend n'exige pas que l'adresse existe physiquement, créer `contact@btpsmartpro.com` permet :
- ✅ D'éviter les rejets SMTP
- ✅ De recevoir les réponses des clients
- ✅ D'améliorer la réputation du domaine

### 4.2 Créer l'Adresse

1. **Dans votre hébergeur de domaine** (ex: OVH, Gandi, etc.)
2. Allez dans **Email** ou **Mail**
3. Créez une nouvelle boîte : `contact@btpsmartpro.com`
4. Configurez un mot de passe
5. (Optionnel) Configurez un forward vers votre email principal

---

## ✅ Étape 5 : Redéployer les Edge Functions

### 5.1 Redéployer send-email

```bash
supabase functions deploy send-email
```

### 5.2 Redéployer send-email-from-user

```bash
supabase functions deploy send-email-from-user
```

### 5.3 Via Supabase Dashboard

1. Allez dans **Edge Functions**
2. Sélectionnez chaque fonction
3. Cliquez sur **Deploy** ou **Update**

---

## ✅ Étape 6 : Vérifier la Configuration

### 6.1 Script de Vérification

Créez un fichier `verify-resend-config.ts` :

```typescript
// Vérifier que RESEND_FROM_EMAIL est bien configuré
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

console.log("🔍 Vérification de la configuration Resend:");
console.log("RESEND_FROM_EMAIL:", RESEND_FROM_EMAIL);
console.log("RESEND_API_KEY:", RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 10)}...` : "NON CONFIGURÉ");

if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY n'est pas configuré");
} else if (RESEND_API_KEY.includes("test")) {
  console.warn("⚠️ Vous utilisez une clé API de TEST. Utilisez une clé de PRODUCTION.");
} else {
  console.log("✅ Clé API de production détectée");
}

if (!RESEND_FROM_EMAIL) {
  console.error("❌ RESEND_FROM_EMAIL n'est pas configuré");
} else if (!RESEND_FROM_EMAIL.includes("@btpsmartpro.com")) {
  console.warn("⚠️ RESEND_FROM_EMAIL n'utilise pas le domaine vérifié btpsmartpro.com");
} else {
  console.log("✅ RESEND_FROM_EMAIL utilise le domaine vérifié");
}
```

### 6.2 Tester l'Envoi

1. Dans votre application, essayez d'envoyer un email de test
2. Vérifiez les logs dans **Supabase Dashboard** → **Edge Functions** → **Logs**
3. L'email devrait être envoyé avec succès

---

## ✅ Étape 7 : Tests

### 7.1 Test Simple

1. **Dans votre application**, envoyez un email de test à une adresse externe
2. **Vérifiez les logs** dans Supabase Dashboard → Edge Functions → Logs
3. L'email devrait être envoyé avec succès

### 7.2 Vérifier les Logs

Les logs devraient afficher :
```
✅ [send-email] Email envoyé avec succès: email_123
📧 [send-email] From: BTP Smart Pro <contact@btpsmartpro.com>
📧 [send-email] To: client@example.com
```

### 7.3 Vérifier dans Resend

1. Allez dans **Emails** : https://resend.com/emails
2. Vous devriez voir vos emails envoyés
3. Le statut devrait être **Delivered** ✅
4. L'adresse "From" devrait être `contact@btpsmartpro.com`

### 7.4 Vérifier la Réception

1. Vérifiez que l'email arrive dans la boîte de réception (pas en spam)
2. Vérifiez que l'adresse "From" est bien `contact@btpsmartpro.com`
3. Vérifiez que le Reply-To fonctionne (si configuré)

---

## 🔍 Comportement Attendu

### Si l'utilisateur a configuré son email (OAuth ou SMTP)

1. **Si le domaine de l'utilisateur est vérifié** (`@btpsmartpro.com`) :
   - Email envoyé depuis : `utilisateur@btpsmartpro.com`
   - Reply-To : `utilisateur@btpsmartpro.com`

2. **Si le domaine de l'utilisateur n'est PAS vérifié** :
   - Email envoyé depuis : `contact@btpsmartpro.com` (fallback)
   - Reply-To : `utilisateur@example.com` (email de l'utilisateur)

### Si l'utilisateur n'a pas configuré son email

- Email envoyé depuis : `contact@btpsmartpro.com`
- Reply-To : Email de l'utilisateur depuis `user_settings` (si disponible)

---

## 🆘 Dépannage

### Erreur : "Mode test Resend : Vous ne pouvez envoyer qu'à votre propre adresse"

**Solution** :
1. Vérifiez que `RESEND_API_KEY` est une clé de **production** (pas de test)
2. Les clés de test commencent souvent par `re_test_`
3. Les clés de production commencent par `re_` (sans `test`)
4. Créez une nouvelle clé API de production si nécessaire

### Erreur : "Domain is not verified"

**Solution** :
1. Vérifiez que le domaine est bien vérifié sur https://resend.com/domains
2. Vérifiez que tous les enregistrements DNS sont correctement ajoutés
3. Attendez quelques minutes pour la propagation DNS
4. Vérifiez que `RESEND_FROM_EMAIL` utilise le domaine vérifié

### Erreur : "Invalid from address"

**Solution** :
1. Vérifiez que `RESEND_FROM_EMAIL` est au format `email@domain.com`
2. Vérifiez que le domaine est vérifié sur Resend
3. Vérifiez que l'adresse email existe (optionnel, mais recommandé)

### Les emails partent mais arrivent en spam

**Solution** :
1. Vérifiez que les enregistrements SPF et DKIM sont correctement configurés
2. Ajoutez un enregistrement DMARC (optionnel mais recommandé)
3. Vérifiez la réputation de votre domaine sur https://mxtoolbox.com
4. Attendez quelques jours pour que la réputation s'améliore

---

## 📊 Monitoring

### Voir les Emails Envoyés

1. **Dans Resend** : https://resend.com/emails
   - Voir tous les emails envoyés
   - Voir les statuts (Delivered, Bounced, etc.)
   - Voir les erreurs éventuelles

2. **Dans Supabase** : Table `email_messages`
   ```sql
   SELECT * FROM email_messages 
   WHERE status = 'sent' 
   ORDER BY sent_at DESC 
   LIMIT 10;
   ```

### Voir les Logs

1. **Supabase Dashboard** → **Edge Functions** → **Logs**
2. Filtrer par fonction : `send-email` ou `send-email-from-user`
3. Chercher les logs préfixés par `📧` ou `✅`

---

## ✅ Checklist Finale

- [ ] Domaine `btpsmartpro.com` vérifié sur Resend
- [ ] Clé API de production créée et copiée
- [ ] `RESEND_API_KEY` configuré dans Supabase Secrets (clé de production)
- [ ] `RESEND_FROM_EMAIL` configuré avec `contact@btpsmartpro.com`
- [ ] `FROM_NAME` configuré avec `BTP Smart Pro` (optionnel)
- [ ] Edge Functions redéployées
- [ ] Test d'envoi réussi à une adresse externe
- [ ] Aucune erreur "mode test" dans les logs
- [ ] Email reçu avec la bonne adresse "From"
- [ ] Email n'arrive pas en spam

---

## 🎉 Résultat Final

Une fois configuré correctement :

- ✅ Les utilisateurs peuvent envoyer des emails à **n'importe quel destinataire**
- ✅ Les emails partent depuis `contact@btpsmartpro.com` ou l'email de l'utilisateur (si domaine vérifié)
- ✅ Plus aucune erreur "mode test"
- ✅ Les emails arrivent dans la boîte de réception (pas en spam)
- ✅ Les logs indiquent clairement le succès de l'envoi

---

## 📝 Notes Importantes

1. **Clé API de Production** : Assurez-vous d'utiliser une clé de production, pas de test
2. **Domaine Vérifié** : Le domaine doit être vérifié sur Resend avant d'envoyer
3. **DNS** : Les enregistrements DNS peuvent prendre jusqu'à 48h pour se propager (généralement 5-15 minutes)
4. **Limites** : Vérifiez les limites de votre plan Resend (gratuit : 100 emails/jour, Pro : 50k/mois)
5. **Adresse Email Réelle** : Créer `contact@btpsmartpro.com` physiquement améliore la délivrabilité

---

**Une fois ces étapes terminées, votre système d'envoi d'emails sera opérationnel en production !** 🚀










