# 📋 Résumé : Choix du mot de passe lors de l'invitation

## 🎯 Problème résolu

Lorsqu'une invitation était envoyée, l'utilisateur ne pouvait pas choisir son mot de passe. Le système utilisait `inviteUserByEmail` qui créait automatiquement le compte avec un mot de passe généré par Supabase.

## ✅ Solution implémentée

### Nouveau flux pour les nouveaux utilisateurs

1. **Vérification de l'existence de l'utilisateur**
   - L'Edge Function vérifie si l'utilisateur existe déjà dans Supabase Auth
   
2. **Si l'utilisateur n'existe pas** :
   - ✅ Création d'une invitation dans la table `invitations` avec un token unique
   - ✅ Génération d'un lien vers `/accept-invitation?token=XXX`
   - ✅ Envoi d'un email via Resend avec ce lien
   - ✅ L'utilisateur clique sur le lien et arrive sur `/accept-invitation`
   - ✅ L'utilisateur **choisit son mot de passe** (minimum 6 caractères)
   - ✅ L'utilisateur remplit son nom et prénom
   - ✅ Création du compte avec `signUp` et le mot de passe choisi
   - ✅ Acceptation de l'invitation via `accept_invitation`

3. **Si l'utilisateur existe déjà** :
   - ✅ Utilisation de `generateLink` avec type "magiclink" (comme avant)
   - ✅ Envoi d'un email avec le magic link pour se connecter

## 📁 Fichiers modifiés

### Edge Function
- ✅ `supabase/functions/send-invitation/index.ts`
  - Suppression de l'utilisation de `inviteUserByEmail` pour les nouveaux utilisateurs
  - Création d'invitation dans la table `invitations`
  - Génération du lien vers `/accept-invitation?token=XXX`
  - Récupération de `invited_by` depuis le JWT
  - Mise à jour du template email

### Page frontend (déjà existante)
- ✅ `src/pages/AcceptInvitation.tsx`
  - Déjà configurée pour permettre le choix du mot de passe
  - Formulaire avec : email (désactivé), prénom, nom, mot de passe, confirmation mot de passe
  - Validation : mot de passe minimum 6 caractères, confirmation identique
  - Création du compte avec `signUp` et le mot de passe choisi

## 🔧 Actions de déploiement

### Étape 1 : Redéployer l'Edge Function (OBLIGATOIRE)

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy send-invitation
```

## 🧪 Test

### Test : Nouvel utilisateur invité

1. **Inviter un nouvel utilisateur** (email qui n'existe pas encore)
2. **Vérifier l'email reçu** :
   - ✅ Le lien pointe vers `/accept-invitation?token=XXX`
   - ✅ Le message indique "Créer mon compte et choisir mon mot de passe"
3. **Cliquer sur le lien**
4. **Vérifier la page `/accept-invitation`** :
   - ✅ L'email est pré-rempli (désactivé)
   - ✅ Les champs prénom, nom, mot de passe, confirmation sont vides
   - ✅ L'utilisateur peut saisir son mot de passe
5. **Remplir le formulaire** :
   - Prénom : "Jean"
   - Nom : "Dupont"
   - Mot de passe : "monmotdepasse123"
   - Confirmation : "monmotdepasse123"
6. **Cliquer sur "Créer mon compte et accepter l'invitation"**
7. **Vérifier** :
   - ✅ Le compte est créé avec le mot de passe choisi
   - ✅ L'invitation est acceptée
   - ✅ L'utilisateur est lié à l'entreprise avec le bon `role_id`
   - ✅ Redirection vers `/auth?message=account-created`

## 📊 Flux complet

```
1. Admin invite utilisateur → Edge Function send-invitation
2. Edge Function vérifie si utilisateur existe
   ├─ NON → Crée invitation dans table invitations
   │         Génère token unique
   │         Envoie email avec lien /accept-invitation?token=XXX
   │
   └─ OUI → Génère magic link (comme avant)
            Envoie email avec magic link

3. Utilisateur clique sur lien → /accept-invitation?token=XXX
4. Page AcceptInvitation :
   - Vérifie le token
   - Affiche formulaire : prénom, nom, mot de passe, confirmation
   - L'utilisateur CHOISIT son mot de passe
   
5. Utilisateur soumet le formulaire :
   - Création compte avec signUp(email, password)
   - Acceptation invitation avec accept_invitation(token, user_id)
   - Lien à l'entreprise avec le bon role_id
   
6. Redirection vers /auth pour se connecter
```

## ✅ Avantages

- ✅ **Sécurité** : L'utilisateur choisit son propre mot de passe (pas de mot de passe généré)
- ✅ **UX** : L'utilisateur se souvient de son mot de passe (il l'a choisi)
- ✅ **Flexibilité** : L'utilisateur peut créer un mot de passe fort
- ✅ **Compatibilité** : Les utilisateurs existants continuent d'utiliser magic link

## 🎯 Résultat

Après déploiement :
- ✅ Les nouveaux utilisateurs invités peuvent **choisir leur mot de passe**
- ✅ Le mot de passe est choisi sur la page `/accept-invitation`
- ✅ Le compte est créé avec le mot de passe choisi par l'utilisateur
- ✅ Les utilisateurs existants continuent d'utiliser magic link
