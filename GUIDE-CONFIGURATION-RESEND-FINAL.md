# ✅ Configuration Complète Resend - Guide Final

## 📋 Vue d'Ensemble

Votre application utilise l'Edge Function `send-email` pour envoyer des emails via Resend. La configuration se fait dans **Supabase Secrets**, pas dans `emailService.ts`.

**Flux d'envoi** :
```
emailService.ts → Edge Function send-email → Resend API
```

---

## ✅ Étape 1 : Vérifier le Domaine sur Resend

1. Allez sur https://resend.com/domains
2. Vérifiez que `btpsmartpro.com` est **Verified** ✅
3. Si non vérifié, ajoutez les enregistrements DNS (SPF, DKIM, MX)

---

## ✅ Étape 2 : Créer l'Adresse Email (Optionnel mais Recommandé)

Dans votre hébergeur de domaine :
1. Créez `contact@btpsmartpro.com`
2. Configurez un mot de passe
3. (Optionnel) Configurez un forward vers votre email principal

---

## ✅ Étape 3 : Configurer dans Supabase

### Dans Supabase Dashboard → Settings → Edge Functions → Secrets

Ajoutez/modifiez ces variables :

#### Format Simple (Recommandé)
```
RESEND_FROM_EMAIL = contact@btpsmartpro.com
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxx (clé API de production)
FROM_NAME = BTP Smart Pro
```

#### Format Complet (Alternative)
```
RESEND_FROM_EMAIL = "BTP Smart Pro" <contact@btpsmartpro.com>
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxx (clé API de production)
```

⚠️ **Important** :
- Utilisez une clé API de **production** (commence par `re_` mais pas `re_test_`)
- L'email doit utiliser le domaine vérifié (`@btpsmartpro.com`)

---

## ✅ Étape 4 : Vérifier que la Variable est Prise en Compte

### Méthode 1 : Via les Logs (Recommandé)

1. Envoyez un email de test depuis l'application
2. Allez dans **Supabase Dashboard → Edge Functions → Logs → send-email**
3. Cherchez les logs au démarrage :
   ```
   🔧 [send-email] Configuration Resend: {
     RESEND_FROM_EMAIL: "contact@btpsmartpro.com",
     RESEND_FROM_NAME: "BTP Smart Pro",
     RESEND_API_KEY_TYPE: "PRODUCTION"
   }
   ```
4. Cherchez les logs lors de l'envoi :
   ```
   📧 [send-email] Configuration email finale: {
     fromEmail: "contact@btpsmartpro.com",
     fromName: "BTP Smart Pro",
     from: "BTP Smart Pro <contact@btpsmartpro.com>"
   }
   ```

### Méthode 2 : Via l'Edge Function verify-resend-config

```bash
curl -X POST https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/verify-resend-config \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## ✅ Étape 5 : Note sur emailService.ts

**Important** : `emailService.ts` n'utilise **pas directement** Resend. Il appelle l'Edge Function `send-email` qui gère Resend.

**Vous n'avez PAS besoin de modifier `emailService.ts`** car :
- ✅ Il appelle déjà l'Edge Function `send-email`
- ✅ L'Edge Function lit `RESEND_FROM_EMAIL` depuis Supabase Secrets
- ✅ La configuration se fait uniquement dans Supabase Secrets

Le code actuel dans `emailService.ts` est correct :
```typescript
// emailService.ts appelle l'Edge Function
const functionUrl = `${SUPABASE_URL}/functions/v1/send-email`;
await fetch(functionUrl, { ... });
```

L'Edge Function `send-email` utilise automatiquement `RESEND_FROM_EMAIL` depuis les secrets.

---

## ✅ Étape 6 : Tester l'Envoi

1. Dans votre application, envoyez un email de test
2. Vérifiez les logs dans Supabase Dashboard → Edge Functions → Logs
3. Vérifiez que l'email arrive dans la boîte de réception
4. Vérifiez que l'adresse "From" est correcte : `"BTP Smart Pro" <contact@btpsmartpro.com>`

---

## 🔍 Vérifications

### Checklist

- [ ] Domaine `btpsmartpro.com` vérifié sur Resend
- [ ] `RESEND_FROM_EMAIL` configuré dans Supabase Secrets
- [ ] `RESEND_API_KEY` configuré (clé de production)
- [ ] `FROM_NAME` configuré (si format simple)
- [ ] Edge Functions redéployées (`send-email` et `send-email-from-user`)
- [ ] Logs montrent la configuration correcte
- [ ] Test d'envoi réussi
- [ ] Email reçu avec le bon "From"

---

## 🆘 Dépannage

### La Variable n'est pas Prise en Compte

1. **Vérifiez les Secrets** : Supabase Dashboard → Settings → Edge Functions → Secrets
2. **Redéployez l'Edge Function** :
   ```bash
   supabase functions deploy send-email
   ```
3. **Vérifiez les logs** : Les logs au démarrage devraient afficher la configuration

### Erreur "Invalid `from` field"

1. Vérifiez que `RESEND_FROM_EMAIL` est au format correct
2. Vérifiez les logs pour voir quelle valeur est utilisée
3. Assurez-vous que l'email contient un `@`

### Erreur "Mode test Resend"

1. Vérifiez que `RESEND_API_KEY` est une clé de **production** (pas `re_test_...`)
2. Créez une nouvelle clé API de production si nécessaire

---

## 📝 Résumé

**Configuration requise** :
- ✅ `RESEND_FROM_EMAIL` dans Supabase Secrets
- ✅ `RESEND_API_KEY` dans Supabase Secrets (clé de production)
- ✅ Domaine vérifié sur Resend

**Pas besoin de modifier** :
- ❌ `emailService.ts` (déjà correct, appelle l'Edge Function)
- ❌ Code frontend (tout passe par l'Edge Function)

**Les Edge Functions** :
- ✅ `send-email` : Déjà configurée et redéployée
- ✅ `send-email-from-user` : Déjà configurée et redéployée

---

**Une fois `RESEND_FROM_EMAIL` configuré dans Supabase Secrets, tout fonctionnera automatiquement !** 🚀



