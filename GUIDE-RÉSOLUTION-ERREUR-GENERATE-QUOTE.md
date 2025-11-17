# 🔧 Guide de Résolution - Erreur generate-quote

## ❌ Erreur : "Edge Function returned a non-2xx status code"

## 🔍 Diagnostic

Cette erreur peut avoir plusieurs causes. Suivez ce guide pour identifier et résoudre le problème.

## 📋 Checklist de Diagnostic

### 1. Vérifier les Variables d'Environnement

**Dans Supabase Dashboard :**
- Aller dans `Settings` → `Edge Functions` → `Secrets`
- Vérifier que `OPENAI_API_KEY` existe et est valide
- Vérifier que `SUPABASE_URL` est configuré (automatique)
- Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est configuré (automatique)

**Test :**
```bash
# Via Supabase CLI
supabase secrets list
```

### 2. Vérifier que la Table ai_quotes Existe

**Dans Supabase Dashboard :**
- Aller dans `SQL Editor`
- Exécuter ce script :

```sql
-- Vérifier si la table existe
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'ai_quotes'
);
```

**Si la table n'existe pas :**
- Exécuter le script `supabase/VERIFIER-ET-CREER-AI-QUOTES.sql`
- Ou exécuter `supabase/AUTOMATED-NOTIFICATIONS-COMPLETE.sql`

### 3. Vérifier les RLS Policies

**Dans Supabase Dashboard :**
- Aller dans `SQL Editor`
- Exécuter :

```sql
-- Vérifier les policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'ai_quotes';
```

**Résultat attendu :** 4 policies (SELECT, INSERT, UPDATE, DELETE)

### 4. Vérifier les Logs de l'Edge Function

**Dans Supabase Dashboard :**
- Aller dans `Edge Functions` → `generate-quote` → `Logs`
- Chercher les erreurs récentes

**Erreurs courantes :**
- `OPENAI_API_KEY is not set` → Vérifier les secrets
- `Table ai_quotes does not exist` → Créer la table
- `Unauthorized` → Vérifier l'authentification
- `Invalid request body` → Vérifier les paramètres envoyés
- `Timeout` → Réduire la quantité de données

## 🔧 Solutions par Erreur

### Erreur : "OPENAI_API_KEY is not set"

**Solution :**
1. Aller dans `Settings` → `Edge Functions` → `Secrets`
2. Ajouter/Modifier le secret :
   - Name: `OPENAI_API_KEY`
   - Value: Votre clé API OpenAI (commence par `sk-`)
3. Attendre 2-3 minutes pour la propagation
4. Redéployer la fonction

### Erreur : "Table ai_quotes does not exist"

**Solution :**
1. Exécuter le script `supabase/VERIFIER-ET-CREER-AI-QUOTES.sql`
2. Vérifier que la table est créée
3. Redéployer la fonction

### Erreur : "Unauthorized"

**Solution :**
1. Vérifier que vous êtes connecté dans l'application
2. Vérifier que le token JWT est valide
3. Se déconnecter et se reconnecter
4. Vider le cache du navigateur

### Erreur : "Invalid request body"

**Solution :**
1. Vérifier que tous les champs requis sont remplis :
   - `clientName` (requis)
   - `surface` (requis, nombre > 0)
   - `workType` (requis)
   - `materials` (requis, tableau non vide)
2. Vérifier les types de données :
   - `surface` doit être un nombre
   - `materials` doit être un tableau
   - `imageUrls` doit être un tableau (optionnel)

### Erreur : "Timeout"

**Solution :**
1. Réduire la quantité de données :
   - Moins de matériaux
   - Pas d'images
   - Région plus courte
2. La fonction a un timeout de 28 secondes pour l'appel OpenAI
3. Si le problème persiste, vérifier la connexion internet

### Erreur : "Error parsing AI response"

**Solution :**
1. L'IA peut parfois retourner une réponse mal formatée
2. La fonction essaie de parser le JSON automatiquement
3. Si le problème persiste, vérifier les logs pour voir la réponse brute
4. Réessayer avec des paramètres différents

### Erreur : "Database error"

**Solution :**
1. Vérifier que la table `ai_quotes` existe
2. Vérifier que les RLS policies sont configurées
3. Vérifier que l'utilisateur a les permissions nécessaires
4. **Note :** La fonction continue même si la sauvegarde échoue (elle retourne quand même le devis)

## 🚀 Redéploiement

### Via Supabase CLI

```bash
# 1. Se connecter
supabase login

# 2. Lier le projet
supabase link --project-ref renmjmqlmafqjzldmsgs

# 3. Déployer la fonction
supabase functions deploy generate-quote

# 4. Vérifier les logs
supabase functions logs generate-quote --tail
```

### Via Dashboard Supabase

1. Aller dans `Edge Functions`
2. Sélectionner `generate-quote`
3. Copier le contenu de `supabase/functions/generate-quote/index.ts`
4. Coller dans l'éditeur
5. Cliquer sur `Deploy` ou `Save`

## ✅ Test de la Fonction

### Dans le Dashboard Supabase

1. Aller dans `Edge Functions` → `generate-quote`
2. Cliquer sur `Invoke`
3. Utiliser ce payload de test :

```json
{
  "clientName": "Test Client",
  "surface": 100,
  "workType": "Rénovation toiture",
  "materials": ["Tuiles", "Isolation"],
  "region": "Paris"
}
```

### Dans l'Application

1. Aller dans `IA` → `Devis IA`
2. Remplir le formulaire :
   - Client : "Test Client"
   - Type de travaux : "Rénovation toiture"
   - Surface : 100
   - Matériaux : Tuiles, Isolation
3. Cliquer sur "Générer le devis"
4. Vérifier que le devis est généré

## 📊 Vérification Post-Déploiement

### 1. Vérifier les Logs

```bash
# Via CLI
supabase functions logs generate-quote --tail

# Ou dans le Dashboard
# Edge Functions → generate-quote → Logs
```

### 2. Vérifier la Table

```sql
-- Vérifier les devis créés
SELECT id, client_name, work_type, estimated_cost, status, created_at
FROM public.ai_quotes
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Tester avec Différents Paramètres

- Avec prix manuel
- Sans prix manuel
- Avec région
- Sans région
- Avec images
- Sans images

## 🆘 Si l'Erreur Persiste

### 1. Vérifier les Logs Détaillés

Dans le Dashboard Supabase :
- Aller dans `Edge Functions` → `generate-quote` → `Logs`
- Chercher les erreurs avec le timestamp correspondant
- Noter le message d'erreur exact

### 2. Tester la Fonction Directement

Dans le Dashboard :
- Utiliser l'outil `Invoke` pour tester directement
- Vérifier les logs en temps réel

### 3. Vérifier les Secrets

```bash
# Lister tous les secrets
supabase secrets list

# Vérifier qu'OPENAI_API_KEY existe
```

### 4. Contacter le Support

Si le problème persiste :
1. Noter le message d'erreur exact
2. Noter les logs de l'Edge Function
3. Noter les paramètres utilisés
4. Vérifier la configuration des secrets

## ✅ Checklist Finale

- [ ] Secrets configurés (OPENAI_API_KEY)
- [ ] Table ai_quotes existe
- [ ] RLS policies configurées
- [ ] Edge Function déployée
- [ ] Logs vérifiés (pas d'erreurs)
- [ ] Test réussi dans l'application
- [ ] Test réussi avec différents paramètres

## 📝 Notes Importantes

1. **Sauvegarde non-bloquante** : Si la sauvegarde dans la DB échoue, la fonction retourne quand même le devis généré par l'IA.

2. **Timeout** : L'appel OpenAI a un timeout de 28 secondes. Si la requête prend plus de temps, elle sera annulée.

3. **Validation** : La fonction valide tous les paramètres avant de faire l'appel à l'IA.

4. **Gestion d'erreurs** : La fonction gère les erreurs à chaque étape et retourne des messages d'erreur détaillés.

