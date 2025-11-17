# ✅ Vérifier que OPENAI_API_KEY est Bien Configuré

## 🎯 Problème

**Erreur** : `OPENAI_API_KEY is not set`

Même après avoir ajouté la clé, la fonction ne la voit pas.

---

## 🔍 Vérification en 5 Étapes

### Étape 1 : Vérifier que la Clé est dans les Secrets

1. **Allez dans** : Supabase Dashboard → Settings → Edge Functions → Secrets
2. **Vérifiez** que vous voyez `OPENAI_API_KEY` dans la liste
3. **Vérifiez** que la valeur est masquée par `***` (c'est normal)

**Si elle n'existe pas** :
- Ajoutez-la (voir ci-dessous)
- **Attendez 2-3 minutes** après l'ajout
- Redéployez la fonction

---

### Étape 2 : Vérifier le Nom Exact du Secret

**⚠️ IMPORTANT** : Le nom doit être EXACTEMENT `OPENAI_API_KEY` (en majuscules)

**Vérifiez** :
- ✅ `OPENAI_API_KEY` (correct)
- ❌ `openai_api_key` (incorrect - minuscules)
- ❌ `OPENAI-API-KEY` (incorrect - tirets)
- ❌ `OpenAI_API_Key` (incorrect - mélange)

**Si le nom est incorrect** :
1. Supprimez l'ancien secret
2. Ajoutez un nouveau secret avec le nom exact : `OPENAI_API_KEY`

---

### Étape 3 : Vérifier la Valeur de la Clé

**La clé OpenAI doit** :
- Commencer par `sk-` (pour les clés API) ou `sk-proj-` (pour les clés de projet)
- Être très longue (plus de 50 caractères)
- Ne pas contenir d'espaces avant ou après

**Exemple de clé valide** :
```
sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Vérifiez** :
1. Copiez la clé depuis https://platform.openai.com/api-keys
2. Collez-la directement (sans espaces)
3. Vérifiez qu'elle commence bien par `sk-`

---

### Étape 4 : Redéployer la Fonction

**⚠️ IMPORTANT** : Après avoir ajouté ou modifié un secret, vous devez redéployer la fonction.

1. **Allez dans** : Edge Functions → ai-assistant
2. **Cliquez sur** : "Redeploy" (ou "Deploy")
3. **Attendez** que le déploiement se termine

**Pourquoi** : Les secrets sont injectés lors du déploiement, pas lors de l'exécution.

---

### Étape 5 : Vérifier dans les Logs

1. **Allez dans** : Edge Functions → ai-assistant → Logs
2. **Testez l'assistant IA** dans votre application
3. **Regardez les nouveaux logs**

**Vous ne devriez plus voir** : `OPENAI_API_KEY is not set`

**Vous devriez voir** : `Processing AI request for user: ...`

---

## 🔧 Solution Complète (Step-by-Step)

### 1. Supprimer l'Ancien Secret (Si Il Existe)

1. **Allez dans** : Settings → Edge Functions → Secrets
2. **Trouvez** `OPENAI_API_KEY` (ou une variante)
3. **Cliquez sur** l'icône de suppression (🗑️)
4. **Confirmez** la suppression

---

### 2. Ajouter le Nouveau Secret

1. **Allez dans** : Settings → Edge Functions → Secrets
2. **Cliquez sur** : "Add new secret"
3. **Remplissez** :
   - **Name** : `OPENAI_API_KEY` (EXACTEMENT en majuscules)
   - **Value** : Votre clé OpenAI (commence par `sk-...`)
4. **Cliquez sur** : "Save"

**⚠️ Vérifiez** :
- Le nom est exactement `OPENAI_API_KEY`
- La valeur commence par `sk-`
- Il n'y a pas d'espaces avant ou après

---

### 3. Attendre la Propagation

**⚠️ IMPORTANT** : Attendez 2-3 minutes après avoir ajouté le secret.

Les secrets peuvent prendre quelques instants à se propager dans l'infrastructure Supabase.

---

### 4. Redéployer la Fonction

1. **Allez dans** : Edge Functions → ai-assistant
2. **Cliquez sur** : "Redeploy" (ou "Deploy")
3. **Attendez** que le déploiement se termine

**Pourquoi** : Les secrets sont injectés lors du déploiement.

---

### 5. Tester

1. **Allez dans** : Votre application
2. **Allez dans** : Page Assistant IA
3. **Posez une question** : "Bonjour"
4. **Vérifiez** que vous recevez une réponse

---

## 🆘 Si Ça Ne Fonctionne Toujours Pas

### Option 1 : Vérifier avec Supabase CLI

Si vous avez Supabase CLI installé :

```bash
# Lister les secrets
npx supabase secrets list

# Vérifier que OPENAI_API_KEY apparaît
```

**Si elle n'apparaît pas** :
```bash
# Ajouter le secret
npx supabase secrets set OPENAI_API_KEY=votre_cle_openai
```

---

### Option 2 : Vérifier les Permissions

1. **Vérifiez** que vous êtes propriétaire ou administrateur du projet
2. **Vérifiez** que vous avez les permissions pour gérer les secrets
3. **Demandez** au propriétaire du projet de vérifier si nécessaire

---

### Option 3 : Créer un Nouveau Secret

Parfois, recréer le secret résout le problème :

1. **Supprimez** l'ancien secret `OPENAI_API_KEY`
2. **Attendez** 1 minute
3. **Ajoutez** un nouveau secret `OPENAI_API_KEY`
4. **Attendez** 2-3 minutes
5. **Redéployez** la fonction
6. **Testez** à nouveau

---

## ✅ Checklist de Vérification

- [ ] Le secret `OPENAI_API_KEY` existe dans Settings → Edge Functions → Secrets
- [ ] Le nom est exactement `OPENAI_API_KEY` (majuscules)
- [ ] La valeur commence par `sk-` (clé valide)
- [ ] Il n'y a pas d'espaces avant ou après la clé
- [ ] Vous avez attendu 2-3 minutes après avoir ajouté le secret
- [ ] La fonction `ai-assistant` a été redéployée après avoir ajouté le secret
- [ ] Les logs ne montrent plus `OPENAI_API_KEY is not set`
- [ ] L'assistant IA fonctionne (testé)

---

## 📋 Résumé

**Le problème** : `OPENAI_API_KEY is not set`

**Les causes possibles** :
1. Le secret n'existe pas dans Settings → Edge Functions → Secrets
2. Le nom du secret est incorrect (doit être exactement `OPENAI_API_KEY`)
3. La clé est invalide (ne commence pas par `sk-`)
4. La fonction n'a pas été redéployée après avoir ajouté le secret
5. Les secrets n'ont pas encore été propagés (attendre 2-3 minutes)

**La solution** :
1. ✅ Vérifier que le secret existe avec le nom exact `OPENAI_API_KEY`
2. ✅ Vérifier que la clé est valide (commence par `sk-`)
3. ✅ Attendre 2-3 minutes après avoir ajouté le secret
4. ✅ Redéployer la fonction `ai-assistant`
5. ✅ Tester à nouveau

---

## 🚀 Action Immédiate

1. **Allez dans** : Settings → Edge Functions → Secrets
2. **Vérifiez** que `OPENAI_API_KEY` existe (nom exact)
3. **Si elle n'existe pas** : Ajoutez-la avec le nom exact `OPENAI_API_KEY`
4. **Attendez** 2-3 minutes
5. **Redéployez** la fonction `ai-assistant`
6. **Testez** à nouveau

**Une fois ces étapes terminées, l'assistant IA devrait fonctionner !** 🎉

