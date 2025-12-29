# 🔍 Diagnostic - Signature de Devis

## Problèmes possibles et solutions

### 1. Vérifier que les Edge Functions sont déployées

Les Edge Functions suivantes doivent être déployées :
- `get-public-document` - Pour récupérer les devis sans authentification
- `sign-quote` - Pour signer les devis sans authentification

**Vérification :**
```bash
# Dans le terminal, à la racine du projet
supabase functions list
```

**Si elles ne sont pas listées, déployez-les :**
```bash
supabase functions deploy get-public-document
supabase functions deploy sign-quote
```

### 2. Vérifier les variables d'environnement

**Dans Supabase Dashboard :**
1. Allez dans **Settings** → **Edge Functions**
2. Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est configurée
3. Vérifiez que `APP_URL` ou `VITE_PUBLIC_URL` est configurée (pour les liens dans les emails)

**Dans votre fichier `.env` local :**
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public
```

### 3. Vérifier que la colonne `signed` existe

**Dans Supabase Dashboard :**
1. Allez dans **SQL Editor**
2. Exécutez :
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_quotes' 
AND column_name = 'signed';
```

**Si la colonne n'existe pas, exécutez :**
```sql
ALTER TABLE public.ai_quotes 
ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT false;
```

### 4. Tester l'Edge Function directement

**Test 1 : Récupérer un devis**
```bash
curl -X POST https://votre-projet.supabase.co/functions/v1/get-public-document \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_ANON_KEY" \
  -d '{"quote_id": "VOTRE_QUOTE_ID"}'
```

**Test 2 : Signer un devis**
```bash
curl -X POST https://votre-projet.supabase.co/functions/v1/sign-quote \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_ANON_KEY" \
  -d '{"quote_id": "VOTRE_QUOTE_ID", "signer_name": "Test Client"}'
```

### 5. Vérifier les logs des Edge Functions

**Dans Supabase Dashboard :**
1. Allez dans **Edge Functions** → **Logs**
2. Vérifiez les erreurs récentes pour `get-public-document` et `sign-quote`

### 6. Vérifier le format du lien dans l'email

Le lien généré doit être au format :
```
https://btpsmartpro.com/sign/{quote_id}
```

**Vérification dans les logs de l'Edge Function `send-email` :**
- Cherchez le log : `📝 [send-email] Lien de signature généré: ...`
- Vérifiez que l'URL est correcte (pas de localhost)

### 7. Erreurs courantes

**Erreur : "Quote not found"**
- Vérifiez que le `quote_id` dans l'URL correspond à un devis existant
- Vérifiez que l'Edge Function `get-public-document` utilise `SUPABASE_SERVICE_ROLE_KEY`

**Erreur : "Devis introuvable"**
- Vérifiez que l'Edge Function `get-public-document` est déployée
- Vérifiez les logs de l'Edge Function pour voir l'erreur exacte

**Erreur : "Failed to sign quote"**
- Vérifiez que la colonne `signed` existe dans `ai_quotes`
- Vérifiez que l'Edge Function `sign-quote` utilise `SUPABASE_SERVICE_ROLE_KEY`

### 8. Test complet

1. **Créer un devis** dans l'application
2. **Envoyer le devis par email** à vous-même
3. **Cliquer sur le lien** dans l'email
4. **Vérifier** que la page se charge avec les informations du devis
5. **Cliquer sur "Signer le devis"**
6. **Vérifier** que le devis est marqué comme signé

## Commandes de déploiement rapide

```bash
# 1. Déployer les Edge Functions
supabase functions deploy get-public-document
supabase functions deploy sign-quote

# 2. Vérifier les variables d'environnement dans Supabase
# Settings → Edge Functions → Secrets

# 3. Tester
# Ouvrez un devis, envoyez-le par email, cliquez sur le lien
```





