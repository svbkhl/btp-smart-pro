# 📋 Commandes Exactes à Copier-Coller

## 🎯 Installation Complète en 4 Étapes

---

## 📋 ÉTAPE 1 : Créer les Tables (Copier-Coller Direct)

### Dans Supabase Dashboard → SQL Editor

**Ouvrez** : `supabase/AUTOMATED-NOTIFICATIONS-COMPLETE.sql`
- ⚠️ **IMPORTANT** : Utilisez `AUTOMATED-NOTIFICATIONS-COMPLETE.sql` (crée toutes les tables)

**Copiez TOUT le contenu** et **collez dans SQL Editor** → **Run**

**✅ Résultat attendu** :
- `Tables créées: 8`
- `Fonctions créées: 10`

---

## 📋 ÉTAPE 2 : Déployer la Fonction

### Option A : Via Supabase Dashboard (Recommandé)

1. **Allez dans** : Edge Functions → Create a new function
2. **Nom** : `smart-notifications`
3. **Ouvrez** : `supabase/functions/smart-notifications/index.ts`
4. **Copiez TOUT** → **Collez** → **Deploy**

### Option B : Via Terminal

```bash
cd /Users/sabrikhalfallah/Downloads/edifice-opus-one-main
supabase functions deploy smart-notifications
```

**✅ C'est fait !**

---

## 📋 ÉTAPE 3 : Configurer les Secrets

### Dans Supabase Dashboard → Settings → Edge Functions → Secrets

**Ajoutez** :

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
CRON_SECRET=mon-secret-12345
```

**✅ C'est fait !**

---

## 📋 ÉTAPE 4 : Configurer les Cron Jobs

### Dans Supabase Dashboard → SQL Editor

1. **Ouvrez** : `CONFIGURE-CRON-JOBS-FINAL.sql`
2. **Trouvez votre SERVICE_ROLE_KEY** :
   - Settings → API → service_role key (copiez-la)
3. **Dans le script**, remplacez `YOUR_SERVICE_ROLE_KEY` par votre clé (2 fois)
4. **Copiez TOUT** → **Collez dans SQL Editor** → **Run**

**✅ C'est fait !**

---

## ✅ Vérification

### Exécutez dans SQL Editor :

```sql
SELECT 
  'Tables' as type, 
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payments', 'notification_log')
UNION ALL
SELECT 'Functions', COUNT(*)
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'check_%'
UNION ALL
SELECT 'Cron Jobs', COUNT(*)
FROM cron.job 
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

**Résultat attendu** : 2 tables, 7 fonctions, 2 cron jobs

---

## 🎉 C'est Fait !

Le système fonctionne automatiquement maintenant.

---

**Consultez `FAIRE-TOUT-EN-4-ÉTAPES.md` pour plus de détails.** 🚀

