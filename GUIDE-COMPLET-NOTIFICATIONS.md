# 📚 Guide Complet - Système Automatisé de Notifications BTP

## 🎯 Vue d'ensemble

Ce guide complet vous explique comment installer, configurer et utiliser le système automatisé de notifications et d'emails pour votre application BTP.

---

## 📋 Table des Matières

1. [Architecture du Système](#architecture)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Types de Notifications](#types)
5. [Templates d'Emails](#templates)
6. [Intégration Frontend](#frontend)
7. [Monitoring](#monitoring)
8. [Dépannage](#depannage)

---

## 🏗️ Architecture du Système

### Composants

1. **Base de Données** :
   - Table `notifications` : Notifications in-app
   - Table `email_queue` : Queue d'emails à envoyer
   - Table `notification_log` : Historique des notifications
   - Table `payments` : Paiements (nouvelle)

2. **Fonctions SQL** :
   - `check_pending_quotes()` : Vérifie les devis en attente
   - `check_unconfirmed_quotes()` : Vérifie les devis non confirmés
   - `check_upcoming_worksites()` : Vérifie les chantiers qui commencent
   - `check_ending_worksites()` : Vérifie les chantiers qui se terminent
   - `check_maintenance_due()` : Vérifie les échéances de maintenance
   - `check_payments_due()` : Vérifie les paiements dus
   - `check_overdue_payments()` : Vérifie les paiements en retard

3. **Edge Functions** :
   - `smart-notifications` : Fonction principale qui vérifie et envoie les notifications
   - `process-email-queue` : Traite la queue d'emails
   - `send-email` : Envoie un email via Resend

4. **Cron Jobs** :
   - `smart-notifications-hourly` : Exécute `smart-notifications` toutes les heures
   - `process-email-queue` : Traite la queue d'emails toutes les 5 minutes

---

## 🚀 Installation

### Étape 1 : Créer les Tables et Fonctions

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Exécutez** : `supabase/AUTOMATED-NOTIFICATIONS-SYSTEM.sql`
3. **Vérifiez** que les tables et fonctions sont créées

### Étape 2 : Déployer les Edge Functions

```bash
# Déployer smart-notifications
supabase functions deploy smart-notifications

# Déployer process-email-queue (si pas déjà fait)
supabase functions deploy process-email-queue
```

### Étape 3 : Configurer les Variables d'Environnement

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
CRON_SECRET=your-secret-key-here
```

### Étape 4 : Configurer les Cron Jobs

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Exécutez** : `supabase/CONFIGURE-CRON-JOBS.sql`
3. **Remplacez** `YOUR_PROJECT_REF` et `YOUR_SERVICE_ROLE_KEY`
4. **Exécutez** le script

---

## ⚙️ Configuration

### Délais de Notification

Vous pouvez modifier les délais dans les fonctions SQL :

```sql
-- Modifier le délai pour les devis en attente (par défaut : 3 jours)
-- Dans check_pending_quotes(), modifiez :
AND q.created_at < NOW() - INTERVAL '3 days'
-- En :
AND q.created_at < NOW() - INTERVAL '5 days'  -- 5 jours au lieu de 3
```

### Schedule des Cron Jobs

Modifiez le schedule dans `CONFIGURE-CRON-JOBS.sql` :

```sql
-- Toutes les heures
'0 * * * *'

-- Toutes les 30 minutes
'*/30 * * * *'

-- Tous les jours à 8h
'0 8 * * *'
```

---

## 📨 Types de Notifications

### 1. Devis en Attente > 3 jours

**Déclencheur** : Un devis est en statut "draft" depuis plus de 3 jours

**Notification** :
- Titre : "Devis en attente depuis X jours"
- Type : `warning`
- Message : Rappel pour finaliser et envoyer le devis

### 2. Devis Non Confirmés > 7 jours

**Déclencheur** : Un devis envoyé n'a pas été confirmé depuis plus de 7 jours

**Notification** :
- Titre : "Devis non confirmé depuis X jours"
- Type : `warning`
- Message : Rappel pour relancer le client

### 3. Chantiers qui Commencent Bientôt

**Déclencheur** : Un chantier commence dans 1 jour

**Notification** :
- Titre : "Début de chantier prévu demain"
- Type : `info`
- Message : Rappel pour vérifier la sécurité et la préparation

### 4. Chantiers qui Se Terminent Bientôt

**Déclencheur** : Un chantier se termine dans 1 jour

**Notification** :
- Titre : "Fin de chantier prévue demain"
- Type : `info`
- Message : Rappel pour préparer la réception et la facturation

### 5. Échéances de Maintenance

**Déclencheur** : Une maintenance est prévue dans 7 jours

**Notification** :
- Titre : "Maintenance prévue dans X jours"
- Type : `info`
- Message : Rappel pour planifier l'intervention

### 6. Paiements Dus

**Déclencheur** : Un paiement est dû dans 3 jours

**Notification** :
- Titre : "Paiement dû dans X jours"
- Type : `info`
- Message : Rappel pour préparer la facturation

### 7. Paiements en Retard

**Déclencheur** : Un paiement est en retard

**Notification** :
- Titre : "🚨 URGENT : Paiement en retard de X jours"
- Type : `urgent`
- Message : Action requise immédiatement

---

## 📧 Templates d'Emails

Les emails sont envoyés avec des templates professionnels BTP incluant :

- **Design responsive** : S'adapte à tous les appareils
- **Ton professionnel** : Adapté au contexte BTP
- **Informations claires** : Données importantes mises en évidence
- **Actions suggérées** : Liste des actions à prévoir
- **Branding** : Logo et couleurs de votre entreprise (personnalisable)

### Personnaliser les Templates

Modifiez les templates dans `supabase/functions/smart-notifications/index.ts` :

```typescript
const emailTemplates = {
  quote_pending: (data: any) => ({
    subject: `🔔 Devis en attente depuis ${data.days_pending} jours`,
    html: `...` // Votre template HTML personnalisé
  }),
  // ... autres templates
};
```

---

## 🎨 Intégration Frontend

### Afficher les Notifications

Le composant `Notifications.tsx` existe déjà et affiche les notifications. Assurez-vous qu'il est intégré dans votre application.

### Hook useNotifications

Utilisez le hook `useNotifications` pour gérer les notifications :

```tsx
import { useNotifications } from "@/hooks/useNotifications";

const { notifications, unreadCount, markAsRead } = useNotifications();
```

### Notifications en Temps Réel

Les notifications sont synchronisées en temps réel via Supabase Realtime.

---

## 📊 Monitoring

### Vérifier les Statistiques

```sql
-- Statistiques des notifications
SELECT 
  notification_type,
  COUNT(*) as count,
  MAX(sent_at) as last_sent
FROM public.notification_log
GROUP BY notification_type
ORDER BY count DESC;

-- Statistiques des emails
SELECT 
  status,
  type,
  COUNT(*) as count
FROM public.email_queue
GROUP BY status, type
ORDER BY count DESC;
```

### Vérifier les Logs

- **Supabase Dashboard → Logs → Edge Functions** : Logs des fonctions
- **Supabase Dashboard → Logs → Postgres Logs** : Logs des cron jobs
- **Table `notification_log`** : Historique des notifications

---

## 🆘 Dépannage

### Les notifications ne sont pas créées

1. **Vérifiez les logs** de la Edge Function
2. **Vérifiez que les données existent** (devis, projets, etc.)
3. **Vérifiez que les conditions sont remplies** (dates, statuts, etc.)
4. **Vérifiez que le cron job est actif** : `SELECT * FROM cron.job;`

### Les emails ne sont pas envoyés

1. **Vérifiez que `RESEND_API_KEY` est configuré**
2. **Vérifiez que `process-email-queue` fonctionne**
3. **Vérifiez les logs** dans `email_queue` (status, error_message)
4. **Vérifiez que le cron job `process-email-queue` est actif**

### Le cron job ne s'exécute pas

1. **Vérifiez que l'extension `pg_cron` est activée**
2. **Vérifiez que le cron job est actif** : `SELECT * FROM cron.job;`
3. **Vérifiez les logs** dans Supabase Dashboard → Logs → Postgres Logs
4. **Vérifiez que `pg_net` est activé** : `CREATE EXTENSION IF NOT EXISTS pg_net;`

---

## ✅ Checklist Finale

- [ ] Tables créées (`payments`, `notification_log`)
- [ ] Fonctions SQL créées (`check_*`)
- [ ] Edge Function `smart-notifications` déployée
- [ ] Edge Function `process-email-queue` déployée
- [ ] Variables d'environnement configurées
- [ ] Cron jobs configurés
- [ ] Test manuel réussi
- [ ] Notifications créées dans l'application
- [ ] Emails envoyés
- [ ] Monitoring configuré

---

## 🎯 Prochaines Étapes

1. ✅ **Tester** le système avec des données réelles
2. ✅ **Ajuster** les délais si nécessaire
3. ✅ **Personnaliser** les templates d'emails
4. ✅ **Monitorer** les performances et les erreurs
5. ✅ **Optimiser** les requêtes si nécessaire

---

## 📚 Ressources

- **Guide de déploiement** : `DEPLOY-SMART-NOTIFICATIONS.md`
- **Intégration frontend** : `INTEGRATION-FRONTEND.md`
- **Configuration cron jobs** : `supabase/CONFIGURE-CRON-JOBS.sql`
- **Documentation Supabase** : https://supabase.com/docs

---

**Le système est maintenant complet et fonctionnel !** 🚀

