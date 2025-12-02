# 🔍 Diagnostic Erreur 500 - generate-quote

## 📋 Problème

L'Edge Function `generate-quote` retourne une erreur 500 lors de la génération d'un devis.

## 🔍 Étapes de Diagnostic

### 1. Vérifier les Logs de l'Edge Function

**IMPORTANT** : Les logs de l'Edge Function contiennent la cause exacte de l'erreur.

1. Allez dans **Supabase Dashboard** :
   - https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/functions

2. Cliquez sur **generate-quote**

3. Allez dans l'onglet **Logs**

4. Regardez les **dernières erreurs** (les plus récentes en haut)

5. **Copiez le message d'erreur complet**

### 2. Causes Possibles et Solutions

#### ❌ Cause 1 : OPENAI_API_KEY non configurée

**Symptôme** : Logs montrent `OPENAI_API_KEY is not set` ou `OPENAI_API_KEY is not configured`

**Solution** :
1. Allez dans **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Cliquez sur **Add new secret**
3. Nom : `OPENAI_API_KEY`
4. Valeur : Votre clé API OpenAI (commence par `sk-...`)
5. Cliquez sur **Save**
6. **Redéployez l'Edge Function** :
   ```bash
   supabase functions deploy generate-quote
   ```

#### ❌ Cause 2 : Table `ai_quotes` n'existe pas

**Symptôme** : Logs montrent `Table ai_quotes does not exist` ou erreur `42P01`

**Solution** :
1. Allez dans **Supabase Dashboard** → **SQL Editor**
2. Exécutez cette requête pour créer la table :
   ```sql
   CREATE TABLE IF NOT EXISTS public.ai_quotes (
     id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     client_name TEXT,
     surface NUMERIC,
     work_type TEXT,
     materials TEXT[],
     image_urls TEXT[],
     estimated_cost NUMERIC,
     quote_number TEXT,
     details JSONB,
     status TEXT DEFAULT 'draft',
     signature_data TEXT,
     signed_by TEXT,
     signed_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
   );

   ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view their own quotes"
     ON public.ai_quotes FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can create their own quotes"
     ON public.ai_quotes FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update their own quotes"
     ON public.ai_quotes FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can delete their own quotes"
     ON public.ai_quotes FOR DELETE
     USING (auth.uid() = user_id);
   ```

#### ❌ Cause 3 : Fonction RPC `get_next_quote_number` n'existe pas

**Symptôme** : Logs montrent une erreur lors de l'appel à `get_next_quote_number`

**Solution** :
La fonction génère automatiquement un numéro de secours si la RPC n'existe pas. Ce n'est **pas bloquant**, mais vous pouvez créer la fonction :

```sql
CREATE OR REPLACE FUNCTION public.get_next_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW());
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN quote_number ~ ('^DEV-' || v_year || '-[0-9]+$')
      THEN (regexp_replace(quote_number, '^DEV-' || v_year || '-', ''))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO v_count
  FROM public.ai_quotes
  WHERE quote_number IS NOT NULL;
  
  v_number := 'DEV-' || v_year || '-' || LPAD(v_count::TEXT, 6, '0');
  
  RETURN v_number;
END;
$$;
```

#### ❌ Cause 4 : Erreur lors de l'appel OpenAI

**Symptôme** : Logs montrent `Error calling OpenAI API` ou `OpenAI API error`

**Solutions possibles** :
- Vérifier que la clé API OpenAI est valide
- Vérifier que vous avez des crédits OpenAI
- Vérifier que le modèle `gpt-4o-mini` est disponible
- Vérifier votre limite de taux (rate limit)

#### ❌ Cause 5 : Erreur de parsing de la réponse OpenAI

**Symptôme** : Logs montrent `Error parsing AI response` ou `No JSON found in response`

**Solution** :
- L'IA retourne parfois un format non-JSON
- La fonction essaie d'extraire le JSON automatiquement
- Si cela échoue, vérifiez les logs pour voir la réponse brute

### 3. Vérifier les Logs Détaillés

Les logs de l'Edge Function montrent maintenant :
- ✅ `=== GENERATE-QUOTE FUNCTION CALLED ===`
- ✅ `OPENAI_API_KEY exists: true/false`
- ✅ `Request received: ...`
- ✅ `Calling OpenAI API...`
- ✅ `OpenAI response received`
- ✅ `Parsed AI response: ...`
- ✅ `=== GENERATE-QUOTE SUCCESS ===` ou `=== GENERATE-QUOTE UNEXPECTED ERROR ===`

**Cherchez le dernier log avant l'erreur** pour identifier où ça bloque.

### 4. Test Rapide

Pour tester si l'Edge Function est bien déployée :

```bash
curl -X POST https://[VOTRE_PROJECT].supabase.co/functions/v1/generate-quote \
  -H "Authorization: Bearer [VOTRE_ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test Client",
    "surface": 100,
    "workType": "Rénovation",
    "materials": ["Béton"]
  }'
```

---

## 🚀 Actions Immédiates

1. **Vérifier OPENAI_API_KEY** dans Supabase Secrets
2. **Vérifier les logs** de l'Edge Function dans Supabase Dashboard
3. **Copier le message d'erreur exact** des logs
4. **Redéployer l'Edge Function** si nécessaire :
   ```bash
   supabase functions deploy generate-quote
   ```

---

## 📞 Si le Problème Persiste

1. **Copiez le message d'erreur complet** des logs Supabase
2. **Vérifiez que OPENAI_API_KEY est configurée**
3. **Vérifiez que la table ai_quotes existe**
4. **Testez avec curl** pour isoler le problème

---

**Les logs détaillés permettent maintenant d'identifier précisément la cause de l'erreur 500.**

