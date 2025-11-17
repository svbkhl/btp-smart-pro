# 🔧 Résoudre l'Erreur 500 - Assistant IA

## 🎯 Problème

**Erreur** : `Erreur 500: Edge Function returned a non-2xx status code`

L'assistant IA ne fonctionne pas et retourne une erreur 500.

---

## 🔍 Diagnostic en 4 Étapes

### Étape 1 : Vérifier que OPENAI_API_KEY est Configuré

1. **Allez dans** : Supabase Dashboard → Settings → Edge Functions → Secrets
2. **Vérifiez** que `OPENAI_API_KEY` existe dans la liste
3. **Si elle n'existe pas** :
   - Cliquez sur "Add new secret"
   - **Name** : `OPENAI_API_KEY`
   - **Value** : Votre clé OpenAI (commence par `sk-...`)
   - Cliquez sur "Save"

**⚠️ Important** : Vous devez avoir une clé OpenAI valide. Si vous n'en avez pas :
1. Allez sur https://platform.openai.com/api-keys
2. Créez une nouvelle clé API
3. Copiez-la et ajoutez-la dans Supabase

---

### Étape 2 : Vérifier les Logs de la Fonction

1. **Allez dans** : Supabase Dashboard → Edge Functions
2. **Cliquez sur** : `ai-assistant`
3. **Allez dans l'onglet** : **Logs**
4. **Regardez les dernières erreurs** (les plus récentes en haut)
5. **Copiez les messages d'erreur**

**Messages d'erreur courants** :
- `OPENAI_API_KEY is not set` → La clé n'est pas configurée
- `Table ai_conversations does not exist` → La table n'existe pas
- `Unauthorized` → Problème d'authentification
- `OpenAI API error` → Problème avec la clé OpenAI ou l'API

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

**Si la table n'existe pas**, elle devrait être créée automatiquement par le script `AUTOMATED-NOTIFICATIONS-COMPLETE.sql`. Vérifiez que ce script a été exécuté.

**Si elle n'existe toujours pas**, exécutez :

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
CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.ai_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

### Étape 4 : Vérifier l'Authentification

1. **Vérifiez** que vous êtes connecté dans l'application
2. **Vérifiez** que votre session est valide
3. **Essayez de vous déconnecter et reconnecter**

---

## 🔧 Solutions par Type d'Erreur

### Erreur : "OPENAI_API_KEY is not set"

**Solution** :
1. Allez dans Settings → Edge Functions → Secrets
2. Ajoutez `OPENAI_API_KEY` avec votre clé OpenAI
3. Redéployez la fonction `ai-assistant` (ou attendez quelques minutes)

---

### Erreur : "Table ai_conversations does not exist"

**Solution** :
1. Exécutez le script SQL ci-dessus pour créer la table
2. Vérifiez que la table existe
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
1. Vérifiez que votre clé OpenAI est valide
2. Vérifiez que vous avez des crédits sur votre compte OpenAI
3. Vérifiez que la clé n'a pas expiré
4. Créez une nouvelle clé si nécessaire

---

## 🚀 Solution Complète (Step-by-Step)

### 1. Configurer OPENAI_API_KEY

1. **Allez dans** : Settings → Edge Functions → Secrets
2. **Ajoutez** :
   - **Name** : `OPENAI_API_KEY`
   - **Value** : Votre clé OpenAI (commence par `sk-...`)
3. **Cliquez sur "Save"**

### 2. Vérifier/Créer la Table ai_conversations

1. **Allez dans** : SQL Editor
2. **Exécutez** le script SQL ci-dessus (Étape 3)
3. **Vérifiez** que la table est créée

### 3. Redéployer la Fonction (Optionnel)

1. **Allez dans** : Edge Functions
2. **Cliquez sur** : `ai-assistant`
3. **Cliquez sur** : "Redeploy" (ou "Deploy" si elle n'est pas déployée)

### 4. Tester l'Assistant IA

1. **Allez dans** : Votre application
2. **Allez dans** : Page IA ou Assistant IA
3. **Posez une question** : "Bonjour, comment ça marche ?"
4. **Vérifiez** que vous recevez une réponse

---

## 🔍 Vérification Finale

### Test dans la Console du Navigateur

1. **Ouvrez** : La console du navigateur (F12)
2. **Allez dans** : L'onglet Console
3. **Posez une question** à l'assistant IA
4. **Regardez** les messages dans la console

**Messages attendus** :
- `Calling ai-assistant with message: ...`
- `Received response: ...`

**Messages d'erreur** :
- `Error calling ai-assistant: ...`
- `Erreur 500: ...`

---

## 📋 Checklist de Vérification

- [ ] `OPENAI_API_KEY` est configuré dans Settings → Edge Functions → Secrets
- [ ] La clé OpenAI est valide (commence par `sk-...`)
- [ ] La table `ai_conversations` existe
- [ ] Les politiques RLS sont configurées pour `ai_conversations`
- [ ] Vous êtes connecté dans l'application
- [ ] La fonction `ai-assistant` est déployée
- [ ] Les logs ne montrent pas d'erreurs récentes

---

## 🆘 Si le Problème Persiste

### 1. Vérifier les Logs Détaillés

1. **Allez dans** : Supabase Dashboard → Edge Functions → ai-assistant → Logs
2. **Regardez** les dernières erreurs
3. **Copiez** les messages d'erreur complets

### 2. Tester l'API OpenAI Directement

Pour vérifier que votre clé OpenAI fonctionne :

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY"
```

**Si ça fonctionne**, vous devriez voir une liste de modèles.

### 3. Vérifier les Variables d'Environnement

Dans Supabase Dashboard → Edge Functions → ai-assistant → Settings, vérifiez que :
- `SUPABASE_URL` est défini (automatique)
- `SUPABASE_SERVICE_ROLE_KEY` est défini (automatique)
- `OPENAI_API_KEY` est défini (vous devez l'ajouter)

---

## ✅ Résumé

**Les causes les plus courantes** :
1. ❌ `OPENAI_API_KEY` non configuré
2. ❌ Table `ai_conversations` n'existe pas
3. ❌ Clé OpenAI invalide ou expirée
4. ❌ Problème d'authentification

**La solution la plus courante** :
1. ✅ Configurer `OPENAI_API_KEY` dans Settings → Edge Functions → Secrets
2. ✅ Créer la table `ai_conversations` si elle n'existe pas
3. ✅ Redéployer la fonction `ai-assistant`
4. ✅ Tester à nouveau

---

**Une fois ces étapes terminées, l'assistant IA devrait fonctionner !** 🚀

