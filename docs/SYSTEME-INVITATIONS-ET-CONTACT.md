# 📧 Système d'Invitations et de Contact - Documentation Complète

## 🎯 Vue d'ensemble

Ce système permet de gérer deux types d'accès à la plateforme :

1. **Clients démarchés** : Reçoivent une invitation directe avec essai gratuit de 2 semaines
2. **Visiteurs non démarchés** : Doivent remplir un formulaire de contact pour demander un essai

---

## 🔐 Système d'Invitations

### Fonctionnement

#### 1. Admin crée une entreprise et invite un dirigeant

**Étapes :**
1. Aller dans **Paramètres > Gestion Entreprises**
2. Cliquer sur **"Nouvelle entreprise"**
3. Remplir les informations (nom, plan, modules, support)
4. Cliquer sur **"Inviter dirigeant"** sur la carte de l'entreprise
5. Entrer l'email du dirigeant
6. L'invitation est envoyée par email

**Résultat :**
- Une invitation est créée dans la table `invitations`
- Un email est envoyé au dirigeant avec un lien unique
- Le lien expire après 7 jours

#### 2. Dirigeant accepte l'invitation

**Étapes :**
1. Le dirigeant clique sur le lien dans l'email
2. Il arrive sur `/accept-invitation?token=XXX`
3. Il remplit le formulaire (prénom, nom, mot de passe)
4. Son compte est créé et il est automatiquement assigné à l'entreprise avec le rôle "owner"
5. Il peut se connecter et commencer l'essai gratuit de 2 semaines

#### 3. Dirigeant invite des employés

**Étapes :**
1. Aller dans **RH > Employés**
2. Cliquer sur **"Inviter un employé"**
3. Entrer l'email de l'employé
4. Choisir le rôle (member = employé standard)
5. L'invitation est envoyée

**Résultat :**
- L'employé reçoit un email avec un lien d'invitation
- Il crée son compte et est assigné à l'entreprise

---

## 📝 Système de Contact (Visiteurs non démarchés)

### Fonctionnement

#### 1. Visiteur arrive sur la page d'accueil

**Ce qu'il voit :**
- Bouton **"Demander un essai gratuit"** au lieu de "Commencer maintenant"
- Bouton **"Voir la démo"** (toujours disponible)

#### 2. Visiteur remplit le formulaire

**Champs du formulaire :**
- Prénom *
- Nom *
- Email *
- Téléphone (optionnel)
- Entreprise (optionnel)
- Message (optionnel)
- Checkbox : "Je souhaite bénéficier d'un essai gratuit de 2 semaines"

**Résultat :**
- La demande est enregistrée dans `contact_requests`
- Un email est envoyé à l'admin avec tous les détails
- Un email de confirmation est envoyé au visiteur

#### 3. Admin gère les demandes

**Accès :**
- **Paramètres > Demandes de contact** (onglet visible uniquement pour les admins)

**Fonctionnalités :**
- Voir toutes les demandes avec filtres (statut, recherche)
- Voir les détails (nom, email, téléphone, entreprise, message)
- Ajouter des notes privées
- Marquer comme "contacté", "invité", ou "rejeté"
- **Créer entreprise + Inviter en un clic** (si essai gratuit demandé + entreprise renseignée)

**Workflow recommandé :**
1. Visiteur demande un essai gratuit
2. Admin reçoit l'email de notification
3. Admin va dans "Demandes de contact"
4. Admin clique sur **"Créer entreprise + Inviter"**
5. L'entreprise est créée avec tous les modules activés
6. Une invitation est envoyée au visiteur
7. Le statut de la demande passe à "invité"

---

## 🗄️ Structure de la base de données

### Table `invitations`

```sql
- id (UUID)
- email (TEXT)
- company_id (UUID) → companies
- role (TEXT) : 'owner', 'admin', 'member'
- invited_by (UUID) → auth.users
- token (TEXT) : Token unique pour l'invitation
- status (TEXT) : 'pending', 'accepted', 'expired', 'cancelled'
- expires_at (TIMESTAMP)
- accepted_at (TIMESTAMP)
- user_id (UUID) → auth.users (après acceptation)
```

### Table `contact_requests`

```sql
- id (UUID)
- nom (TEXT)
- prenom (TEXT)
- email (TEXT)
- telephone (TEXT, optionnel)
- entreprise (TEXT, optionnel)
- message (TEXT, optionnel)
- request_type (TEXT) : 'essai_gratuit', 'contact', 'information'
- status (TEXT) : 'pending', 'contacted', 'invited', 'rejected'
- trial_requested (BOOLEAN)
- admin_notes (TEXT, optionnel)
- invited_by (UUID, optionnel) → auth.users
- invitation_id (UUID, optionnel) → invitations
```

---

## 🔧 Fichiers créés/modifiés

### SQL Migrations
- `supabase/migrations/create_invitations_system.sql`
- `supabase/migrations/create_contact_requests_system.sql`

### Edge Functions
- `supabase/functions/send-invitation/index.ts`
- `supabase/functions/notify-contact-request/index.ts`

### Composants React
- `src/components/ContactForm.tsx`
- `src/components/admin/InviteUserDialog.tsx`
- `src/pages/AcceptInvitation.tsx`
- `src/pages/AdminContactRequests.tsx`

### Hooks
- `src/hooks/useContactRequests.ts`

### Pages modifiées
- `src/pages/Index.tsx` : Bouton "Demander un essai gratuit"
- `src/pages/Auth.tsx` : Vérification d'invitation avant inscription
- `src/pages/AdminCompanies.tsx` : Bouton "Inviter dirigeant"
- `src/pages/RHEmployees.tsx` : Système d'invitation pour employés
- `src/pages/Settings.tsx` : Onglet "Demandes de contact"
- `src/App.tsx` : Route `/accept-invitation`

---

## ✅ Checklist de déploiement

### 1. Base de données
- [ ] Exécuter `create_invitations_system.sql` dans Supabase SQL Editor
- [ ] Exécuter `create_contact_requests_system.sql` dans Supabase SQL Editor
- [ ] Vérifier que les RLS policies sont actives

### 2. Edge Functions
- [ ] Déployer `send-invitation` :
  ```bash
  supabase functions deploy send-invitation
  ```
- [ ] Déployer `notify-contact-request` :
  ```bash
  supabase functions deploy notify-contact-request
  ```

### 3. Variables d'environnement (optionnel)
- [ ] Configurer `ADMIN_EMAIL` dans Supabase (sinon utilise le premier admin)
- [ ] Configurer `PUBLIC_URL` ou `PRODUCTION_URL` pour les liens d'invitation

### 4. Tests
- [ ] Tester l'invitation d'un dirigeant (admin → entreprise → inviter)
- [ ] Tester l'acceptation d'invitation (lien dans email)
- [ ] Tester le formulaire de contact (page d'accueil)
- [ ] Tester la création entreprise + invitation depuis "Demandes de contact"
- [ ] Tester l'invitation d'un employé (dirigeant → RH → inviter)

---

## 🎨 Flux utilisateur complet

### Client démarché (avec invitation)

```
Admin crée entreprise
    ↓
Admin invite dirigeant (email)
    ↓
Dirigeant reçoit email avec lien
    ↓
Dirigeant clique sur lien → /accept-invitation
    ↓
Dirigeant crée compte
    ↓
Dirigeant assigné à l'entreprise (rôle: owner)
    ↓
Essai gratuit de 2 semaines activé
    ↓
Dirigeant peut inviter des employés
```

### Visiteur non démarché

```
Visiteur arrive sur page d'accueil
    ↓
Visiteur clique "Demander un essai gratuit"
    ↓
Visiteur remplit formulaire (coche essai gratuit)
    ↓
Demande enregistrée dans contact_requests
    ↓
Admin reçoit email de notification
    ↓
Admin va dans "Demandes de contact"
    ↓
Admin clique "Créer entreprise + Inviter"
    ↓
Entreprise créée + Invitation envoyée
    ↓
Visiteur reçoit email avec lien
    ↓
Visiteur accepte invitation → compte créé
    ↓
Essai gratuit de 2 semaines activé
```

---

## 🔒 Sécurité

- ✅ Seules les personnes invitées peuvent créer un compte
- ✅ Les invitations expirent après 7 jours
- ✅ Isolation des données par entreprise (RLS policies)
- ✅ Vérification du token et de l'email lors de l'acceptation
- ✅ Les demandes de contact sont privées (seuls les admins peuvent les voir)

---

## 📊 Statistiques et suivi

Dans **Paramètres > Demandes de contact**, vous pouvez :
- Voir le nombre total de demandes
- Voir le nombre de demandes en attente
- Filtrer par statut (pending, contacted, invited, rejected)
- Rechercher par nom, email, entreprise
- Ajouter des notes pour chaque demande
- Suivre quelles demandes ont été converties en invitations

---

## 🚀 Prochaines améliorations possibles

- [ ] Système d'essai gratuit avec expiration automatique après 2 semaines
- [ ] Tableau de bord avec statistiques (taux de conversion, etc.)
- [ ] Export des demandes de contact en CSV
- [ ] Templates d'emails personnalisables
- [ ] Notifications en temps réel pour nouvelles demandes
- [ ] Système de scoring des leads

---

## 📞 Support

Si vous avez des questions ou rencontrez des problèmes :
1. Vérifiez les logs des Edge Functions dans Supabase
2. Vérifiez que les tables existent et ont les bonnes permissions
3. Vérifiez que les Edge Functions sont bien déployées
4. Vérifiez les variables d'environnement

---

**Dernière mise à jour :** $(date)

