# 🔔 Guide - Système de Rappels d'Événements

## 📋 Vue d'ensemble

Le système de rappels d'événements permet de configurer des notifications automatiques pour les événements du calendrier, jusqu'à 2 semaines à l'avance, avec possibilité de rappels récurrents.

---

## 🎯 Fonctionnalités

### 1. **Rappels configurables**
- **5 minutes** avant l'événement
- **15 minutes** avant
- **30 minutes** avant
- **1 heure** avant
- **1 jour** avant
- **2 jours** avant
- **3 jours** avant
- **5 jours** avant
- **1 semaine** avant
- **2 semaines** avant (20160 minutes)

### 2. **Rappels récurrents**
- Option "Rappeler à chaque fois" (récurrent)
- Si activé, un rappel sera envoyé à chaque occurrence de l'événement
- Utile pour les événements récurrents (réunions hebdomadaires, etc.)

### 3. **Notifications automatiques**
- **Notification in-app** : Créée automatiquement dans la table `notifications`
- **Email** : Envoyé si l'utilisateur a activé les notifications email
- Format professionnel avec toutes les informations de l'événement

---

## 🚀 Installation

### Étape 1 : Mettre à jour la base de données

Exécutez le script SQL dans Supabase Dashboard → SQL Editor :

```sql
-- Fichier : supabase/ADD-EVENT-REMINDER-RECURRING.sql
```

Ce script :
- Ajoute la colonne `reminder_recurring` à la table `events`
- Crée la fonction `check_and_send_event_reminders()`
- Crée les index nécessaires pour les performances

### Étape 2 : Déployer la Edge Function

```bash
supabase functions deploy send-event-reminders
```

### Étape 3 : Configurer le cron job

Exécutez le script SQL dans Supabase Dashboard → SQL Editor :

```sql
-- Fichier : supabase/CONFIGURE-CRON-JOBS-EVENT-REMINDERS.sql
-- ⚠️ N'oubliez pas de remplacer YOUR_PROJECT_REF et YOUR_SERVICE_ROLE_KEY
```

Le cron job s'exécute **toutes les 15 minutes** pour vérifier et envoyer les rappels.

### Étape 4 : Intégrer dans smart-notifications (optionnel)

La fonction `smart-notifications` a été mise à jour pour inclure les rappels d'événements. Si vous utilisez déjà cette fonction, les rappels d'événements seront automatiquement traités.

---

## 📊 Comment ça fonctionne

### 1. **Création d'un événement avec rappel**

L'utilisateur crée un événement dans le calendrier et configure :
- Le moment du rappel (ex: "1 semaine avant")
- Optionnellement : "Rappeler à chaque fois" (récurrent)

### 2. **Vérification automatique**

Toutes les 15 minutes, le cron job appelle :
- La fonction SQL `check_and_send_event_reminders()`
- Ou la Edge Function `send-event-reminders`

### 3. **Envoi des notifications**

Pour chaque événement dont le rappel doit être envoyé :
1. **Vérification** : Le système vérifie si une notification a déjà été créée (sauf si récurrent)
2. **Notification in-app** : Création d'une notification dans la table `notifications`
3. **Email** : Si l'utilisateur a activé les emails, ajout à la queue `email_queue`

### 4. **Gestion des rappels récurrents**

Si `reminder_recurring = true` :
- Un rappel sera envoyé à chaque fois que l'événement approche
- Pas de vérification de doublon
- Utile pour les événements récurrents

---

## 🔧 Configuration

### Modifier la fréquence du cron job

Dans `CONFIGURE-CRON-JOBS-EVENT-REMINDERS.sql`, modifiez :

```sql
'*/15 * * * *'  -- Toutes les 15 minutes (recommandé)
'*/5 * * * *'   -- Toutes les 5 minutes (plus précis)
'*/30 * * * *'  -- Toutes les 30 minutes (moins de charge)
```

### Désactiver les rappels pour un utilisateur

L'utilisateur peut désactiver les notifications dans :
- **Paramètres** → **Notifications** → Désactiver "Rappels"

---

## 📝 Structure de la base de données

### Table `events`

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_minutes INTEGER,        -- Minutes avant l'événement
  reminder_recurring BOOLEAN,      -- Si true, rappel à chaque occurrence
  ...
);
```

### Fonction SQL `check_and_send_event_reminders()`

Cette fonction :
- Parcourt tous les événements avec `reminder_minutes` configuré
- Vérifie si le rappel doit être envoyé maintenant
- Crée des notifications si nécessaire
- Gère les rappels récurrents

---

## 🧪 Test

### Tester manuellement

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Vérifier les notifications créées

```sql
SELECT * FROM notifications 
WHERE related_table = 'events' 
  AND type = 'reminder'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🐛 Dépannage

### Les rappels ne sont pas envoyés

1. **Vérifier le cron job** :
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-event-reminders';
   ```

2. **Vérifier les logs** :
   - Supabase Dashboard → Edge Functions → Logs
   - Vérifier les erreurs dans `send-event-reminders`

3. **Vérifier la fonction SQL** :
   ```sql
   SELECT * FROM check_and_send_event_reminders();
   ```

### Les emails ne sont pas envoyés

1. **Vérifier les paramètres utilisateur** :
   ```sql
   SELECT email_notifications FROM user_settings WHERE user_id = '...';
   ```

2. **Vérifier la queue d'emails** :
   ```sql
   SELECT * FROM email_queue WHERE type = 'reminder' ORDER BY created_at DESC;
   ```

---

## 📚 Fichiers créés/modifiés

- ✅ `src/components/EventForm.tsx` - Formulaire avec options de rappel
- ✅ `src/hooks/useEvents.ts` - Interfaces TypeScript mises à jour
- ✅ `supabase/ADD-EVENT-REMINDER-RECURRING.sql` - Script SQL
- ✅ `supabase/functions/send-event-reminders/index.ts` - Edge Function
- ✅ `supabase/CONFIGURE-CRON-JOBS-EVENT-REMINDERS.sql` - Configuration cron
- ✅ `supabase/functions/smart-notifications/index.ts` - Intégration (optionnel)

---

## ✅ Checklist de déploiement

- [ ] Exécuter `ADD-EVENT-REMINDER-RECURRING.sql`
- [ ] Déployer `send-event-reminders` : `supabase functions deploy send-event-reminders`
- [ ] Configurer le cron job : `CONFIGURE-CRON-JOBS-EVENT-REMINDERS.sql`
- [ ] Tester manuellement la fonction
- [ ] Vérifier que les notifications sont créées
- [ ] Vérifier que les emails sont envoyés (si activés)

---

## 🎉 Résultat

Une fois configuré, le système :
- ✅ Vérifie automatiquement les rappels toutes les 15 minutes
- ✅ Envoie des notifications in-app
- ✅ Envoie des emails si activés
- ✅ Gère les rappels récurrents
- ✅ Supporte les rappels jusqu'à 2 semaines à l'avance


