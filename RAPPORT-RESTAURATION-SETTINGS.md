# 📋 RAPPORT D'ANALYSE - RESTAURATION PAGE PARAMÈTRES

## 🔍 ÉTAT ACTUEL

### ✅ Ce qui existe et fonctionne

1. **Hook `useUserSettings`** (`src/hooks/useUserSettings.ts`)
   - ✅ Récupération des paramètres utilisateur
   - ✅ Mise à jour des paramètres (`useUpdateUserSettings`)
   - ✅ Création des paramètres (`useCreateUserSettings`)
   - ✅ Interface `UserSettings` complète avec tous les champs

2. **Table Supabase `user_settings`**
   - ✅ Tous les champs nécessaires existent :
     - `company_name`, `email`, `phone`, `address`
     - `city`, `postal_code`, `country`
     - `siret`, `vat_number`, `legal_form`
     - `company_logo_url`, `terms_and_conditions`
     - `signature_data`, `signature_name`
     - `notifications_enabled`, `reminder_enabled`, `email_notifications`

3. **Page Settings actuelle** (`src/pages/Settings.tsx`)
   - ⚠️ **TRÈS INCOMPLÈTE** : Seulement 2 sections basiques
     - Apparence (ThemeToggle)
     - Compte (Email + Déconnexion)

4. **Composants existants mais VIDES**
   - ⚠️ `src/components/ConnectWithStripe.tsx` → **FICHIER VIDE**
   - ⚠️ `src/components/ConnectWithEmail.tsx` → **FICHIER VIDE**
   - ⚠️ `src/components/EmailAccountsManager.tsx` → **FICHIER VIDE**
   - ⚠️ `src/components/EmailSignatureEditor.tsx` → **FICHIER VIDE**

---

## ❌ CE QUI MANQUE COMPLÈTEMENT

### 1. **Informations de l'Entreprise** (Section complète manquante)
   - ❌ Formulaire pour :
     - Nom de l'entreprise (`company_name`)
     - Adresse complète (`address`, `city`, `postal_code`, `country`)
     - Logo upload (`company_logo_url`)
     - SIRET (`siret`) avec validation
     - TVA intracommunautaire (`vat_number`) avec validation
     - Forme juridique (`legal_form`)
     - Coordonnées (`email`, `phone`)
   - ❌ Upload de logo avec preview
   - ❌ Validation des formats (SIRET 14 chiffres, TVA format FR...)
   - ❌ Sauvegarde dans `user_settings`

### 2. **Paramètres Devis & Factures** (Section complète manquante)
   - ❌ Configuration du modèle de devis
   - ❌ Mentions légales (`terms_and_conditions`)
   - ❌ Numérotation automatique (déjà en SQL mais pas dans UI)
   - ❌ Signature automatique
   - ❌ Options d'envoi (email automatique, etc.)

### 3. **Paramètres Stripe** (Section complète manquante)
   - ❌ Composant `ConnectWithStripe.tsx` à recréer
   - ❌ Bouton "Connecter avec Stripe"
   - ❌ Affichage du statut de connexion
   - ❌ Bouton "Déconnexion Stripe"
   - ❌ Lien vers le dashboard Stripe
   - ❌ Configuration des paiements (pourcentages, montants)

### 4. **Paramètres Emails** (Section complète manquante)
   - ❌ Composant `ConnectWithEmail.tsx` à recréer
   - ❌ Composant `EmailAccountsManager.tsx` à recréer
   - ❌ Configuration Gmail OAuth
   - ❌ Configuration Outlook OAuth
   - ❌ Configuration SMTP professionnel
   - ❌ Test d'envoi d'email
   - ❌ Signature email automatique (`EmailSignatureEditor.tsx`)

### 5. **Gestion des Utilisateurs** (Section complète manquante)
   - ❌ Liste des utilisateurs
   - ❌ Gestion des rôles (dirigeant, salarié, administrateur)
   - ❌ Gestion des accès
   - ❌ Gestion des permissions

### 6. **Sécurité** (Section complète manquante)
   - ❌ Changement de mot de passe
   - ❌ Authentification à deux facteurs (2FA)
   - ❌ Gestion des sessions actives
   - ❌ Historique de connexion

---

## 📁 FICHIERS À CRÉER/RESTAURER

### Composants Settings (à créer dans `src/components/settings/`)

1. **`CompanySettings.tsx`**
   - Formulaire complet informations entreprise
   - Upload logo avec `ImageUpload`
   - Validation SIRET/TVA
   - Sauvegarde via `useUpdateUserSettings`

2. **`DocumentSettings.tsx`**
   - Configuration modèle devis/factures
   - Éditeur de mentions légales (Textarea)
   - Options de numérotation
   - Signature automatique (toggle)

3. **`StripeSettings.tsx`**
   - Utilise `ConnectWithStripe.tsx` (à recréer)
   - Statut connexion Stripe
   - Boutons connect/disconnect
   - Lien dashboard Stripe

4. **`EmailSettings.tsx`**
   - Utilise `ConnectWithEmail.tsx` (à recréer)
   - Utilise `EmailAccountsManager.tsx` (à recréer)
   - Configuration Gmail/Outlook/SMTP
   - Test d'envoi
   - Utilise `EmailSignatureEditor.tsx` (à recréer)

5. **`UserManagementSettings.tsx`**
   - Liste utilisateurs (si admin)
   - Gestion rôles
   - Permissions

6. **`SecuritySettings.tsx`**
   - Changement mot de passe
   - 2FA (si implémenté)
   - Sessions actives
   - Historique connexion

### Composants utilitaires (à recréer)

7. **`ConnectWithStripe.tsx`** (actuellement vide)
   - Bouton OAuth Stripe Connect
   - Gestion du callback
   - Stockage du `stripe_account_id`

8. **`ConnectWithEmail.tsx`** (actuellement vide)
   - Configuration OAuth Gmail
   - Configuration OAuth Outlook
   - Configuration SMTP

9. **`EmailAccountsManager.tsx`** (actuellement vide)
   - Liste des comptes email configurés
   - Ajout/Suppression de comptes
   - Test de connexion

10. **`EmailSignatureEditor.tsx`** (actuellement vide)
    - Éditeur de signature email
    - Preview
    - Sauvegarde dans `user_settings`

### Page principale (à restaurer)

11. **`src/pages/Settings.tsx`** (à compléter)
    - Structure avec onglets (Tabs)
    - Navigation entre sections
    - Design moderne avec GlassCard

---

## 🗂️ STRUCTURE PROPOSÉE

```
src/pages/Settings.tsx
  └── Tabs (onglets)
      ├── Entreprise
      │   └── CompanySettings.tsx
      ├── Devis & Factures
      │   └── DocumentSettings.tsx
      ├── Paiements (Stripe)
      │   └── StripeSettings.tsx
      ├── Emails
      │   └── EmailSettings.tsx
      ├── Utilisateurs (admin only)
      │   └── UserManagementSettings.tsx
      ├── Sécurité
      │   └── SecuritySettings.tsx
      └── Apparence
          └── ThemeToggle (déjà existant)
```

---

## 🔧 HOOKS/UTILS NÉCESSAIRES

### Hooks existants (✅)
- `useUserSettings` - Récupération paramètres
- `useUpdateUserSettings` - Mise à jour paramètres
- `useAuth` - Authentification utilisateur

### Hooks à créer (❌)
- `useStripeConnect` - Gestion connexion Stripe
- `useEmailAccounts` - Gestion comptes email
- `useUserSessions` - Gestion sessions utilisateur
- `usePasswordChange` - Changement mot de passe

---

## 📊 TABLEAU RÉCAPITULATIF

| Section | Composant | Statut | Priorité |
|---------|-----------|--------|----------|
| Informations Entreprise | `CompanySettings.tsx` | ❌ À créer | 🔴 Haute |
| Devis & Factures | `DocumentSettings.tsx` | ❌ À créer | 🔴 Haute |
| Stripe | `StripeSettings.tsx` + `ConnectWithStripe.tsx` | ❌ À créer | 🟡 Moyenne |
| Emails | `EmailSettings.tsx` + 3 composants | ❌ À créer | 🟡 Moyenne |
| Utilisateurs | `UserManagementSettings.tsx` | ❌ À créer | 🟢 Basse |
| Sécurité | `SecuritySettings.tsx` | ❌ À créer | 🟡 Moyenne |
| Page principale | `Settings.tsx` | ⚠️ À restaurer | 🔴 Haute |

---

## ✅ VALIDATION REQUISE

**Avant de commencer la restauration, confirmez :**

1. ✅ Toutes les sections listées doivent être restaurées ?
2. ✅ La structure avec onglets (Tabs) est correcte ?
3. ✅ Les composants doivent utiliser le design moderne (GlassCard, etc.) ?
4. ✅ Les validations SIRET/TVA doivent être implémentées ?
5. ✅ Stripe Connect doit être fonctionnel (nécessite clés API) ?
6. ✅ Les emails doivent être configurables (Gmail/Outlook/SMTP) ?

---

## 🎯 PLAN D'ACTION APRÈS VALIDATION

1. Créer la structure de dossiers `src/components/settings/`
2. Restaurer `Settings.tsx` avec onglets
3. Créer `CompanySettings.tsx` (priorité 1)
4. Créer `DocumentSettings.tsx` (priorité 1)
5. Recréer `ConnectWithStripe.tsx` et `StripeSettings.tsx`
6. Recréer les composants Email
7. Créer `SecuritySettings.tsx`
8. Créer `UserManagementSettings.tsx` (admin only)
9. Tester chaque section
10. Appliquer le design moderne partout

---

**Rapport généré le :** $(date)
**Fichiers analysés :** 15+
**Composants manquants :** 10+
**Sections à restaurer :** 6






