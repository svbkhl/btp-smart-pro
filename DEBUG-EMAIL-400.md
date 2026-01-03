# 🔍 Debug Erreur 400 - send-email Edge Function

## 📋 Problème

L'Edge Function `send-email` retourne une erreur 400 (Bad Request) lors de l'envoi d'email.

## 🔍 Étapes de Diagnostic

### 1. Vérifier les Logs de l'Edge Function

**IMPORTANT** : Les logs de l'Edge Function contiennent la cause exacte de l'erreur.

1. Allez dans **Supabase Dashboard** :
   - https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions

2. Cliquez sur **send-email**

3. Allez dans l'onglet **Logs**

4. Regardez les **dernières erreurs** (les plus récentes en haut)

5. **Copiez le message d'erreur complet**

### 2. Vérifier que l'Edge Function est déployée

L'Edge Function doit être redéployée après les modifications :

```bash
# Depuis le répertoire du projet
supabase functions deploy send-email
```

Ou via Supabase Dashboard :
1. Edge Functions → send-email
2. Cliquez sur "Deploy" ou "Redeploy"

### 3. Causes Possibles et Solutions

#### ❌ Cause 1 : Edge Function non redéployée

**Symptôme** : L'erreur 400 persiste même après les corrections

**Solution** :
1. Redéployez l'Edge Function (voir étape 2)
2. Attendez quelques secondes
3. Réessayez d'envoyer un email

#### ❌ Cause 2 : Champs manquants dans la requête

**Symptôme** : Logs montrent "Missing required fields: to, subject"

**Solution** :
- Vérifiez que `to` et `subject` sont bien envoyés
- Vérifiez la console du navigateur pour voir les paramètres envoyés

#### ❌ Cause 3 : Contenu email manquant

**Symptôme** : Logs montrent "Missing email content: either html or text is required"

**Solution** :
- Vérifiez que `html` ou `text` est bien envoyé
- Le code devrait maintenant gérer ce cas

#### ❌ Cause 4 : Erreur de parsing JSON

**Symptôme** : Logs montrent "Invalid JSON in request body"

**Solution** :
- Vérifiez que le body de la requête est bien formaté
- Vérifiez la console du navigateur

### 4. Vérifier les Secrets

Assurez-vous que `RESEND_API_KEY` est configuré (optionnel mais recommandé) :

1. Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Vérifiez que `RESEND_API_KEY` existe
3. Si non, ajoutez-le (ou utilisez SMTP)

## 📝 Informations à Fournir

Pour que je puisse vous aider, j'ai besoin de :

1. **Les logs de l'Edge Function** (Supabase Dashboard → Edge Functions → send-email → Logs)
2. **Les messages d'erreur de la console du navigateur** (F12 → Console)
3. **Confirmation que l'Edge Function a été redéployée**

## ✅ Test après Redéploiement

1. Redéployez l'Edge Function
2. Ouvrez la console du navigateur (F12)
3. Essayez d'envoyer un email de test
4. Regardez les logs dans Supabase Dashboard
5. Copiez les messages d'erreur

Les nouveaux logs détaillés devraient nous donner plus d'informations sur la cause exacte du problème.


















