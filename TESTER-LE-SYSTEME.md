# ✅ Tester le Système - Guide Complet

## 🎯 Objectif

Vérifier que le système d'invitation et de contact fonctionne correctement après la configuration de `PUBLIC_URL`.

---

## 📋 Test 1 : Système d'Invitation (5 minutes)

### Étape 1 : Créer une Entreprise

1. **Connecte-toi** en tant qu'admin dans l'application
2. Va dans **"Paramètres"** (icône ⚙️ en bas à gauche)
3. Clique sur l'onglet **"Gestion des Entreprises"**
4. Clique sur **"Créer"** (bouton en haut à droite)
5. Remplis le formulaire :
   - **Nom de l'entreprise** : `Test Entreprise`
   - **Plan** : `Custom` (ou celui que tu veux)
   - **Niveau de support** : `Pas de support`
6. Clique sur **"Créer"**

**✅ Résultat attendu** : L'entreprise apparaît dans la liste

---

### Étape 2 : Inviter un Dirigeant

1. Dans la liste des entreprises, trouve **"Test Entreprise"**
2. Clique sur **"Inviter Dirigeant"** (ou le bouton d'invitation)
3. Remplis le formulaire :
   - **Email** : `test-dirigeant@example.com` (ou ton email de test)
   - **Rôle** : `owner` (dirigeant)
4. Clique sur **"Envoyer l'invitation"**

**✅ Résultat attendu** :
- Un message de succès apparaît : "Invitation envoyée avec succès"
- L'invitation est créée dans la base de données

**📧 Si RESEND_API_KEY est configuré** :
- Tu devrais recevoir un email à l'adresse `test-dirigeant@example.com`
- L'email contient un lien d'invitation

**⚠️ Si RESEND_API_KEY n'est pas configuré** :
- L'invitation est créée mais l'email ne sera pas envoyé
- Tu peux quand même tester l'acceptation (voir Test 3)

---

### Étape 3 : Vérifier l'Invitation dans la Base

1. Va dans **Supabase Dashboard** → **Table Editor**
2. Sélectionne la table **`invitations`**
3. Tu devrais voir une ligne avec :
   - `email` : `test-dirigeant@example.com`
   - `status` : `pending`
   - `token` : un token unique
   - `expires_at` : date dans 7 jours

**✅ Résultat attendu** : L'invitation est bien enregistrée

---

## 📋 Test 2 : Système de Contact Request (5 minutes)

### Étape 1 : Soumettre une Demande de Contact

1. **Déconnecte-toi** de l'application (ou ouvre en navigation privée)
2. Va sur la **page d'accueil** (`/`)
3. Clique sur **"Demander un essai gratuit"** (ou le bouton de contact)
4. Remplis le formulaire :
   - **Nom** : `Test`
   - **Prénom** : `Contact`
   - **Email** : `test-contact@example.com`
   - **Téléphone** : `0123456789` (optionnel)
   - **Entreprise** : `Test Company` (optionnel)
   - **Message** : `Je souhaite tester l'application`
   - **Coche** : "Demander un essai gratuit de 2 semaines"
5. Clique sur **"Envoyer"**

**✅ Résultat attendu** :
- Un message de succès apparaît : "Votre demande a été envoyée"
- La demande est créée dans la base de données

**📧 Si RESEND_API_KEY est configuré** :
- Tu (admin) devrais recevoir un email de notification
- Le visiteur reçoit un email de confirmation

---

### Étape 2 : Vérifier la Demande dans l'Admin

1. **Reconnecte-toi** en tant qu'admin
2. Va dans **"Paramètres"** → **"Demandes de contact"**
3. Tu devrais voir la demande que tu viens de créer :
   - **Nom** : `Test Contact`
   - **Email** : `test-contact@example.com`
   - **Statut** : `pending`
   - **Essai gratuit demandé** : ✅

**✅ Résultat attendu** : La demande apparaît dans la liste

---

### Étape 3 : Créer une Entreprise depuis la Demande

1. Dans la liste des demandes, trouve **"Test Contact"**
2. Clique sur **"Créer entreprise + Inviter"**
3. Remplis le formulaire :
   - **Nom de l'entreprise** : `Test Company`
   - **Plan** : `Custom`
4. Clique sur **"Créer et Inviter"**

**✅ Résultat attendu** :
- Une entreprise est créée
- Une invitation est envoyée à `test-contact@example.com`
- Le statut de la demande passe à `invited`

---

## 📋 Test 3 : Accepter une Invitation (5 minutes)

### Étape 1 : Récupérer le Lien d'Invitation

**Option A : Si tu as reçu l'email**
- Ouvre l'email d'invitation
- Clique sur le lien (ou copie-le)

**Option B : Si tu n'as pas reçu l'email**
1. Va dans **Supabase Dashboard** → **Table Editor** → **`invitations`**
2. Trouve l'invitation que tu as créée
3. Copie le **`token`**
4. Construis l'URL : `https://ton-app.vercel.app/accept-invitation?token=TON_TOKEN`
   - Remplace `TON_TOKEN` par le token copié

---

### Étape 2 : Accepter l'Invitation

1. Ouvre le lien d'invitation (dans un navigateur privé ou déconnecté)
2. Tu devrais voir un formulaire :
   - **Nom** : (pré-rempli si disponible)
   - **Prénom** : (pré-rempli si disponible)
   - **Email** : (pré-rempli, non modifiable)
   - **Mot de passe** : (à saisir)
   - **Confirmer le mot de passe** : (à saisir)
3. Remplis le formulaire et clique sur **"Créer mon compte"**

**✅ Résultat attendu** :
- Le compte est créé
- L'utilisateur est automatiquement connecté
- L'utilisateur est associé à l'entreprise
- Le rôle est assigné (owner, member, etc.)
- L'invitation passe au statut `accepted`

---

### Étape 3 : Vérifier l'Association

1. Une fois connecté, l'utilisateur devrait voir :
   - Les données de son entreprise
   - L'accès aux fonctionnalités selon son rôle
2. Va dans **Supabase Dashboard** → **Table Editor** → **`company_users`**
3. Tu devrais voir une ligne avec :
   - `user_id` : l'ID du nouvel utilisateur
   - `company_id` : l'ID de l'entreprise
   - `role` : `owner` (ou le rôle assigné)

**✅ Résultat attendu** : L'utilisateur est bien associé à l'entreprise

---

## 🎯 Checklist de Vérification

### Système d'Invitation
- [ ] Je peux créer une entreprise en tant qu'admin
- [ ] Je peux inviter un dirigeant
- [ ] L'invitation est créée dans la base (`invitations` table)
- [ ] L'email est envoyé (si RESEND_API_KEY configuré)
- [ ] Je peux accepter l'invitation via le lien
- [ ] Le compte est créé et l'utilisateur est associé à l'entreprise

### Système de Contact
- [ ] Je peux soumettre une demande de contact (sans être connecté)
- [ ] La demande est créée dans la base (`contact_requests` table)
- [ ] L'admin reçoit une notification (si RESEND_API_KEY configuré)
- [ ] Je peux voir les demandes dans "Paramètres" → "Demandes de contact"
- [ ] Je peux créer une entreprise depuis une demande
- [ ] L'invitation est automatiquement envoyée

---

## 🚨 Problèmes Courants et Solutions

### Problème 1 : "Links point to localhost"
**Solution** : Vérifie que `PUBLIC_URL` est bien configuré dans Supabase Secrets et pointe vers ton URL Vercel (pas `localhost`).

### Problème 2 : "Email not sent"
**Solution** : Vérifie que `RESEND_API_KEY` est configuré dans Supabase Secrets. Si non, les invitations sont créées mais les emails ne sont pas envoyés.

### Problème 3 : "Invitation expired"
**Solution** : Les invitations expirent après 7 jours. Crée une nouvelle invitation.

### Problème 4 : "User already exists"
**Solution** : L'email est déjà utilisé. Utilise un autre email pour tester.

### Problème 5 : "Cannot create company"
**Solution** : Vérifie que tu es bien connecté en tant qu'admin (rôle `administrateur` dans `user_roles`).

---

## ✅ Si Tout Fonctionne

Félicitations ! 🎉 Ton système est opérationnel :

- ✅ Les invitations fonctionnent
- ✅ Les demandes de contact fonctionnent
- ✅ Les utilisateurs peuvent créer des comptes uniquement via invitation
- ✅ Les entreprises sont créées et gérées correctement

---

## 🚀 Prochaines Étapes

1. **Teste avec de vrais utilisateurs** (optionnel)
2. **Configure le domaine personnalisé** (demain avec Vercel)
3. **Personnalise les emails** (optionnel, dans `send-email` function)
4. **Configure les autres providers de paiement** (si besoin)

---

**🎉 Une fois tous les tests passés, ton système est prêt pour la production !**














