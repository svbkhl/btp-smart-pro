# 🧪 Guide de Test - Assistant IA

## ✅ Vérifications Préalables

### 1. Vérifier que vous êtes connecté
- Allez sur http://localhost:8080
- Connectez-vous ou créez un compte
- Vérifiez que vous êtes bien authentifié

### 2. Vérifier la table `ai_conversations`

Dans Supabase Dashboard → SQL Editor, exécutez :

```sql
-- Vérifier si la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ai_conversations';
```

**Si la table n'existe pas**, exécutez le script `supabase/VERIFY-AI-CONVERSATIONS.sql`

### 3. Vérifier les secrets Supabase

```bash
npx supabase secrets list
```

Vous devriez voir `OPENAI_API_KEY` dans la liste.

### 4. Vérifier le fichier `.env`

Assurez-vous que votre `.env` contient les bonnes valeurs (voir `ENV-CORRECT-VALUES.txt`) :
- `VITE_SUPABASE_URL=https://renmjmqlmafqjzldmsgs.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=...` (la bonne clé)
- `VITE_SUPABASE_PROJECT_ID=renmjmqlmafqjzldmsgs`

## 🧪 Test de l'Assistant IA

### Étape 1 : Ouvrir la console du navigateur
1. Ouvrez http://localhost:8080
2. Appuyez sur **F12** (ou Cmd+Option+I sur Mac)
3. Allez dans l'onglet **Console**

### Étape 2 : Tester l'assistant
1. Connectez-vous à l'application
2. Allez dans **IA** → **Assistant**
3. Tapez un message simple : "Bonjour"
4. Cliquez sur Envoyer

### Étape 3 : Observer les logs
Dans la console, vous devriez voir :
- `Sending message to AI assistant: Bonjour`
- `Calling ai-assistant with message: Bonjour...`
- `Response from ai-assistant: {...}`
- `Received response: {...}`

## 🔍 Diagnostic des Erreurs

### Erreur : "Vous devez être connecté"
- **Solution** : Reconnectez-vous à l'application

### Erreur : "Authentification requise"
- **Solution** : Vérifiez que votre session est valide, reconnectez-vous

### Erreur : "OpenAI API key is not configured"
- **Solution** : Vérifiez que `OPENAI_API_KEY` est dans les secrets Supabase

### Erreur : "Table does not exist: ai_conversations"
- **Solution** : Exécutez le script `supabase/VERIFY-AI-CONVERSATIONS.sql`

### Erreur : "Edge Function returned a non-2xx status code"
- **Cause** : Erreur dans la fonction Edge
- **Solution** : 
  1. Vérifiez les logs dans Supabase Dashboard → Edge Functions → ai-assistant → Logs
  2. Vérifiez la console du navigateur pour plus de détails

### Erreur : "Format de réponse invalide"
- **Cause** : La fonction Edge retourne un format incorrect
- **Solution** : Vérifiez les logs de la fonction Edge

## 📊 Vérifier les Logs de la Fonction Edge

1. Allez dans Supabase Dashboard
2. Edge Functions → `ai-assistant`
3. Cliquez sur l'onglet **Logs**
4. Regardez les erreurs récentes

## 🐛 Si ça ne fonctionne toujours pas

1. **Vérifiez la console du navigateur** (F12) pour voir les erreurs détaillées
2. **Vérifiez les logs de la fonction Edge** dans Supabase Dashboard
3. **Vérifiez que le `.env` est correct** et que le serveur a été redémarré
4. **Vérifiez que vous êtes connecté** et que votre session est valide
5. **Vérifiez que la table `ai_conversations` existe**

## ✅ Test Réussi

Si tout fonctionne, vous devriez voir :
- Votre message apparaître dans la conversation
- Un indicateur de chargement
- La réponse de l'IA apparaître quelques secondes après

