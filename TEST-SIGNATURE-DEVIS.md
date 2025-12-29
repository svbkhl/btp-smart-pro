# 🧪 Test de la Signature de Devis

## Étapes de test

### 1. Prérequis
- ✅ Les Edge Functions sont déployées (`get-public-document`, `sign-quote`)
- ✅ Les variables d'environnement sont configurées
- ✅ La colonne `signed` existe dans `ai_quotes`

### 2. Créer un devis de test

1. Connectez-vous à l'application
2. Allez dans **Devis** ou **IA** → **Générer un devis**
3. Créez un devis simple avec :
   - Client : Votre nom
   - Email : Votre email
   - Montant : 1000€

### 3. Envoyer le devis par email

1. Cliquez sur **Envoyer par email**
2. Vérifiez que l'email est bien envoyé
3. **Important** : Ouvrez l'email et vérifiez le lien de signature

### 4. Tester le lien

1. **Copiez le lien** depuis l'email
2. **Ouvrez-le dans un navigateur en navigation privée** (pour simuler un client)
3. **Vérifiez** :
   - ✅ La page se charge
   - ✅ Les informations du devis s'affichent
   - ✅ Le bouton "Signer le devis" est visible

### 5. Signer le devis

1. Cliquez sur **"Signer le devis"**
2. **Vérifiez** :
   - ✅ Un message de succès s'affiche
   - ✅ Le devis est marqué comme signé
   - ✅ La date de signature est enregistrée

### 6. Vérifier dans la base de données

**Dans Supabase Dashboard → SQL Editor :**
```sql
SELECT 
  id,
  quote_number,
  client_name,
  signed,
  signed_at,
  signed_by,
  status
FROM ai_quotes
WHERE id = 'VOTRE_QUOTE_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Vérifiez que :**
- ✅ `signed` = `true`
- ✅ `signed_at` a une date
- ✅ `signed_by` contient le nom du client
- ✅ `status` = `'signed'`

## Problèmes et solutions

### Le lien ne fonctionne pas

**Symptôme :** "Devis introuvable" ou erreur 404

**Solutions :**
1. Vérifiez que l'Edge Function `get-public-document` est déployée
2. Vérifiez les logs de l'Edge Function dans Supabase
3. Testez l'Edge Function directement avec curl (voir DIAGNOSTIC-SIGNATURE-DEVIS.md)

### Le bouton de signature ne fonctionne pas

**Symptôme :** Erreur lors du clic sur "Signer le devis"

**Solutions :**
1. Vérifiez que l'Edge Function `sign-quote` est déployée
2. Vérifiez que la colonne `signed` existe dans `ai_quotes`
3. Vérifiez les logs de l'Edge Function dans Supabase

### Le devis ne se charge pas

**Symptôme :** Page blanche ou erreur de chargement

**Solutions :**
1. Ouvrez la console du navigateur (F12)
2. Vérifiez les erreurs dans la console
3. Vérifiez les requêtes réseau (onglet Network)
4. Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sont corrects





