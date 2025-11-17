# 🚀 Configuration Automatique - Secrets et Cron Jobs

## ✅ Ce qui a été fait automatiquement

1. ✅ **Fonction `smart-notifications` déployée** via Supabase CLI
2. ✅ **Script SQL préparé** avec un CRON_SECRET généré

---

## 🔧 Configuration des Secrets (À faire manuellement - 2 minutes)

Les secrets doivent être configurés via le Dashboard Supabase car ils nécessitent une authentification sécurisée.

### Étape 1 : Configurer CRON_SECRET

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. **Allez dans** : "Secrets" (onglet)
3. **Cliquez sur** : "Add new secret"
4. **Nom** : `CRON_SECRET`
5. **Valeur** : Utilisez le secret généré (voir ci-dessous) ou créez-en un nouveau
6. **Cliquez sur** : "Save"

**Secret généré pour vous** :
```
btp-smart-pro-[timestamp]
```

**Ou créez votre propre secret** (recommandé) :
- Exemple : `mon-secret-btp-2024-12345`
- ⚠️ **Important** : Utilisez le même secret dans le script SQL des cron jobs

### Étape 2 : Configurer RESEND_API_KEY (Optionnel)

1. **Dans la même page** (Settings → Edge Functions → Secrets)
2. **Cliquez sur** : "Add new secret"
3. **Nom** : `RESEND_API_KEY`
4. **Valeur** : Votre clé API Resend (si vous en avez une)
   - Créez un compte sur https://resend.com si nécessaire
   - Ou laissez vide pour l'instant (les emails seront stockés mais pas envoyés)
5. **Cliquez sur** : "Save"

---

## ⚙️ Configuration des Cron Jobs (À faire via SQL - 2 minutes)

### Option A : Via Supabase Dashboard (Recommandé)

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Allez dans** : SQL Editor (menu de gauche)
3. **Cliquez sur** : "New query"
4. **Ouvrez le fichier** : `supabase/CONFIGURE-CRON-JOBS-AVEC-CRON-SECRET.sql`
5. **Remplacez** `YOUR_CRON_SECRET` par le secret que vous avez configuré dans les Secrets
   - Exemple : Si votre secret est `mon-secret-btp-2024`, remplacez `'YOUR_CRON_SECRET'` par `'mon-secret-btp-2024'`
   - ⚠️ **Important** : Il y a 2 occurrences à remplacer dans le script
6. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
7. **Collez dans SQL Editor** (Cmd+V)
8. **Cliquez sur** : "Run" (Cmd+Enter)

**✅ Résultat attendu** :
- 2 lignes de succès (2 cron jobs créés)
- Pas d'erreur

### Option B : Via Supabase CLI (Si configuré)

```bash
cd /Users/sabrikhalfallah/Downloads/edifice-opus-one-main

# Remplacer YOUR_CRON_SECRET dans le script
CRON_SECRET="votre-secret-ici"
sed "s/YOUR_CRON_SECRET/'$CRON_SECRET'/g" supabase/CONFIGURE-CRON-JOBS-AVEC-CRON-SECRET.sql | \
supabase db execute --file -
```

---

## 🧪 Vérification

### Vérifier les Secrets

1. **Dans Supabase Dashboard** → Settings → Edge Functions → Secrets
2. **Vous devriez voir** :
   - ✅ `CRON_SECRET` (configuré)
   - ⚠️ `RESEND_API_KEY` (optionnel)

### Vérifier les Cron Jobs

Dans SQL Editor, exécutez :

```sql
SELECT jobname, schedule, active
FROM cron.job 
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

**Résultat attendu** : 2 lignes (les 2 cron jobs)

---

## 📋 Checklist Complète

- [ ] Fonction `smart-notifications` déployée ✅ (fait automatiquement)
- [ ] Secret `CRON_SECRET` configuré dans Settings → Edge Functions → Secrets
- [ ] Secret `RESEND_API_KEY` configuré (optionnel)
- [ ] Script SQL des cron jobs exécuté avec le bon CRON_SECRET
- [ ] Cron jobs vérifiés dans la base de données
- [ ] Système de notifications opérationnel

---

## 🎉 C'est Prêt !

Une fois les secrets et cron jobs configurés, le système de notifications automatiques sera opérationnel :
- ✅ Vérification toutes les heures des notifications à envoyer
- ✅ Traitement automatique de la queue d'emails
- ✅ Notifications intelligentes pour devis, chantiers, paiements, etc.

---

## 🆘 Dépannage

### Erreur : "Secret not found"

**Solution** : Vérifiez que le secret `CRON_SECRET` est bien configuré dans Settings → Edge Functions → Secrets

### Erreur : "Unauthorized" dans les logs de la fonction

**Solution** : Vérifiez que le `CRON_SECRET` dans les cron jobs correspond exactement à celui configuré dans les Secrets

### Les cron jobs ne s'exécutent pas

**Solution** : 
1. Vérifiez que les cron jobs sont actifs : `SELECT * FROM cron.job WHERE active = true;`
2. Vérifiez les logs de la fonction dans Supabase Dashboard → Edge Functions → smart-notifications → Logs

