# 🔔 Système Automatisé de Notifications BTP - Guide Rapide

## 🎯 Vue d'ensemble

Système complet de notifications et d'emails automatiques pour votre application BTP. Le système vérifie automatiquement les données et envoie des notifications intelligentes aux utilisateurs.

---

## 📋 Installation Rapide

### 1. Créer les Tables et Fonctions

```sql
-- Exécutez dans Supabase Dashboard → SQL Editor
-- Fichier : supabase/AUTOMATED-NOTIFICATIONS-SYSTEM.sql
```

### 2. Déployer la Edge Function

```bash
supabase functions deploy smart-notifications
```

### 3. Configurer les Variables d'Environnement

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
CRON_SECRET=your-secret-key-here
```

### 4. Configurer les Cron Jobs

```sql
-- Exécutez dans Supabase Dashboard → SQL Editor
-- Fichier : supabase/CONFIGURE-CRON-JOBS.sql
-- ⚠️ N'oubliez pas de remplacer YOUR_PROJECT_REF et YOUR_SERVICE_ROLE_KEY
```

---

## 🎯 Types de Notifications

1. **Devis en attente > 3 jours** - Rappel pour finaliser un devis
2. **Devis non confirmés > 7 jours** - Rappel pour relancer le client
3. **Chantiers qui commencent bientôt** - Rappel 1 jour avant
4. **Chantiers qui se terminent bientôt** - Rappel 1 jour avant
5. **Échéances de maintenance** - Rappel 7 jours avant
6. **Paiements dus** - Rappel 3 jours avant
7. **Paiements en retard** - Notification urgente

---

## 📧 Templates d'Emails

Les emails sont envoyés avec des templates professionnels BTP incluant :
- Design responsive
- Ton adapté au contexte BTP
- Informations claires et actionnables
- Rappels de sécurité et bonnes pratiques

---

## 🚀 Test

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/smart-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 📚 Documentation Complète

- **Guide complet** : `GUIDE-COMPLET-NOTIFICATIONS.md`
- **Déploiement** : `DEPLOY-SMART-NOTIFICATIONS.md`
- **Intégration frontend** : `INTEGRATION-FRONTEND.md`

---

## ✅ Checklist

- [ ] Tables créées
- [ ] Fonctions SQL créées
- [ ] Edge Function déployée
- [ ] Variables d'environnement configurées
- [ ] Cron jobs configurés
- [ ] Test réussi

---

**Le système est prêt à être utilisé !** 🚀

