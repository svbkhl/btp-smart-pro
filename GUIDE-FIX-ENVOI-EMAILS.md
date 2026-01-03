# 📧 Guide : Résoudre le Problème d'Envoi d'Emails

## 🔴 Problème Actuel

L'erreur indique que Resend en mode test ne permet d'envoyer qu'à votre propre adresse email (`sabri.khalfallah6@gmail.com`). Pour envoyer à d'autres destinataires, vous devez :

## ✅ Solution 1 : Vérifier un Domaine sur Resend (Recommandé)

### Étapes :

1. **Allez sur Resend** : https://resend.com/domains
2. **Connectez-vous** à votre compte Resend
3. **Cliquez sur "Add Domain"**
4. **Ajoutez votre domaine** (ex: `votre-domaine.com`)
5. **Ajoutez les enregistrements DNS** dans votre hébergeur :
   - **SPF** : `v=spf1 include:resend.com ~all`
   - **DKIM** : (Resend vous donnera les clés)
   - **DMARC** : (optionnel mais recommandé)
6. **Attendez la vérification** (généralement quelques minutes)
7. **Une fois vérifié**, vous pouvez utiliser `noreply@votre-domaine.com` comme adresse "from"

### Mettre à jour l'Edge Function :

Une fois votre domaine vérifié, modifiez `supabase/functions/send-email/index.ts` :

```typescript
// Ligne ~11
const FROM_EMAIL = "noreply@votre-domaine.com"; // Remplacez par votre domaine vérifié
```

Puis redéployez :
```bash
supabase functions deploy send-email
```

---

## ✅ Solution 2 : Utiliser Mailgun (Alternative)

### Étapes :

1. **Créez un compte** : https://www.mailgun.com
2. **Vérifiez votre domaine** ou utilisez le domaine de test Mailgun
3. **Récupérez votre clé API** : Settings > API Keys
4. **Dans Supabase Dashboard** :
   - Allez dans **Project Settings** > **Edge Functions** > **Secrets**
   - Ajoutez : `MAILGUN_API_KEY` = votre clé API
   - Ajoutez : `MAILGUN_DOMAIN` = votre domaine (ex: `sandbox-xxx.mailgun.org` pour les tests)

L'Edge Function utilisera automatiquement Mailgun si ces variables sont configurées.

---

## ✅ Solution 3 : Utiliser une Clé API de Production Resend

Si vous avez un compte Resend payant ou un plan qui permet les clés de production :

1. **Allez sur Resend** : https://resend.com/api-keys
2. **Créez une nouvelle clé API** (pas une clé de test)
3. **Dans Supabase Dashboard** :
   - Allez dans **Project Settings** > **Edge Functions** > **Secrets**
   - Remplacez `RESEND_API_KEY` par votre nouvelle clé de production

---

## 🔧 Modifications Apportées

J'ai modifié l'Edge Function `send-email` pour :

1. ✅ **Toujours utiliser `onboarding@resend.dev`** comme adresse "from" par défaut
2. ✅ **Configurer le Reply-To** avec l'email original de l'utilisateur
3. ✅ **Améliorer les messages d'erreur** pour expliquer le problème

### Redéployer l'Edge Function :

```bash
# Depuis le dossier du projet
supabase functions deploy send-email
```

Ou via Supabase Dashboard :
1. Allez dans **Edge Functions**
2. Sélectionnez `send-email`
3. Cliquez sur **Deploy** ou **Update**

---

## 🧪 Tester l'Envoi

Après avoir configuré Resend ou Mailgun :

1. **Testez avec votre propre email** d'abord
2. **Puis testez avec un autre destinataire**
3. **Vérifiez les logs** dans Supabase Dashboard > Edge Functions > Logs

---

## 📝 Notes Importantes

- **Resend en mode test** : Limite d'envoi à votre propre adresse uniquement
- **Resend avec domaine vérifié** : Permet d'envoyer à n'importe quelle adresse
- **Mailgun** : Permet d'envoyer immédiatement (même en mode test/sandbox)
- **Reply-To** : L'email original de l'utilisateur est toujours dans le Reply-To, même si l'envoi se fait depuis `onboarding@resend.dev`

---

## 🆘 Si Ça Ne Marche Toujours Pas

1. **Vérifiez les logs** : Supabase Dashboard > Edge Functions > Logs > `send-email`
2. **Vérifiez les secrets** : Settings > Edge Functions > Secrets
3. **Testez manuellement** : Utilisez l'onglet "Invoke" dans Edge Functions
4. **Contactez le support** : Si le problème persiste

---

## ✅ Checklist

- [ ] Compte Resend créé
- [ ] Domaine vérifié sur Resend OU Mailgun configuré
- [ ] `RESEND_API_KEY` configuré dans Supabase Secrets
- [ ] Edge Function `send-email` redéployée
- [ ] Test d'envoi réussi à votre propre email
- [ ] Test d'envoi réussi à un autre destinataire

---

**Une fois configuré, l'envoi d'emails devrait fonctionner normalement !** 🎉












