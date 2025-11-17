# 🔧 Guide de Débogage - Assistant IA

## ✅ Corrections Appliquées

### 1. Service Frontend (`src/services/aiService.ts`)
- ✅ Passage explicite du token d'authentification
- ✅ Vérification de la session avant l'appel
- ✅ Meilleure gestion des erreurs

### 2. Fonction Edge (`supabase/functions/ai-assistant/index.ts`)
- ✅ Gestion améliorée de l'authentification
- ✅ Messages d'erreur en français
- ✅ Logs détaillés pour le débogage
- ✅ Support de plusieurs formats de header Authorization

## 🔍 Vérifications à Faire

### 1. Vérifier que vous êtes connecté
- Assurez-vous d'être connecté à l'application
- Si vous n'êtes pas connecté, allez sur `/auth` et connectez-vous

### 2. Vérifier la table `ai_conversations`

Exécutez cette requête SQL dans Supabase Dashboard → SQL Editor :

```sql
-- Vérifier si la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ai_conversations';

-- Si la table n'existe pas, créez-la :
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Users can view their own conversations" 
ON public.ai_conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.ai_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

### 3. Vérifier les secrets Supabase

Dans le terminal, exécutez :

```bash
npx supabase secrets list
```

Vous devriez voir :
- `OPENAI_API_KEY` (requis)
- `SUPABASE_URL` (automatique)
- `SUPABASE_SERVICE_ROLE_KEY` (automatique)

Si `OPENAI_API_KEY` n'est pas là, ajoutez-la :

```bash
npx supabase secrets set OPENAI_API_KEY=votre_cle_openai_ici
```

### 4. Tester la fonction directement

Dans le Dashboard Supabase :
1. Allez dans **Edge Functions** → `ai-assistant`
2. Cliquez sur **Invoke**
3. Utilisez ce JSON (remplacez `YOUR_ACCESS_TOKEN` par un vrai token) :

```json
{
  "message": "Bonjour, comment calculer un devis pour une rénovation de 50m² ?"
}
```

## 🐛 Messages d'Erreur Courants

### "Authentification requise. Veuillez vous reconnecter."
- **Cause** : Vous n'êtes pas connecté ou le token a expiré
- **Solution** : Reconnectez-vous à l'application

### "OpenAI API key is not configured"
- **Cause** : La clé OpenAI n'est pas configurée dans Supabase
- **Solution** : Ajoutez la clé avec `npx supabase secrets set OPENAI_API_KEY=...`

### "Table does not exist: ai_conversations"
- **Cause** : La table n'existe pas dans la base de données
- **Solution** : Exécutez le SQL de création de table ci-dessus

### "Edge Function returned a non-2xx status code"
- **Cause** : Erreur dans la fonction Edge
- **Solution** : 
  1. Vérifiez les logs dans Supabase Dashboard → Edge Functions → Logs
  2. Vérifiez que tous les secrets sont configurés
  3. Vérifiez que la table `ai_conversations` existe

## 📊 Vérifier les Logs

Pour voir les logs de la fonction :

1. Allez dans Supabase Dashboard
2. Edge Functions → `ai-assistant`
3. Cliquez sur l'onglet **Logs**
4. Regardez les erreurs récentes

## ✅ Test Final

1. Connectez-vous à l'application
2. Allez dans **IA** → **Assistant**
3. Posez une question simple : "Bonjour, comment ça va ?"
4. Si ça fonctionne, essayez une question BTP : "Comment calculer un devis pour une rénovation ?"

## 🆘 Si ça ne fonctionne toujours pas

1. Vérifiez la console du navigateur (F12) pour voir les erreurs
2. Vérifiez les logs de la fonction Edge dans Supabase
3. Vérifiez que vous êtes bien connecté
4. Vérifiez que la clé OpenAI est valide et a des crédits

