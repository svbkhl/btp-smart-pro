# 🚀 Guide de Redéploiement de l'Edge Function generate-quote

## 📋 Problème résolu

L'Edge Function `generate-quote` a été améliorée avec une meilleure gestion d'erreurs et validation des paramètres.

## 🔧 Améliorations apportées

1. ✅ Validation des variables d'environnement
2. ✅ Validation des paramètres requis
3. ✅ Gestion d'erreurs améliorée à chaque étape
4. ✅ Timeout pour l'appel OpenAI (28 secondes)
5. ✅ Parsing JSON robuste avec fallback
6. ✅ Validation de la structure de réponse
7. ✅ Sauvegarde DB non-bloquante (continue même si échec)
8. ✅ Messages d'erreur détaillés et clairs
9. ✅ Récupération infos entreprise optionnelle

## 📦 Méthode 1 : Déploiement via Supabase CLI (Recommandé)

### Prérequis
- Supabase CLI installé
- Projet lié à Supabase

### Commandes

```bash
# 1. Se connecter à Supabase (si pas déjà fait)
supabase login

# 2. Lier le projet (si pas déjà fait)
supabase link --project-ref renmjmqlmafqjzldmsgs

# 3. Déployer la fonction
supabase functions deploy generate-quote

# 4. Vérifier que la fonction est déployée
supabase functions list
```

## 📦 Méthode 2 : Déploiement via Dashboard Supabase

### Étapes

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir l'éditeur de fonctions**
   - Aller dans `Edge Functions` dans le menu latéral
   - Cliquer sur `Create a new function` ou modifier `generate-quote`

3. **Créer/Modifier la fonction**
   - Nom : `generate-quote`
   - Copier le contenu de `supabase/functions/generate-quote/index.ts`

4. **Configurer les secrets**
   - Aller dans `Settings` → `Edge Functions` → `Secrets`
   - Vérifier que `OPENAI_API_KEY` est configuré
   - Vérifier que `SUPABASE_URL` est configuré
   - Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est configuré

5. **Déployer**
   - Cliquer sur `Deploy` ou `Save`

## 🔍 Vérification

### 1. Vérifier les logs

```bash
# Via CLI
supabase functions logs generate-quote

# Ou dans le Dashboard
# Edge Functions → generate-quote → Logs
```

### 2. Tester la fonction

Dans le Dashboard Supabase :
1. Aller dans `Edge Functions` → `generate-quote`
2. Cliquer sur `Invoke`
3. Tester avec ce payload :

```json
{
  "clientName": "Test Client",
  "surface": 100,
  "workType": "Rénovation toiture",
  "materials": ["Tuiles", "Isolation"],
  "region": "Paris"
}
```

## 🐛 Dépannage

### Erreur : "OPENAI_API_KEY is not set"
- **Solution** : Vérifier que le secret est bien configuré dans `Settings` → `Edge Functions` → `Secrets`
- Le nom doit être exactement : `OPENAI_API_KEY`

### Erreur : "Unauthorized"
- **Solution** : Vérifier que vous êtes bien connecté dans l'application
- Vérifier que le token JWT est valide

### Erreur : "Invalid request body"
- **Solution** : Vérifier que tous les champs requis sont remplis (clientName, surface, workType, materials)

### Erreur : "Database error"
- **Solution** : Vérifier que la table `ai_quotes` existe
- Vérifier que les RLS policies sont configurées
- La fonction continue même si la sauvegarde échoue (elle retourne quand même le devis)

### Erreur : "Timeout"
- **Solution** : Réduire la quantité de données (moins de matériaux, pas d'images)
- L'IA peut prendre jusqu'à 28 secondes pour répondre

## 📝 Notes importantes

1. **Sauvegarde non-bloquante** : Si la sauvegarde dans la DB échoue, la fonction retourne quand même le devis généré par l'IA.

2. **Infos entreprise optionnelles** : Si les infos entreprise ne sont pas trouvées, la fonction continue sans elles.

3. **Validation des prix** : L'IA valide automatiquement la cohérence des prix manuels.

4. **Timeout** : L'appel OpenAI a un timeout de 28 secondes pour éviter les timeouts de l'Edge Function (30 secondes max).

## ✅ Checklist de déploiement

- [ ] Edge Function déployée
- [ ] Secret `OPENAI_API_KEY` configuré
- [ ] Secret `SUPABASE_URL` configuré (automatique)
- [ ] Secret `SUPABASE_SERVICE_ROLE_KEY` configuré (automatique)
- [ ] Table `ai_quotes` existe
- [ ] RLS policies configurées pour `ai_quotes`
- [ ] Test de la fonction réussi
- [ ] Logs vérifiés (pas d'erreurs)

## 🎯 Après le déploiement

1. Tester la génération de devis dans l'application
2. Vérifier les logs dans le Dashboard
3. Tester avec et sans prix manuel
4. Tester avec différentes régions
5. Vérifier que les devis sont sauvegardés dans `ai_quotes`

