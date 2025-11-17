# 🔍 Diagnostic - Erreur "Edge Function returned a non-2xx status code"

## ✅ Améliorations Appliquées

1. **Gestion d'erreur améliorée** dans `aiService.ts` :
   - Extraction des messages d'erreur depuis plusieurs sources
   - Logs détaillés pour le débogage
   - Messages d'erreur plus clairs

2. **Fonction Edge redéployée** (version 18)

## 🔍 Diagnostic Étape par Étape

### Étape 1 : Ouvrir la Console du Navigateur

1. Ouvrez http://localhost:8080
2. Appuyez sur **F12** (ou Cmd+Option+I sur Mac)
3. Allez dans l'onglet **Console**
4. **Effacez la console** (bouton Clear)

### Étape 2 : Tester l'Assistant IA

1. Connectez-vous à l'application
2. Allez dans **IA** → **Assistant**
3. Tapez "Bonjour" et envoyez
4. **Regardez attentivement la console**

### Étape 3 : Analyser les Logs

Dans la console, vous devriez voir des logs comme :

```
Sending message to AI assistant: Bonjour
Calling ai-assistant with message: Bonjour...
Response from ai-assistant: { data: ..., error: ... }
```

**Copiez tous les messages d'erreur** que vous voyez dans la console.

## 🐛 Causes Possibles et Solutions

### Erreur 401 : Authentification

**Symptômes** :
- Message : "Authentification requise" ou "Token invalide"
- Code : 401

**Solutions** :
1. Reconnectez-vous à l'application
2. Vérifiez que votre session est valide
3. Rafraîchissez la page et reconnectez-vous

### Erreur 400 : Requête Invalide

**Symptômes** :
- Message : "Message is required" ou "Invalid JSON"
- Code : 400

**Solutions** :
1. Vérifiez que vous envoyez bien un message
2. Vérifiez que le message n'est pas vide
3. Redémarrez le serveur de développement

### Erreur 500 : Erreur Serveur

**Symptômes** :
- Message : "OpenAI API key is not configured" ou "Table does not exist"
- Code : 500

**Solutions selon le message** :

#### "OpenAI API key is not configured"
```bash
# Vérifier que la clé est configurée
npx supabase secrets list

# Si elle n'est pas là, l'ajouter
npx supabase secrets set OPENAI_API_KEY=votre_cle_openai
```

#### "Table does not exist: ai_conversations"
1. Allez dans Supabase Dashboard → SQL Editor
2. Exécutez le script `supabase/VERIFY-AI-CONVERSATIONS.sql`
3. Vérifiez que la table est créée

#### "Internal server error"
1. Vérifiez les logs dans Supabase Dashboard → Edge Functions → ai-assistant → Logs
2. Regardez les erreurs récentes
3. Copiez les messages d'erreur

## 📊 Vérifier les Logs de la Fonction Edge

1. Allez dans **Supabase Dashboard** :
   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions

2. Cliquez sur **ai-assistant**

3. Allez dans l'onglet **Logs**

4. Regardez les **dernières erreurs** (les plus récentes en haut)

5. **Copiez les messages d'erreur** que vous voyez

## 🔧 Vérifications Rapides

### 1. Vérifier la Table ai_conversations

Dans Supabase Dashboard → SQL Editor :

```sql
-- Vérifier si la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ai_conversations';
```

**Si elle n'existe pas**, exécutez `supabase/VERIFY-AI-CONVERSATIONS.sql`

### 2. Vérifier les Secrets

```bash
npx supabase secrets list
```

Vous devriez voir :
- `OPENAI_API_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

### 3. Vérifier le Fichier .env

Assurez-vous que votre `.env` contient les bonnes valeurs (voir `ENV-CORRECT-VALUES.txt`) :
- `VITE_SUPABASE_URL=https://renmjmqlmafqjzldmsgs.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=...` (la bonne clé)
- `VITE_SUPABASE_PROJECT_ID=renmjmqlmafqjzldmsgs`

**Important** : Redémarrez le serveur après avoir modifié le `.env` :
```bash
# Arrêtez le serveur (Ctrl+C)
npm run dev
```

## 📝 Informations à Me Fournir

Pour que je puisse vous aider, j'ai besoin de :

1. **Les messages d'erreur de la console du navigateur** (F12 → Console)
2. **Les logs de la fonction Edge** (Supabase Dashboard → Edge Functions → ai-assistant → Logs)
3. **Le code d'erreur HTTP** (401, 400, 500, etc.)
4. **Le message d'erreur exact** affiché dans l'application

## ✅ Test Rapide

1. Ouvrez la console (F12)
2. Testez l'assistant IA
3. Copiez tous les messages d'erreur
4. Partagez-les avec moi

Les nouveaux logs détaillés devraient nous donner plus d'informations sur la cause exacte du problème.

