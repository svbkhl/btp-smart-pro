# 📧 Configuration RESEND_FROM_EMAIL - Guide Complet

## 📋 Format de la Variable RESEND_FROM_EMAIL

La variable `RESEND_FROM_EMAIL` peut être configurée de deux façons :

### Option 1 : Format Simple (Email uniquement)
```
contact@btpsmartpro.com
```

### Option 2 : Format Complet (Recommandé)
```
"BTP Smart Pro" <contact@btpsmartpro.com>
```

Le nom sera utilisé comme nom d'expéditeur dans les emails.

---

## ✅ Configuration dans Supabase

### 1. Accéder aux Secrets

1. Allez dans **Supabase Dashboard** : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Edge Functions** → **Secrets**

### 2. Ajouter/Modifier RESEND_FROM_EMAIL

**Format recommandé** :
```
RESEND_FROM_EMAIL = "BTP Smart Pro" <contact@btpsmartpro.com>
```

**Format simple** (si vous préférez) :
```
RESEND_FROM_EMAIL = contact@btpsmartpro.com
FROM_NAME = BTP Smart Pro
```

### 3. Autres Variables Requises

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxx (clé API de production)
FROM_NAME = BTP Smart Pro (optionnel si inclus dans RESEND_FROM_EMAIL)
```

---

## 🔍 Comment Ça Fonctionne

L'Edge Function `send-email` :

1. **Parse `RESEND_FROM_EMAIL`** :
   - Si format `"Name <email@domain.com>"` → extrait le nom et l'email
   - Si format `email@domain.com` → utilise l'email et `FROM_NAME` pour le nom

2. **Détermine l'adresse "from"** :
   - Si l'utilisateur a un email avec domaine vérifié → utilise son email
   - Sinon → utilise `RESEND_FROM_EMAIL`

3. **Construit le champ "from"** :
   - Format final : `"Nom" <email@domain.com>` ou `email@domain.com`

---

## ✅ Exemples de Configuration

### Exemple 1 : Format Complet (Recommandé)
```
RESEND_FROM_EMAIL = "BTP Smart Pro" <contact@btpsmartpro.com>
RESEND_API_KEY = re_AbCdEf123456...
```

**Résultat** : Les emails partiront de `"BTP Smart Pro" <contact@btpsmartpro.com>`

### Exemple 2 : Format Simple
```
RESEND_FROM_EMAIL = contact@btpsmartpro.com
FROM_NAME = BTP Smart Pro
RESEND_API_KEY = re_AbCdEf123456...
```

**Résultat** : Les emails partiront de `"BTP Smart Pro" <contact@btpsmartpro.com>`

### Exemple 3 : Avec Email Utilisateur (si domaine vérifié)
Si l'utilisateur a configuré `sabri@btpsmartpro.com` dans `user_email_settings` :

**Résultat** : Les emails partiront de `"Sabri" <sabri@btpsmartpro.com>` (nom depuis `user_settings.signature_name`)

---

## 🧪 Tester la Configuration

### 1. Vérifier le Format

Appelez l'Edge Function `verify-resend-config` (si déployée) :

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/verify-resend-config \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 2. Envoyer un Email de Test

1. Dans votre application, envoyez un email de test
2. Vérifiez les logs dans Supabase Dashboard → Edge Functions → Logs
3. Le log devrait afficher :
   ```
   📧 [send-email] Champ 'from' formaté: "BTP Smart Pro" <contact@btpsmartpro.com>
   ```

### 3. Vérifier la Réception

1. Vérifiez que l'email arrive dans la boîte de réception
2. Vérifiez que l'adresse "From" est correcte
3. Vérifiez que le nom d'expéditeur est correct

---

## 🆘 Dépannage

### Erreur : "Invalid `from` field"

**Cause** : Le format de `RESEND_FROM_EMAIL` est incorrect

**Solution** :
1. Vérifiez que `RESEND_FROM_EMAIL` est au format `"Name <email@domain.com>"` ou `email@domain.com`
2. Vérifiez qu'il n'y a pas de caractères invalides
3. Vérifiez que l'email contient bien un `@`

### Erreur : "Domain is not verified"

**Cause** : Le domaine de l'email n'est pas vérifié sur Resend

**Solution** :
1. Vérifiez que `btpsmartpro.com` est vérifié sur https://resend.com/domains
2. Vérifiez que `RESEND_FROM_EMAIL` utilise ce domaine

### Le Nom n'Apparaît Pas

**Cause** : Le format de `RESEND_FROM_EMAIL` ne contient pas le nom

**Solution** :
1. Utilisez le format complet : `"BTP Smart Pro" <contact@btpsmartpro.com>`
2. Ou configurez `FROM_NAME = BTP Smart Pro` séparément

---

## 📝 Notes Importantes

1. **Format avec Guillemets** : Si vous utilisez le format complet, les guillemets autour du nom sont optionnels mais recommandés
2. **Espaces** : Assurez-vous qu'il y a un espace entre le nom et `<email@domain.com>`
3. **Caractères Spéciaux** : Le nom peut contenir des espaces et caractères spéciaux, mais évitez les `<` et `>`
4. **Validation** : L'Edge Function nettoie automatiquement les caractères `<` et `>` du nom pour éviter les erreurs

---

## ✅ Checklist

- [ ] `RESEND_FROM_EMAIL` configuré dans Supabase Secrets
- [ ] Format correct : `"BTP Smart Pro" <contact@btpsmartpro.com>` ou `contact@btpsmartpro.com`
- [ ] `RESEND_API_KEY` configuré (clé de production)
- [ ] `FROM_NAME` configuré (si format simple utilisé)
- [ ] Edge Functions redéployées
- [ ] Test d'envoi réussi
- [ ] Email reçu avec le bon nom et la bonne adresse

---

**Une fois configuré, tous les emails partiront avec le bon format !** 🚀











