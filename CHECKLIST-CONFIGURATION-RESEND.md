# ✅ Checklist : Configuration Resend en Production

## 📋 Étapes à Suivre

### 1️⃣ Vérification du Domaine sur Resend

- [ ] Aller sur https://resend.com/domains
- [ ] Vérifier que `btpsmartpro.com` est présent
- [ ] Vérifier que le statut est **Verified** ✅
- [ ] Si non vérifié :
  - [ ] Cliquer sur "Add Domain"
  - [ ] Entrer `btpsmartpro.com`
  - [ ] Ajouter les enregistrements DNS (SPF, DKIM, MX)
  - [ ] Attendre la vérification (5-15 minutes)

### 2️⃣ Création de la Clé API de Production

- [ ] Aller sur https://resend.com/api-keys
- [ ] Cliquer sur "Create API Key"
- [ ] Nom : `BTP Smart Pro Production`
- [ ] Permission : `Sending access` ou `Full access`
- [ ] **COPIEZ LA CLÉ** (elle ne sera affichée qu'une seule fois)
- [ ] Vérifier que la clé commence par `re_` (pas `re_test_`)

### 3️⃣ Configuration dans Supabase

- [ ] Aller dans Supabase Dashboard → Settings → Edge Functions → Secrets
- [ ] Ajouter/modifier `RESEND_API_KEY` = votre clé API de production
- [ ] Ajouter/modifier `RESEND_FROM_EMAIL` = `contact@btpsmartpro.com`
- [ ] Ajouter/modifier `FROM_NAME` = `BTP Smart Pro` (optionnel)

### 4️⃣ Création de l'Adresse Email (Optionnel mais Recommandé)

- [ ] Dans votre hébergeur de domaine, créer `contact@btpsmartpro.com`
- [ ] Configurer un mot de passe
- [ ] (Optionnel) Configurer un forward vers votre email principal

### 5️⃣ Redéploiement des Edge Functions

- [ ] Redéployer `send-email` :
  ```bash
  supabase functions deploy send-email
  ```
- [ ] Redéployer `send-email-from-user` :
  ```bash
  supabase functions deploy send-email-from-user
  ```
- [ ] (Optionnel) Déployer `verify-resend-config` pour vérifier :
  ```bash
  supabase functions deploy verify-resend-config
  ```

### 6️⃣ Vérification de la Configuration

- [ ] Appeler l'Edge Function `verify-resend-config` :
  ```bash
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/verify-resend-config \
    -H "Authorization: Bearer YOUR_ANON_KEY"
  ```
- [ ] Vérifier que tous les checks sont ✅

### 7️⃣ Tests d'Envoi

- [ ] Envoyer un email de test depuis l'application
- [ ] Vérifier les logs dans Supabase Dashboard → Edge Functions → Logs
- [ ] Vérifier que l'email est envoyé avec succès
- [ ] Vérifier dans Resend Dashboard → Emails que l'email apparaît
- [ ] Vérifier que l'adresse "From" est `contact@btpsmartpro.com`
- [ ] Vérifier que l'email arrive dans la boîte de réception (pas en spam)

### 8️⃣ Vérifications Finales

- [ ] Aucune erreur "Mode test Resend" dans les logs
- [ ] Aucune erreur "Domain is not verified"
- [ ] Les emails partent correctement vers n'importe quel destinataire
- [ ] L'adresse "From" est correcte (`contact@btpsmartpro.com` ou email utilisateur si domaine vérifié)
- [ ] Le Reply-To fonctionne si l'utilisateur a un email différent

---

## 🎯 Résultat Attendu

Une fois toutes les étapes terminées :

- ✅ Les utilisateurs peuvent envoyer des emails à **n'importe quel destinataire**
- ✅ Les emails partent depuis `contact@btpsmartpro.com` ou l'email de l'utilisateur (si domaine vérifié)
- ✅ Plus aucune erreur "mode test"
- ✅ Les emails arrivent dans la boîte de réception (pas en spam)
- ✅ Les logs indiquent clairement le succès de l'envoi

---

## 🆘 En Cas de Problème

1. **Vérifier les logs** : Supabase Dashboard → Edge Functions → Logs
2. **Vérifier la configuration** : Appeler `verify-resend-config`
3. **Vérifier Resend** : https://resend.com/emails pour voir les emails envoyés
4. **Consulter le guide complet** : `CONFIGURATION-RESEND-PRODUCTION-COMPLETE.md`

---

**Une fois toutes les cases cochées, votre système d'envoi d'emails est opérationnel !** 🚀










