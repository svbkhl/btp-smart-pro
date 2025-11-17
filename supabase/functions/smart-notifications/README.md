# 🔔 Smart Notifications - Système Automatisé de Notifications BTP

## 📋 Description

Cette Edge Function vérifie automatiquement les données de votre application BTP et envoie des notifications intelligentes et des emails aux utilisateurs.

## 🎯 Types de Notifications

1. **Devis en attente > 3 jours** - Rappel pour finaliser et envoyer un devis
2. **Devis non confirmés > 7 jours** - Rappel pour relancer le client
3. **Chantiers qui commencent bientôt** - Rappel 1 jour avant le début
4. **Chantiers qui se terminent bientôt** - Rappel 1 jour avant la fin
5. **Échéances de maintenance** - Rappel 7 jours avant l'échéance
6. **Paiements dus** - Rappel 3 jours avant l'échéance
7. **Paiements en retard** - Notification urgente pour les paiements en retard

## 🚀 Configuration

### 1. Déployer la fonction

```bash
supabase functions deploy smart-notifications
```

### 2. Configurer les variables d'environnement

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :

- `RESEND_API_KEY` : Votre clé API Resend (optionnel, pour les emails)
- `CRON_SECRET` : Un secret pour sécuriser les appels cron (recommandé)

### 3. Configurer le cron job

Dans Supabase Dashboard → Database → Cron Jobs, créez un nouveau job :

```sql
-- Exécuter toutes les heures
SELECT cron.schedule(
  'smart-notifications-hourly',
  '0 * * * *', -- Toutes les heures
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Ou utilisez le guide dans `DEPLOY-SMART-NOTIFICATIONS.md`.

## 📧 Templates d'Emails

Les emails sont envoyés avec des templates professionnels BTP incluant :
- Design responsive et professionnel
- Ton adapté au contexte BTP
- Informations claires et actionnables
- Rappels de sécurité et bonnes pratiques

## 🔒 Sécurité

- La fonction vérifie le `CRON_SECRET` pour autoriser les appels
- Utilise `SUPABASE_SERVICE_ROLE_KEY` pour accéder à la base de données
- Les notifications sont créées avec les permissions appropriées (RLS)

## 📊 Logs

Toutes les notifications sont enregistrées dans la table `notification_log` pour :
- Traçabilité
- Éviter les doublons
- Statistiques et analyses

## 🧪 Test

Pour tester la fonction manuellement :

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/smart-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 📝 Notes

- La fonction vérifie les conditions avant d'envoyer des notifications
- Les notifications ne sont pas envoyées en double (vérification dans `notification_log`)
- Les emails sont mis en queue dans `email_queue` et traités par `process-email-queue`

