# 🔑 Configurer OPENAI_API_KEY - Résolution Rapide

## 🎯 Problème

**Erreur** : `OPENAI_API_KEY is not set`

La clé API OpenAI n'est pas configurée dans Supabase Edge Functions.

---

## ✅ Solution en 3 Étapes

### Étape 1 : Obtenir une Clé OpenAI (Si vous n'en avez pas)

1. **Allez sur** : https://platform.openai.com/api-keys
2. **Connectez-vous** avec votre compte OpenAI (ou créez-en un)
3. **Cliquez sur** : "Create new secret key"
4. **Nommez-la** : `Edifice Opus One` (ou n'importe quel nom)
5. **Copiez la clé** (elle commence par `sk-...`)
   - ⚠️ **IMPORTANT** : Vous ne pourrez plus la voir après, sauvegardez-la !

---

### Étape 2 : Ajouter la Clé dans Supabase

1. **Allez dans** : Supabase Dashboard
   - URL : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Cliquez sur** : **Settings** (⚙️ dans le menu de gauche)

3. **Cliquez sur** : **Edge Functions** (dans le sous-menu)

4. **Cliquez sur** : **Secrets** (ou "Environment Variables")

5. **Cliquez sur** : **"Add new secret"** (ou "Add secret")

6. **Remplissez** :
   - **Name** : `OPENAI_API_KEY`
   - **Value** : Votre clé OpenAI (commence par `sk-...`)
   - Exemple : `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

7. **Cliquez sur** : **"Save"** (ou "Add")

**✅ Résultat** : Le secret est maintenant configuré et apparaît dans la liste (avec la valeur masquée `***`)

---

### Étape 3 : Vérifier que la Clé est Configurée

1. **Vérifiez** que vous voyez dans la liste des secrets :
   - **Name** : `OPENAI_API_KEY`
   - **Value** : `***` (masqué pour la sécurité)

2. **Si vous ne le voyez pas**, répétez l'étape 2

---

## 🧪 Tester l'Assistant IA

1. **Allez dans** : Votre application
2. **Allez dans** : Page IA ou Assistant IA
3. **Posez une question** : "Bonjour, comment ça marche ?"
4. **Vérifiez** que vous recevez une réponse

**✅ Si ça fonctionne**, le problème est résolu !

---

## 🔍 Vérification dans les Logs

1. **Allez dans** : Supabase Dashboard → Edge Functions → ai-assistant → Logs
2. **Regardez les dernières entrées**
3. **Vous ne devriez plus voir** : `OPENAI_API_KEY is not set`
4. **Vous devriez voir** : `Processing AI request for user: ...`

---

## 🆘 Problèmes Courants

### La clé n'apparaît pas dans les secrets

**Solution** :
- Vérifiez que vous êtes dans Settings → Edge Functions → Secrets
- Vérifiez que vous avez les permissions d'administration sur le projet
- Essayez de rafraîchir la page

### L'erreur persiste après avoir ajouté la clé

**Solution** :
- Attendez 1-2 minutes (les secrets peuvent prendre quelques instants à se propager)
- Redéployez la fonction `ai-assistant` :
  1. Allez dans Edge Functions → ai-assistant
  2. Cliquez sur "Redeploy" (ou "Deploy")
- Réessayez d'utiliser l'assistant IA

### "Invalid API key" ou "Incorrect API key provided"

**Solution** :
- Vérifiez que vous avez copié la clé complète (elle est longue, commence par `sk-...`)
- Vérifiez que vous n'avez pas d'espaces avant ou après la clé
- Vérifiez que votre compte OpenAI a des crédits disponibles
- Créez une nouvelle clé si nécessaire

---

## 📋 Checklist de Vérification

- [ ] Vous avez une clé OpenAI valide (commence par `sk-...`)
- [ ] `OPENAI_API_KEY` est configuré dans Settings → Edge Functions → Secrets
- [ ] La clé est visible dans la liste des secrets (avec valeur masquée)
- [ ] Vous avez attendu 1-2 minutes après avoir ajouté la clé
- [ ] La fonction `ai-assistant` est déployée
- [ ] L'assistant IA fonctionne (testé)

---

## ✅ Résumé

**Le problème** : `OPENAI_API_KEY is not set`

**La solution** :
1. Obtenir une clé OpenAI sur https://platform.openai.com/api-keys
2. Ajouter la clé dans Settings → Edge Functions → Secrets
3. Tester l'assistant IA

**C'est tout !** 🚀

---

## 📚 Ressources

- **Obtenir une clé OpenAI** : https://platform.openai.com/api-keys
- **Dashboard Supabase** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
- **Guide complet** : `RÉSOUDRE-ERREUR-500-ASSISTANT-IA.md`

---

## 💡 Astuce

Si vous n'avez pas de compte OpenAI ou si vous voulez tester sans coût, vous pouvez :
1. Créer un compte OpenAI (gratuit avec crédits de départ)
2. Utiliser la clé API pour tester
3. Les premières requêtes sont généralement gratuites ou à faible coût

**Une fois la clé configurée, l'assistant IA devrait fonctionner immédiatement !** 🎉

