# 🔍 Diagnostic Détaillé - Erreur 500 Assistant IA

## 🎯 Problème

**Erreur** : `Erreur 500: Edge Function returned a non-2xx status code`

L'assistant IA retourne toujours une erreur 500 même après les optimisations.

---

## 🔍 Étapes de Diagnostic

### Étape 1 : Vérifier les Logs dans Supabase

1. **Allez dans** : Supabase Dashboard → Edge Functions → ai-assistant → Logs
2. **Regardez les dernières erreurs** (les plus récentes en haut)
3. **Copiez les messages d'erreur complets**

**Messages à chercher** :
- `OPENAI_API_KEY is not set`
- `Table ai_conversations does not exist`
- `Unauthorized`
- `OpenAI API error`
- `EarlyDrop`
- `shutdown`
- Toute autre erreur

---

### Étape 2 : Vérifier que OPENAI_API_KEY est Configuré

1. **Allez dans** : Settings → Edge Functions → Secrets
2. **Vérifiez** que `OPENAI_API_KEY` existe dans la liste
3. **Vérifiez** que la valeur n'est pas vide (masquée par `***`)

**Si elle n'existe pas** :
- Ajoutez-la (voir `CONFIGURER-OPENAI-API-KEY.md`)
- Attendez 1-2 minutes
- Redéployez la fonction

---

### Étape 3 : Vérifier que la Table ai_conversations Existe

Dans SQL Editor, exécutez :

```sql
-- Vérifier si la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ai_conversations';
```

**Si elle n'existe pas**, exécutez :

```sql
-- Créer la table ai_conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policies pour ai_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.ai_conversations;

CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.ai_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON public.ai_conversations(created_at DESC);
```

---

### Étape 4 : Vérifier la Console du Navigateur

1. **Ouvrez** : Votre application
2. **Ouvrez la console** (F12 → Console)
3. **Posez une question** à l'assistant IA
4. **Regardez les messages d'erreur** dans la console

**Messages à chercher** :
- `Error calling ai-assistant: ...`
- `Erreur 500: ...`
- `Response from ai-assistant: ...`

---

### Étape 5 : Tester l'API OpenAI Directement

Pour vérifier que votre clé OpenAI fonctionne, testez-la directement :

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

**Si ça fonctionne**, vous devriez voir une réponse JSON avec une réponse de l'IA.

**Si ça ne fonctionne pas**, votre clé OpenAI est invalide ou expirée.

---

## 🔧 Solutions par Type d'Erreur

### Erreur : "OPENAI_API_KEY is not set"

**Solution** :
1. Allez dans Settings → Edge Functions → Secrets
2. Ajoutez `OPENAI_API_KEY` avec votre clé OpenAI
3. Attendez 1-2 minutes
4. Redéployez la fonction `ai-assistant`

---

### Erreur : "Table ai_conversations does not exist"

**Solution** :
1. Exécutez le script SQL ci-dessus (Étape 3)
2. Vérifiez que la table est créée
3. Réessayez d'utiliser l'assistant IA

---

### Erreur : "Unauthorized" ou "Token invalide"

**Solution** :
1. Déconnectez-vous de l'application
2. Reconnectez-vous
3. Réessayez d'utiliser l'assistant IA

---

### Erreur : "OpenAI API error" ou "Invalid API key"

**Solution** :
1. Vérifiez que votre clé OpenAI est valide (testez avec curl)
2. Vérifiez que vous avez des crédits sur votre compte OpenAI
3. Vérifiez que la clé n'a pas expiré
4. Créez une nouvelle clé si nécessaire

---

### Erreur : "EarlyDrop" ou "shutdown"

**Solution** :
1. Vérifiez que la fonction est redéployée avec les optimisations
2. Réduisez encore plus les paramètres si nécessaire
3. Testez avec une question très courte

---

### Erreur : Autre erreur inconnue

**Solution** :
1. Copiez le message d'erreur complet des logs
2. Vérifiez la console du navigateur
3. Regardez les détails de l'erreur

---

## 🚀 Solution Complète (Step-by-Step)

### 1. Vérifier les Prérequis

- [ ] `OPENAI_API_KEY` est configuré dans Settings → Edge Functions → Secrets
- [ ] La table `ai_conversations` existe
- [ ] Vous êtes connecté dans l'application
- [ ] Votre clé OpenAI est valide (testée avec curl)

### 2. Redéployer la Fonction

1. **Allez dans** : Supabase Dashboard → Edge Functions → ai-assistant
2. **Ouvrez** : `supabase/functions/ai-assistant/index.ts`
3. **Copiez tout le contenu** (Cmd+A, Cmd+C)
4. **Collez dans l'éditeur Supabase** (Cmd+V)
5. **Cliquez sur "Deploy"** (ou "Redeploy")

### 3. Tester

1. **Allez dans** : Votre application
2. **Allez dans** : Page Assistant IA
3. **Posez une question courte** : "Bonjour"
4. **Vérifiez** que vous recevez une réponse

---

## 📋 Checklist de Vérification

- [ ] `OPENAI_API_KEY` est configuré dans Settings → Edge Functions → Secrets
- [ ] La clé OpenAI est valide (testée avec curl)
- [ ] La table `ai_conversations` existe
- [ ] Les politiques RLS sont configurées pour `ai_conversations`
- [ ] Vous êtes connecté dans l'application
- [ ] La fonction `ai-assistant` est déployée
- [ ] Les logs ne montrent pas d'erreurs récentes
- [ ] L'assistant IA fonctionne (testé)

---

## 🆘 Si le Problème Persiste

### 1. Vérifier les Logs Détaillés

1. **Allez dans** : Edge Functions → ai-assistant → Logs
2. **Regardez les dernières erreurs**
3. **Copiez les messages d'erreur complets**
4. **Partagez-les** pour diagnostic

### 2. Tester avec une Question Très Courte

- Essayez avec : "Bonjour"
- Si ça fonctionne, le problème vient de la longueur de la question ou de la réponse

### 3. Vérifier les Variables d'Environnement

Dans Supabase Dashboard → Edge Functions → ai-assistant → Settings, vérifiez que :
- `SUPABASE_URL` est défini (automatique)
- `SUPABASE_SERVICE_ROLE_KEY` est défini (automatique)
- `OPENAI_API_KEY` est défini (vous devez l'ajouter)

---

## ✅ Résumé

**Les causes les plus courantes** :
1. ❌ `OPENAI_API_KEY` non configuré ou invalide
2. ❌ Table `ai_conversations` n'existe pas
3. ❌ Clé OpenAI invalide ou expirée
4. ❌ Problème d'authentification
5. ❌ Timeout (EarlyDrop)

**La solution la plus courante** :
1. ✅ Configurer `OPENAI_API_KEY` dans Settings → Edge Functions → Secrets
2. ✅ Créer la table `ai_conversations` si elle n'existe pas
3. ✅ Vérifier que la clé OpenAI est valide (test avec curl)
4. ✅ Redéployer la fonction `ai-assistant`
5. ✅ Tester à nouveau

---

**Une fois ces étapes terminées, l'assistant IA devrait fonctionner !** 🚀

