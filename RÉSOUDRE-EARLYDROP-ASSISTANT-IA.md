# 🔧 Résoudre l'Erreur "EarlyDrop" - Assistant IA

## 🎯 Problème

**Erreur** : `shutdown` avec `reason: "EarlyDrop"`

L'Edge Function s'arrête prématurément, souvent à cause d'un timeout ou d'une réponse trop longue.

---

## 🔍 Causes Possibles

### 1. Timeout de la Fonction Edge
- Les Edge Functions Supabase ont un timeout par défaut d'environ 30 secondes
- Si l'appel à OpenAI prend trop de temps, la fonction est arrêtée

### 2. Réponse OpenAI Trop Longue
- Si `max_tokens` est trop élevé, la réponse peut prendre trop de temps
- L'historique de conversation peut être trop long

### 3. Erreur Non Gérée
- Une erreur peut faire planter la fonction avant qu'elle ne renvoie une réponse

---

## ✅ Solutions Appliquées

### 1. Timeout Explicite pour OpenAI API
- Ajout d'un timeout de 25 secondes pour l'appel à OpenAI
- Si l'appel prend trop de temps, la fonction retourne une erreur explicite

### 2. Réduction de max_tokens
- Réduction de `max_tokens` de 1000 à 800 pour accélérer la réponse
- Réduction de `temperature` de 0.8 à 0.7 pour des réponses plus cohérentes

### 3. Limitation de l'Historique
- Réduction de l'historique de 5 à 3 conversations (6 messages au lieu de 10)
- Limitation de la longueur des messages dans l'historique
- Timeout de 2 secondes pour la récupération de l'historique

### 4. Optimisation du System Prompt
- Réduction de la longueur du system prompt
- Messages plus concis

### 5. Sauvegarde Non-Bloquante
- La sauvegarde de la conversation est maintenant "fire-and-forget"
- La réponse est renvoyée immédiatement, sans attendre la sauvegarde

---

## 🚀 Actions à Faire

### Étape 1 : Redéployer la Fonction

1. **Allez dans** : Supabase Dashboard → Edge Functions
2. **Cliquez sur** : `ai-assistant`
3. **Ouvrez** : `supabase/functions/ai-assistant/index.ts`
4. **Copiez tout le contenu** (Cmd+A, Cmd+C)
5. **Collez dans l'éditeur Supabase** (Cmd+V)
6. **Cliquez sur "Deploy"** (ou "Redeploy")

---

### Étape 2 : Tester l'Assistant IA

1. **Allez dans** : Votre application
2. **Allez dans** : Page Assistant IA
3. **Posez une question courte** : "Bonjour, comment calculer un devis ?"
4. **Vérifiez** que vous recevez une réponse rapidement

---

## 🔍 Vérification

### Dans les Logs

1. **Allez dans** : Supabase Dashboard → Edge Functions → ai-assistant → Logs
2. **Vérifiez** que vous ne voyez plus `EarlyDrop`
3. **Vérifiez** que vous voyez : `Received AI response (... characters)`

---

## 🆘 Si le Problème Persiste

### 1. Vérifier les Logs Détaillés

1. **Allez dans** : Edge Functions → ai-assistant → Logs
2. **Regardez les dernières erreurs**
3. **Cherchez** des messages comme :
   - `Timeout after 25 seconds`
   - `OpenAI API request timed out`
   - Autres erreurs

### 2. Réduire Encore Plus les Paramètres

Si le problème persiste, vous pouvez réduire encore plus les paramètres dans `supabase/functions/ai-assistant/index.ts` :

```typescript
max_tokens: 500, // Au lieu de 800
.limit(2), // Au lieu de 3 pour l'historique
```

### 3. Tester avec une Question Plus Courte

- Essayez avec une question très courte : "Bonjour"
- Si ça fonctionne, le problème vient de la longueur de la question ou de la réponse

---

## 📋 Checklist de Vérification

- [ ] La fonction `ai-assistant` est redéployée avec les optimisations
- [ ] Les logs ne montrent plus `EarlyDrop`
- [ ] L'assistant IA répond rapidement (moins de 10 secondes)
- [ ] Les réponses sont complètes et cohérentes

---

## ✅ Résumé des Optimisations

| Paramètre | Avant | Après | Raison |
|-----------|-------|-------|--------|
| `max_tokens` | 1000 | 800 | Réponses plus rapides |
| `temperature` | 0.8 | 0.7 | Réponses plus cohérentes |
| Historique | 5 conversations | 3 conversations | Moins de contexte à traiter |
| Timeout OpenAI | Aucun | 25 secondes | Évite les timeouts |
| Sauvegarde | Bloquante | Non-bloquante | Réponse immédiate |
| System prompt | Long | Court | Moins de tokens |

---

## 🎯 Résultat Attendu

Après ces optimisations :
- ✅ L'assistant IA répond plus rapidement
- ✅ Pas de timeout ou d'EarlyDrop
- ✅ Les réponses sont toujours de bonne qualité
- ✅ La fonction est plus stable

---

**Une fois la fonction redéployée, l'assistant IA devrait fonctionner sans problème de timeout !** 🚀

