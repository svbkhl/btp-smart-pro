# 🚀 Guide : Configuration Resend en Production

## 📋 Objectif

Configurer Resend pour permettre l'envoi d'emails depuis votre application vers **n'importe quel destinataire**, sans limitation du mode test.

---

## ✅ Étape 1 : Vérifier le Domaine sur Resend

### 1.1 Aller sur Resend Domains

1. Connectez-vous à https://resend.com
2. Allez dans **Domains** : https://resend.com/domains
3. Cliquez sur **Add Domain**
4. Entrez votre domaine : `btpsmartpro.com`
5. Cliquez sur **Add**

### 1.2 Ajouter les Enregistrements DNS

Resend vous donnera des enregistrements DNS à ajouter. Ajoutez-les dans votre hébergeur de domaine :

#### SPF (TXT)
```
v=spf1 include:resend.com ~all
```

#### DKIM (TXT)
Resend génère automatiquement des clés DKIM. Ajoutez les 3 enregistrements TXT fournis.

#### MX (optionnel, pour recevoir des emails)
```
10 feedback-smtp.resend.com
```

### 1.3 Vérifier le Domaine

1. Attendez quelques minutes (généralement 5-15 minutes)
2. Rechargez la page Resend Domains
3. Le statut devrait passer à **Verified** ✅

---

## ✅ Étape 2 : Créer une Clé API de Production

### 2.1 Créer la Clé

1. Allez dans **API Keys** : https://resend.com/api-keys
2. Cliquez sur **Create API Key**
3. **Nom** : `BTP Smart Pro Production`
4. **Permission** : `Sending access` (ou `Full access`)
5. **Cliquez sur Create**
6. **COPIEZ LA CLÉ** (elle ne sera affichée qu'une seule fois !)

⚠️ **Important** : Utilisez une clé API de **production**, pas une clé de test.

---

## ✅ Étape 3 : Configurer dans Supabase

### 3.1 Ajouter les Secrets

1. Allez dans **Supabase Dashboard** : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Edge Functions** → **Secrets**
4. Ajoutez/modifiez ces secrets :

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxx (votre clé API de production)
RESEND_FROM_EMAIL = contact@btpsmartpro.com (ou votre adresse vérifiée)
FROM_NAME = BTP Smart Pro (optionnel)
```

### 3.2 Vérifier les Secrets

Assurez-vous que :
- ✅ `RESEND_API_KEY` est une clé de **production** (commence par `re_`)
- ✅ `RESEND_FROM_EMAIL` utilise un domaine **vérifié** sur Resend
- ✅ Le domaine de `RESEND_FROM_EMAIL` correspond au domaine vérifié

---

## ✅ Étape 4 : Redéployer les Edge Functions

### 4.1 Redéployer send-email

```bash
supabase functions deploy send-email
```

### 4.2 Redéployer send-email-from-user

```bash
supabase functions deploy send-email-from-user
```

Ou via Supabase Dashboard :
1. Allez dans **Edge Functions**
2. Sélectionnez chaque fonction
3. Cliquez sur **Deploy** ou **Update**

---

## ✅ Étape 5 : Tester l'Envoi

### 5.1 Test Simple

1. Dans votre application, essayez d'envoyer un email de test
2. Vérifiez les logs dans **Supabase Dashboard** → **Edge Functions** → **Logs**
3. L'email devrait être envoyé avec succès

### 5.2 Vérifier les Logs

Les logs devraient afficher :
```
✅ [send-email] Email envoyé avec succès: email_123
📧 [send-email] From: BTP Smart Pro <contact@btpsmartpro.com>
📧 [send-email] To: client@example.com
```

### 5.3 Vérifier dans Resend

1. Allez dans **Emails** : https://resend.com/emails
2. Vous devriez voir vos emails envoyés
3. Le statut devrait être **Delivered** ✅

---

## 🔍 Vérifications

### ✅ Checklist

- [ ] Domaine `btpsmartpro.com` vérifié sur Resend
- [ ] Clé API de production créée et copiée
- [ ] `RESEND_API_KEY` configuré dans Supabase Secrets (clé de production)
- [ ] `RESEND_FROM_EMAIL` configuré avec domaine vérifié
- [ ] Edge Functions redéployées
- [ ] Test d'envoi réussi à une adresse externe
- [ ] Aucune erreur "mode test" dans les logs

---

## 🎯 Comportement Attendu

### Si l'utilisateur a configuré son email (OAuth ou SMTP)

1. **Si le domaine de l'utilisateur est vérifié** :
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

---

**Une fois ces étapes terminées, votre système d'envoi d'emails sera opérationnel en production !** 🚀











