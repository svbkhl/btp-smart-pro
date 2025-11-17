# 🔍 Diagnostic Erreur generate-quote

## 📋 Étapes de Diagnostic

### 1. Vérifier les Logs dans Supabase Dashboard

1. Aller dans **Supabase Dashboard** → **Edge Functions** → **generate-quote**
2. Cliquer sur **Logs**
3. Chercher les erreurs récentes
4. **Copier le message d'erreur exact** que vous voyez

### 2. Vérifier que la Table Existe

**Dans Supabase SQL Editor, exécutez :**

```sql
-- Vérifier si la table existe
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'ai_quotes'
);
```

**Si le résultat est `false`, exécutez :**
```sql
-- Créer la table
\i supabase/VERIFIER-ET-CREER-AI-QUOTES.sql
```

**Ou copiez-collez le contenu de `supabase/VERIFIER-ET-CREER-AI-QUOTES.sql` dans SQL Editor.**

### 3. Vérifier les Secrets

**Dans Supabase Dashboard :**
1. Aller dans **Settings** → **Edge Functions** → **Secrets**
2. Vérifier que `OPENAI_API_KEY` existe
3. Vérifier que la valeur commence par `sk-`
4. Si elle n'existe pas, ajoutez-la :
   - Name: `OPENAI_API_KEY`
   - Value: Votre clé API OpenAI

### 4. Tester la Fonction Directement

**Dans Supabase Dashboard :**
1. Aller dans **Edge Functions** → **generate-quote**
2. Cliquer sur **Invoke**
3. Utiliser ce payload :

```json
{
  "clientName": "Test Client",
  "surface": 100,
  "workType": "Rénovation toiture",
  "materials": ["Tuiles", "Isolation"],
  "region": "Paris"
}
```

4. **Copier la réponse complète** (succès ou erreur)

### 5. Vérifier les RLS Policies

**Dans Supabase SQL Editor :**

```sql
-- Vérifier les policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'ai_quotes';
```

**Résultat attendu :** 4 policies (SELECT, INSERT, UPDATE, DELETE)

### 6. Vérifier l'Authentification

**Dans l'application :**
1. Vérifier que vous êtes bien connecté
2. Vérifier que votre session est valide
3. Essayer de vous déconnecter et vous reconnecter

## 🐛 Erreurs Courantes et Solutions

### Erreur : "OPENAI_API_KEY is not set"
**Solution :**
- Vérifier que le secret est configuré dans Supabase Dashboard
- Attendre 2-3 minutes après l'ajout du secret
- Redéployer la fonction après avoir ajouté le secret

### Erreur : "Table ai_quotes does not exist"
**Solution :**
- Exécuter `supabase/VERIFIER-ET-CREER-AI-QUOTES.sql`
- Vérifier que la table est créée avec `SELECT * FROM ai_quotes LIMIT 1;`

### Erreur : "Unauthorized"
**Solution :**
- Vérifier que vous êtes connecté
- Vérifier que le token JWT est valide
- Se déconnecter et se reconnecter

### Erreur : "Invalid request body"
**Solution :**
- Vérifier que tous les champs requis sont remplis
- Vérifier les types de données (surface doit être un nombre, materials doit être un tableau)

### Erreur : "Error parsing AI response"
**Solution :**
- L'IA peut parfois retourner une réponse mal formatée
- Réessayer avec des paramètres différents
- Vérifier les logs pour voir la réponse brute

## 📝 Informations à Fournir

Si l'erreur persiste, fournissez :

1. **Message d'erreur exact** (depuis les logs Supabase)
2. **Payload utilisé** (les données envoyées)
3. **Timestamp de l'erreur**
4. **Résultat de la vérification de la table** (existe ou non)
5. **Résultat de la vérification des secrets** (configuré ou non)
6. **Résultat du test direct** (depuis le Dashboard)

## 🔧 Test Rapide

**Exécutez ce script SQL pour vérifier tout :**

```sql
-- 1. Vérifier la table
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'ai_quotes'
) AS table_exists;

-- 2. Vérifier les policies
SELECT COUNT(*) AS policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'ai_quotes';

-- 3. Vérifier les index
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'ai_quotes';

-- 4. Vérifier la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'ai_quotes'
ORDER BY ordinal_position;
```

## 🚀 Solution Rapide

Si vous voulez une solution rapide, exécutez ce script SQL complet :

```sql
-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.ai_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  surface NUMERIC,
  work_type TEXT,
  materials TEXT[],
  image_urls TEXT[],
  estimated_cost NUMERIC,
  details JSONB,
  status TEXT DEFAULT 'draft',
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;

-- Créer les policies
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.ai_quotes;

CREATE POLICY "Users can view their own quotes" 
ON public.ai_quotes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" 
ON public.ai_quotes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" 
ON public.ai_quotes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" 
ON public.ai_quotes FOR DELETE 
USING (auth.uid() = user_id);
```

Ensuite, **redéployez la fonction** et **testez à nouveau**.

