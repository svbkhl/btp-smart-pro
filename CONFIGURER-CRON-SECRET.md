# 🔐 Comment Configurer le Secret CRON_SECRET

## 🎯 Ce qu'est CRON_SECRET

Le `CRON_SECRET` est un secret que vous créez vous-même pour sécuriser les appels aux Edge Functions depuis les cron jobs. C'est une chaîne de caractères que vous inventez (par exemple : `mon-secret-12345`).

---

## 📋 Étape 1 : Aller dans Edge Functions → Secrets

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Cliquez sur** : **Settings** (⚙️ dans le menu de gauche)
3. **Cliquez sur** : **Edge Functions** (dans le sous-menu)
4. **Cliquez sur** : **Secrets** (ou "Environment Variables")

---

## 📋 Étape 2 : Ajouter le Secret CRON_SECRET

1. **Cliquez sur** : **"Add new secret"** (ou "Add secret")
2. **Remplissez** :
   - **Name** : `CRON_SECRET`
   - **Value** : `mon-secret-12345` (ou n'importe quelle chaîne que vous voulez)
3. **Cliquez sur** : **"Save"** (ou "Add")

**⚠️ IMPORTANT** : 
- Choisissez une chaîne secrète forte (par exemple : `ma-super-cle-secrete-2024`)
- Notez cette valeur quelque part (vous en aurez besoin si vous modifiez les Edge Functions)
- Cette valeur doit correspondre à celle utilisée dans vos Edge Functions

---

## 📋 Étape 3 : Vérifier que le Secret est Configuré

1. **Vérifiez** que vous voyez maintenant :
   - **Name** : `CRON_SECRET`
   - **Value** : `***` (masqué pour la sécurité)

---

## 🔧 Comment le Secret est Utilisé

Le `CRON_SECRET` est utilisé dans les Edge Functions pour vérifier que les appels proviennent bien des cron jobs (et non d'une source non autorisée).

### Dans les Edge Functions

Les Edge Functions (`smart-notifications` et `process-email-queue`) vérifient ce secret :

```typescript
const cronSecret = Deno.env.get('CRON_SECRET');
const authHeader = req.headers.get('authorization');

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
  });
}
```

### Dans les Cron Jobs (SQL)

Les cron jobs envoient ce secret dans le header `Authorization` :

```sql
SELECT net.http_post(
  url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/smart-notifications',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer mon-secret-12345' -- VOTRE CRON_SECRET
  ),
  body := '{}'::jsonb
);
```

---

## ⚠️ Important : Utiliser le Script SQL avec CRON_SECRET

### Option 1 : Utiliser CRON_SECRET (Recommandé)

1. **Ouvrez** : `supabase/CONFIGURE-CRON-JOBS-AVEC-CRON-SECRET.sql`
2. **Trouvez** : `YOUR_CRON_SECRET` (apparaît 2 fois)
3. **Remplacez** : Par la valeur de votre `CRON_SECRET` (ex: `mon-secret-12345`)
4. **Exécutez** le script dans SQL Editor

### Option 2 : Utiliser SERVICE_ROLE_KEY (Plus Simple)

1. **Ouvrez** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`
2. **Trouvez** : `YOUR_SERVICE_ROLE_KEY` (apparaît 2 fois)
3. **Remplacez** : Par votre `SERVICE_ROLE_KEY` (trouvée dans Settings → API)
4. **Exécutez** le script dans SQL Editor

**⚠️ Note** : Si vous utilisez `SERVICE_ROLE_KEY`, vous pouvez ignorer la configuration de `CRON_SECRET` dans les secrets (mais ce n'est pas recommandé pour la sécurité).

---

## 🔒 Sécurité

### Option 1 : Utiliser CRON_SECRET (Recommandé)

- **Avantage** : Plus sécurisé, secret dédié uniquement aux cron jobs
- **Inconvénient** : Vous devez le configurer dans les Edge Functions et dans le script SQL

### Option 2 : Utiliser SERVICE_ROLE_KEY (Plus Simple)

- **Avantage** : Plus simple, pas besoin de configurer un secret supplémentaire
- **Inconvénient** : Moins sécurisé (la clé service_role a des permissions très élevées)

**Recommandation** : Utilisez `CRON_SECRET` pour plus de sécurité, mais les deux fonctionnent.

---

## 📋 Résumé des Secrets à Configurer

### Secret 1 : RESEND_API_KEY (Optionnel)

- **Name** : `RESEND_API_KEY`
- **Value** : Votre clé Resend (pour envoyer des emails)
- **Où** : Settings → Edge Functions → Secrets
- **Quand** : Si vous voulez envoyer des emails automatiquement

### Secret 2 : CRON_SECRET (Recommandé)

- **Name** : `CRON_SECRET`
- **Value** : `mon-secret-12345` (ou n'importe quelle chaîne)
- **Où** : Settings → Edge Functions → Secrets
- **Quand** : Pour sécuriser les appels aux Edge Functions depuis les cron jobs

---

## ✅ Vérification

### Vérifier que le Secret est Configuré

1. **Allez dans** : Settings → Edge Functions → Secrets
2. **Vérifiez** que vous voyez :
   - `CRON_SECRET` (si vous l'avez configuré)
   - `RESEND_API_KEY` (si vous l'avez configuré)

### Tester les Edge Functions

1. **Testez** : Appelez manuellement une Edge Function avec le `CRON_SECRET` dans le header
2. **Vérifiez** : Que la fonction répond correctement

---

## 🆘 Problèmes Courants

### Erreur "Unauthorized" lors de l'appel des Edge Functions

**Solution** : 
- Vérifiez que le `CRON_SECRET` est bien configuré dans Settings → Edge Functions → Secrets
- Vérifiez que le script SQL utilise le même `CRON_SECRET` dans le header `Authorization`

### Je ne trouve pas "Edge Functions → Secrets"

**Solution** :
- Vérifiez que vous êtes dans Settings → Edge Functions
- Cherchez "Secrets" ou "Environment Variables" dans le sous-menu
- Si vous ne le trouvez pas, vous pouvez aussi configurer les secrets lors du déploiement des Edge Functions

---

## 📚 Ressources

- **Guide complet** : `FAIRE-TOUT-EN-4-ÉTAPES.md`
- **Script SQL** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`
- **Documentation Supabase** : https://supabase.com/docs/guides/functions/secrets

---

## ✅ Résumé en 3 Points

1. **Où** : Settings → Edge Functions → Secrets
2. **Quoi** : Ajoutez `CRON_SECRET` avec la valeur `mon-secret-12345` (ou votre propre secret)
3. **Pourquoi** : Pour sécuriser les appels aux Edge Functions depuis les cron jobs

**C'est tout !** 🚀

