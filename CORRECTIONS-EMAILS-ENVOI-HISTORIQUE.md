# 📧 Corrections Système d'Envoi d'Emails + Historique

## ✅ Corrections Apportées

### 1. **Table `email_messages` créée**
- **Fichier** : `supabase/CREATE-EMAIL-MESSAGES-TABLE.sql`
- **Description** : Table pour stocker l'historique de tous les emails envoyés
- **Colonnes principales** :
  - `recipient_email` : Destinataire
  - `subject` : Sujet
  - `body_html` / `body_text` : Contenu
  - `status` : Statut (sent, failed, pending)
  - `sent_at` : Date d'envoi
  - `invoice_id`, `quote_id`, `project_id` : Liens vers les documents

### 2. **Edge Function `send-email` corrigée**
- **Fichier** : `supabase/functions/send-email/index.ts`
- **Améliorations** :
  - ✅ Récupère la configuration SMTP de l'utilisateur (`user_email_settings`)
  - ✅ Utilise la configuration SMTP si disponible
  - ✅ Fallback vers Resend si SMTP non configuré
  - ✅ Enregistre tous les emails dans `email_messages` (même en cas d'échec)
  - ✅ Utilise l'adresse email et le nom de l'utilisateur pour l'expéditeur

### 3. **Hook `useEmailMessages` créé**
- **Fichier** : `src/hooks/useEmailMessages.ts`
- **Fonctionnalité** : Récupère l'historique complet des emails envoyés par l'utilisateur
- **Utilisation** :
  ```typescript
  const { data: emailMessages, isLoading } = useEmailMessages();
  ```

### 4. **Page Messagerie mise à jour**
- **Fichier** : `src/pages/Mailbox.tsx`
- **Améliorations** :
  - ✅ Affiche l'historique des emails envoyés dans le dossier "Envoyés"
  - ✅ Convertit automatiquement les `EmailMessage` en format `Email` pour l'affichage
  - ✅ Affiche le sujet, le destinataire, la date et un aperçu du contenu
  - ✅ Fonctionne avec ou sans mode démo

## 🚀 Installation

### Étape 1 : Créer la table `email_messages`

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Allez dans SQL Editor**
3. **Ouvrez le fichier** : `supabase/CREATE-EMAIL-MESSAGES-TABLE.sql`
4. **Copiez et exécutez** le script SQL

### Étape 2 : Vérifier la configuration email

Assurez-vous que :
- ✅ La table `user_email_settings` existe
- ✅ L'utilisateur a configuré son compte email (Gmail, Outlook ou SMTP)
- ✅ L'Edge Function `send-email` est déployée

### Étape 3 : Tester l'envoi

1. **Configurez un compte email** dans Paramètres > Emails
2. **Envoyez un email de test** depuis les paramètres
3. **Vérifiez la page Messagerie** > dossier "Envoyés"

## 📋 Fonctionnement

### Envoi d'Email

1. **L'application appelle** `sendEmail()` depuis `emailService.ts`
2. **L'Edge Function `send-email`** :
   - Récupère la configuration SMTP de l'utilisateur
   - Génère la signature automatique
   - Tente d'envoyer via SMTP (si configuré) ou Resend
   - Enregistre le résultat dans `email_messages`

### Affichage de l'Historique

1. **La page Messagerie** charge les emails via `useEmailMessages()`
2. **Les emails sont convertis** au format d'affichage
3. **Ils apparaissent** dans le dossier "Envoyés"

## 🔧 Dépannage

### Les emails ne s'envoient pas

1. **Vérifiez la configuration email** :
   - Paramètres > Emails > Configuration
   - Assurez-vous que SMTP est correctement configuré

2. **Vérifiez les logs** :
   - Supabase Dashboard > Edge Functions > Logs
   - Cherchez les erreurs dans `send-email`

3. **Vérifiez la table `email_messages`** :
   ```sql
   SELECT * FROM email_messages 
   WHERE user_id = 'votre-user-id' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### L'historique ne s'affiche pas

1. **Vérifiez que la table existe** :
   ```sql
   SELECT * FROM email_messages LIMIT 1;
   ```

2. **Vérifiez les permissions RLS** :
   - La politique "Users can view their own email messages" doit être active

3. **Vérifiez la console** :
   - Ouvrez la console du navigateur
   - Cherchez les erreurs de requête Supabase

## 📝 Notes

- Les emails sont enregistrés **même en cas d'échec** pour le débogage
- Le statut peut être : `sent`, `failed`, ou `pending`
- Les emails sont liés aux documents (factures, devis) via `invoice_id` et `quote_id`
- L'historique est automatiquement mis à jour toutes les 5 secondes


















