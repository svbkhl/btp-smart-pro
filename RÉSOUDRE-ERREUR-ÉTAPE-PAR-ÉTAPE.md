# 🔧 Résoudre l'Erreur generate-quote - Guide Étape par Étape

## 🎯 Objectif
Résoudre l'erreur "Edge Function returned a non-2xx status code" pour la génération de devis.

## 📋 Étapes à Suivre

### Étape 1 : Exécuter le Script SQL

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir SQL Editor**
   - Cliquer sur "SQL Editor" dans le menu latéral
   - Cliquer sur "New query"

3. **Exécuter le Script**
   - Ouvrir le fichier `supabase/RÉSOUDRE-ERREUR-GENERATE-QUOTE.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run" (ou appuyer sur Cmd+Enter / Ctrl+Enter)

4. **Vérifier le Résultat**
   - Vous devriez voir des messages `✅` dans les résultats
   - Si vous voyez des erreurs, les copier et les noter

### Étape 2 : Vérifier les Secrets

1. **Aller dans Settings**
   - Cliquer sur "Settings" dans le menu latéral
   - Cliquer sur "Edge Functions"

2. **Vérifier OPENAI_API_KEY**
   - Chercher "OPENAI_API_KEY" dans la liste des secrets
   - Si elle n'existe pas, cliquer sur "Add new secret"
   - Name: `OPENAI_API_KEY`
   - Value: Votre clé API OpenAI (commence par `sk-`)
   - Cliquer sur "Save"

3. **Vérifier les Autres Secrets**
   - `SUPABASE_URL` (automatique, devrait exister)
   - `SUPABASE_SERVICE_ROLE_KEY` (automatique, devrait exister)

### Étape 3 : Redéployer l'Edge Function

#### Option A : Via Supabase CLI (Recommandé)

```bash
# 1. Vérifier que vous êtes connecté
supabase login

# 2. Lier le projet (si pas déjà fait)
supabase link --project-ref renmjmqlmafqjzldmsgs

# 3. Déployer la fonction
supabase functions deploy generate-quote

# 4. Vérifier que la fonction est déployée
supabase functions list
```

#### Option B : Via Dashboard

1. **Aller dans Edge Functions**
   - Cliquer sur "Edge Functions" dans le menu latéral
   - Chercher "generate-quote"

2. **Modifier la Fonction**
   - Cliquer sur "generate-quote"
   - Ouvrir le fichier `supabase/functions/generate-quote/index.ts`
   - Copier tout le contenu
   - Coller dans l'éditeur du Dashboard
   - Cliquer sur "Deploy" ou "Save"

### Étape 4 : Tester la Fonction

1. **Tester depuis le Dashboard**
   - Aller dans "Edge Functions" → "generate-quote"
   - Cliquer sur "Invoke"
   - Utiliser ce payload :

```json
{
  "clientName": "Test Client",
  "surface": 100,
  "workType": "Rénovation toiture",
  "materials": ["Tuiles", "Isolation"],
  "region": "Paris"
}
```

   - Cliquer sur "Invoke"
   - **Copier la réponse complète** (succès ou erreur)

2. **Tester depuis l'Application**
   - Ouvrir l'application dans le navigateur
   - Ouvrir la console (F12 → Console)
   - Aller dans "IA" → "Devis IA"
   - Remplir le formulaire :
     - Client : "Test Client"
     - Type de travaux : "Rénovation toiture"
     - Surface : 100
     - Matériaux : Tuiles, Isolation
   - Cliquer sur "Générer le devis"
   - **Regarder la console** pour les logs détaillés
   - **Copier les logs d'erreur** si une erreur se produit

### Étape 5 : Vérifier les Logs

1. **Dans Supabase Dashboard**
   - Aller dans "Edge Functions" → "generate-quote" → "Logs"
   - Chercher les logs récents
   - **Copier les logs d'erreur**

2. **Dans la Console du Navigateur**
   - Ouvrir la console (F12 → Console)
   - Chercher les messages avec 🔵, 🟢, ou ❌
   - **Copier tous les logs d'erreur**

## 🐛 Résolution des Erreurs Courantes

### Erreur : "OPENAI_API_KEY is not configured"

**Solution :**
1. Aller dans Settings → Edge Functions → Secrets
2. Ajouter le secret `OPENAI_API_KEY` avec votre clé API OpenAI
3. Attendre 2-3 minutes
4. Redéployer la fonction

### Erreur : "Table ai_quotes does not exist"

**Solution :**
1. Exécuter le script `supabase/RÉSOUDRE-ERREUR-GENERATE-QUOTE.sql`
2. Vérifier que la table est créée avec :
   ```sql
   SELECT * FROM ai_quotes LIMIT 1;
   ```

### Erreur : "Unauthorized"

**Solution :**
1. Vérifier que vous êtes connecté dans l'application
2. Se déconnecter et se reconnecter
3. Vérifier que votre session est valide

### Erreur : "Missing required fields"

**Solution :**
1. Vérifier que tous les champs requis sont remplis :
   - `clientName` (requis)
   - `surface` (requis, nombre > 0)
   - `workType` (requis)
   - `materials` (requis, tableau non vide)
2. Vérifier les types de données dans le formulaire

### Erreur : "Error parsing AI response"

**Solution :**
1. L'IA peut parfois retourner une réponse mal formatée
2. Réessayer avec des paramètres différents
3. Vérifier les logs pour voir la réponse brute

## ✅ Vérification Finale

1. ✅ Table `ai_quotes` existe
2. ✅ RLS policies configurées (4 policies)
3. ✅ Secret `OPENAI_API_KEY` configuré
4. ✅ Edge Function déployée
5. ✅ Test depuis le Dashboard réussi
6. ✅ Test depuis l'application réussi

## 🆘 Si l'Erreur Persiste

Si l'erreur persiste après avoir suivi toutes les étapes :

1. **Copier les Informations Suivantes :**
   - Message d'erreur exact (depuis les logs)
   - Payload utilisé
   - Résultat du script SQL (messages ✅ ou ❌)
   - Résultat de la vérification des secrets
   - Logs de la console du navigateur
   - Logs de l'Edge Function

2. **Vérifier les Points Suivants :**
   - La table existe-t-elle ? (Test SQL)
   - Les secrets sont-ils configurés ? (Dashboard)
   - La fonction est-elle déployée ? (Dashboard)
   - Les logs montrent-ils des erreurs spécifiques ? (Logs)

## 📞 Support

Si vous avez besoin d'aide supplémentaire, fournissez :
- Le message d'erreur exact
- Les logs de la console
- Les logs de l'Edge Function
- Le résultat des vérifications (table, secrets, fonction)

