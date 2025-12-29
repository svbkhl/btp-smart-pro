# 🔐 Secrets à Configurer dans Supabase

## ✅ Edge Functions Déployées

Les fonctions suivantes ont été déployées avec succès :
- ✅ `send-invitation`
- ✅ `notify-contact-request`
- ✅ `send-email`
- ✅ `create-payment-session`
- ✅ `payment-webhook`

---

## 📋 Secrets à Ajouter (OBLIGATOIRE)

### 1. **PUBLIC_URL** (CRITIQUE)

**Pourquoi** : Utilisé pour générer les liens d'invitation et les URLs de signature électronique.

**Comment ajouter** :
1. Va dans **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. Clique sur **"Add new secret"**
3. **Name** : `PUBLIC_URL`
4. **Value** : `https://ton-app.vercel.app` (remplace par ton URL Vercel actuelle)
   - Exemple : `https://btp-smart-pro.vercel.app`
   - Ou ton domaine personnalisé si déjà configuré : `https://ton-domaine.com`
5. Clique sur **"Save"**

**⚠️ IMPORTANT** : Sans ce secret, les liens d'invitation pointeront vers `localhost` et ne fonctionneront pas !

---

## 📋 Secrets Optionnels (Recommandés)

### 2. **RESEND_API_KEY** (Optionnel mais recommandé)

**Pourquoi** : Permet d'envoyer des emails via Resend (service d'email professionnel).

**Comment obtenir** :
1. Va sur https://resend.com
2. Crée un compte (gratuit jusqu'à 100 emails/jour)
3. Va dans **API Keys**
4. Crée une nouvelle clé API
5. Copie la clé (commence par `re_`)

**Comment ajouter** :
1. **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. **Name** : `RESEND_API_KEY`
3. **Value** : `re_xxxxxxxxxxxxx` (ta clé Resend)
4. **Save**

**Note** : Si tu n'ajoutes pas ce secret, les emails ne seront pas envoyés. Tu peux le faire plus tard.

---

### 3. **FROM_EMAIL** (Optionnel)

**Pourquoi** : Définit l'adresse email d'expéditeur par défaut.

**Comment ajouter** :
1. **Name** : `FROM_EMAIL`
2. **Value** : `noreply@ton-domaine.com` ou `contact@btp-smartpro.fr`
3. **Save**

**Note** : Si non défini, utilise `onboarding@resend.dev` par défaut.

---

### 4. **FROM_NAME** (Optionnel)

**Pourquoi** : Définit le nom d'expéditeur dans les emails.

**Comment ajouter** :
1. **Name** : `FROM_NAME`
2. **Value** : `BTP Smart Pro` (ou le nom que tu veux)
3. **Save**

**Note** : Si non défini, utilise `BTP Smart Pro` par défaut.

---

### 5. **ADMIN_EMAIL** (Optionnel)

**Pourquoi** : Email où recevoir les notifications de demandes de contact.

**Comment ajouter** :
1. **Name** : `ADMIN_EMAIL`
2. **Value** : `ton-email@example.com` (ton email admin)
3. **Save**

**Note** : Si non défini, le système utilisera l'email du premier admin trouvé dans la base.

---

## 🎯 Checklist Rapide

- [ ] **PUBLIC_URL** configuré (OBLIGATOIRE)
- [ ] **RESEND_API_KEY** configuré (optionnel mais recommandé)
- [ ] **FROM_EMAIL** configuré (optionnel)
- [ ] **FROM_NAME** configuré (optionnel)
- [ ] **ADMIN_EMAIL** configuré (optionnel)

---

## 📍 Où Configurer

**Chemin exact** :
1. https://supabase.com/dashboard
2. Sélectionne ton projet : `renmjmqlmafqjzldmsgs`
3. **Settings** (⚙️ en bas à gauche)
4. **Edge Functions** (dans le menu de gauche)
5. **Secrets** (onglet en haut)

---

## ✅ Vérification

Une fois les secrets configurés, tu peux tester :

1. **Test d'invitation** :
   - Connecte-toi en admin
   - Crée une entreprise
   - Invite un dirigeant
   - Vérifie que l'email est envoyé (ou vérifie les logs)

2. **Test de contact** :
   - Déconnecte-toi
   - Va sur la page d'accueil
   - Remplis le formulaire de contact
   - Vérifie que l'admin reçoit la notification

---

## 🚨 Erreurs Courantes

### "PUBLIC_URL is not defined"
→ Ajoute le secret `PUBLIC_URL` avec ton URL Vercel

### "RESEND_API_KEY is not defined"
→ Les emails ne seront pas envoyés. Ajoute le secret `RESEND_API_KEY` si tu veux envoyer des emails.

### "Links point to localhost"
→ Vérifie que `PUBLIC_URL` est bien configuré et pointe vers ton URL de production (pas `localhost`).

---

**🎉 Une fois `PUBLIC_URL` configuré, le système est opérationnel !**

Les autres secrets sont optionnels et peuvent être ajoutés plus tard.














