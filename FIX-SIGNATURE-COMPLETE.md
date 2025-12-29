# 🔧 Fix Complet - Signature de Devis

## ✅ Corrections Appliquées

### 1. Page SignaturePage.tsx
- ✅ Utilise l'Edge Function `get-public-document` pour charger le devis
- ✅ Utilise l'Edge Function `sign-quote` pour signer le devis
- ✅ Gestion d'erreurs améliorée
- ✅ Support des deux variables d'environnement (`VITE_SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_ANON_KEY`)

### 2. Nouvelle Page QuotePage.tsx
- ✅ Route `/quote/:id` pour voir un devis sans authentification
- ✅ Affiche les informations du devis
- ✅ Bouton pour signer si non signé

### 3. Edge Function sign-quote
- ✅ Créée et prête à être déployée
- ✅ Permet de signer un devis sans authentification
- ✅ Vérifie que le devis existe et n'est pas déjà signé

### 4. Edge Function get-public-document
- ✅ Retourne toutes les colonnes nécessaires
- ✅ Gestion d'erreurs améliorée

### 5. Génération du lien dans les emails
- ✅ Amélioration de la récupération de l'URL de base
- ✅ Support de plusieurs variables d'environnement
- ✅ Nettoyage de l'URL (suppression du slash final)
- ✅ Logs améliorés pour le débogage

## 🚀 Actions Requises

### Étape 1 : Déployer les Edge Functions

```bash
# Dans le terminal, à la racine du projet
supabase functions deploy get-public-document
supabase functions deploy sign-quote
```

**OU via Supabase Dashboard :**
1. Allez dans **Edge Functions**
2. Vérifiez que `get-public-document` et `sign-quote` sont listées
3. Si elles ne sont pas listées, déployez-les via la CLI

### Étape 2 : Configurer les Variables d'Environnement dans Supabase

**Dans Supabase Dashboard :**
1. Allez dans **Settings** → **Edge Functions** → **Secrets**
2. Vérifiez que ces variables sont configurées :
   - `SUPABASE_SERVICE_ROLE_KEY` (obligatoire)
   - `APP_URL` ou `PUBLIC_URL` (pour les liens dans les emails)

**Pour trouver SUPABASE_SERVICE_ROLE_KEY :**
1. Allez dans **Settings** → **API**
2. Copiez la clé **service_role** (⚠️ NE JAMAIS exposer cette clé publiquement)

### Étape 3 : Vérifier la Structure de la Table

**Dans Supabase Dashboard → SQL Editor :**
```sql
-- Vérifier que la colonne 'signed' existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_quotes' 
AND column_name = 'signed';

-- Si elle n'existe pas, l'ajouter
ALTER TABLE public.ai_quotes 
ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signed_by TEXT,
ADD COLUMN IF NOT EXISTS signature_data TEXT;
```

### Étape 4 : Tester

1. **Créer un devis** dans l'application
2. **Envoyer le devis par email** à vous-même
3. **Ouvrir l'email** et cliquer sur le lien de signature
4. **Vérifier** que la page se charge avec les informations du devis
5. **Cliquer sur "Signer le devis"**
6. **Vérifier** que le devis est marqué comme signé

## 🔍 Diagnostic en Cas de Problème

### Problème : "Devis introuvable"

**Vérifications :**
1. ✅ L'Edge Function `get-public-document` est déployée
2. ✅ `SUPABASE_SERVICE_ROLE_KEY` est configurée dans Supabase
3. ✅ Le `quote_id` dans l'URL correspond à un devis existant

**Test direct :**
```bash
curl -X POST https://VOTRE_PROJET.supabase.co/functions/v1/get-public-document \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_ANON_KEY" \
  -d '{"quote_id": "VOTRE_QUOTE_ID"}'
```

### Problème : Erreur lors de la signature

**Vérifications :**
1. ✅ L'Edge Function `sign-quote` est déployée
2. ✅ La colonne `signed` existe dans `ai_quotes`
3. ✅ `SUPABASE_SERVICE_ROLE_KEY` est configurée

**Test direct :**
```bash
curl -X POST https://VOTRE_PROJET.supabase.co/functions/v1/sign-quote \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_ANON_KEY" \
  -d '{"quote_id": "VOTRE_QUOTE_ID", "signer_name": "Test"}'
```

### Problème : Le lien dans l'email est incorrect

**Vérifications :**
1. ✅ `APP_URL` ou `PUBLIC_URL` est configurée dans Supabase Edge Functions Secrets
2. ✅ L'URL ne contient pas de slash final
3. ✅ L'URL pointe vers votre domaine de production (pas localhost)

**Vérifier les logs :**
Dans Supabase Dashboard → Edge Functions → Logs → `send-email`
Cherchez : `📝 [send-email] Lien de signature généré: ...`

## 📝 Checklist Finale

- [ ] Edge Functions déployées (`get-public-document`, `sign-quote`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurée dans Supabase
- [ ] `APP_URL` ou `PUBLIC_URL` configurée dans Supabase
- [ ] Colonne `signed` existe dans `ai_quotes`
- [ ] Test de création et envoi d'un devis
- [ ] Test du lien de signature depuis l'email
- [ ] Test de la signature du devis
- [ ] Vérification dans la base de données que le devis est signé

## 🆘 Si ça ne marche toujours pas

1. **Vérifiez les logs** dans Supabase Dashboard → Edge Functions → Logs
2. **Ouvrez la console du navigateur** (F12) et vérifiez les erreurs
3. **Testez les Edge Functions directement** avec curl (voir ci-dessus)
4. **Vérifiez que les routes sont correctes** dans `App.tsx` :
   - `/sign/:quoteId` → `SignaturePage`
   - `/quote/:id` → `QuotePage`





