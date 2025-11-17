# 🔧 Résolution Erreur 500 - Assistant IA

## ✅ Améliorations Appliquées

1. **Gestion d'erreur améliorée** pour la table `ai_conversations` :
   - La fonction continue même si la table n'existe pas
   - L'historique est optionnel
   - La sauvegarde de conversation est non-bloquante

2. **Gestion d'erreur améliorée** pour OpenAI API :
   - Meilleure capture des erreurs réseau
   - Messages d'erreur plus détaillés
   - Logs complets pour le débogage

3. **Fonction redéployée** (version 19)

## 🔍 Identifier la Cause Exacte

### Méthode 1 : Vérifier les Logs de la Fonction Edge

1. Allez dans **Supabase Dashboard** :
   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions

2. Cliquez sur **ai-assistant**

3. Allez dans l'onglet **Logs**

4. Regardez les **dernières erreurs** (les plus récentes en haut)

5. **Copiez le message d'erreur complet**

### Méthode 2 : Vérifier la Console du Navigateur

1. Ouvrez http://localhost:8080
2. Appuyez sur **F12** (Console)
3. Testez l'assistant IA
4. **Copiez tous les messages d'erreur**

## 🐛 Causes Possibles de l'Erreur 500

### 1. Table `ai_conversations` n'existe pas

**Symptôme** : Erreur dans les logs mentionnant "does not exist" ou "42P01"

**Solution** :
1. Allez dans Supabase Dashboard → SQL Editor
2. Exécutez le script `supabase/VERIFY-AI-CONVERSATIONS.sql`
3. Ou exécutez directement :

```sql
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" 
ON public.ai_conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.ai_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

### 2. Clé OpenAI invalide ou expirée

**Symptôme** : Erreur "OpenAI API error" ou "invalid_api_key"

**Solution** :
```bash
# Vérifier la clé
npx supabase secrets list | grep OPENAI

# Mettre à jour la clé
npx supabase secrets set OPENAI_API_KEY=votre_nouvelle_cle
```

### 3. Problème de connexion à OpenAI

**Symptôme** : Erreur "Network error" ou "Erreur de connexion à OpenAI"

**Solution** :
- Vérifiez votre connexion internet
- Vérifiez que la clé OpenAI a des crédits
- Attendez quelques minutes et réessayez

### 4. Erreur dans le code de la fonction

**Symptôme** : Erreur "Internal server error" avec stack trace

**Solution** :
- Vérifiez les logs complets dans Supabase Dashboard
- Partagez les logs avec moi pour diagnostic

## 📋 Checklist de Vérification

- [ ] La table `ai_conversations` existe (voir ci-dessus)
- [ ] La clé `OPENAI_API_KEY` est configurée dans Supabase
- [ ] La clé OpenAI est valide et a des crédits
- [ ] Le fichier `.env` contient les bonnes valeurs
- [ ] Le serveur de développement a été redémarré après modification du `.env`
- [ ] Vous êtes bien connecté à l'application

## 🧪 Test Après Correction

1. **Ouvrez la console** (F12)
2. **Testez l'assistant IA** avec "Bonjour"
3. **Regardez les logs** dans la console
4. **Vérifiez les logs** dans Supabase Dashboard

## 📊 Informations à Me Fournir

Pour que je puisse vous aider efficacement, j'ai besoin de :

1. **Les logs de la fonction Edge** (Supabase Dashboard → Edge Functions → ai-assistant → Logs)
2. **Les messages d'erreur de la console** (F12 → Console)
3. **Le message d'erreur exact** affiché dans l'application
4. **Le résultat de cette requête SQL** :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ai_conversations';
```

## ✅ Prochaines Étapes

1. **Vérifiez les logs** dans Supabase Dashboard
2. **Créez la table** si elle n'existe pas
3. **Testez à nouveau** l'assistant IA
4. **Partagez les logs** si l'erreur persiste

La fonction devrait maintenant fonctionner même si la table n'existe pas (elle continuera sans historique et sans sauvegarder les conversations).

