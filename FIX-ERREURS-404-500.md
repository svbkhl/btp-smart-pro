# 🔧 Correction Erreurs 404 et 500

## 🐛 Problèmes Identifiés

### Erreurs 404
- `clients?select=*&user_id=eq...` : Table `clients` non accessible
- `user_settings?select=*&user_id=eq...` : Table `user_settings` non accessible

### Erreur 500
- `generate-quote` : Edge Function retourne une erreur 500

---

## 🔍 Causes Possibles

### Erreurs 404
1. **Tables n'existent pas** : Les tables `clients` et `user_settings` n'ont pas été créées
2. **RLS policies manquantes** : Les Row Level Security policies ne sont pas configurées
3. **RLS bloque l'accès** : Les policies existent mais bloquent l'accès pour cet utilisateur

### Erreur 500
1. **OPENAI_API_KEY manquante** : La clé API OpenAI n'est pas configurée dans Supabase
2. **Tables manquantes** : L'Edge Function essaie d'accéder à des tables qui n'existent pas
3. **Erreur dans le code** : Bug dans l'Edge Function

---

## ✅ Solutions

### 1. Créer/Vérifier les Tables et RLS Policies

**Fichier** : `supabase/VERIFIER-ET-CREER-TABLES.sql`

**Instructions** :
1. Ouvrez **Supabase Dashboard** > **SQL Editor**
2. Copiez **TOUT** le contenu du fichier `VERIFIER-ET-CREER-TABLES.sql`
3. Collez dans l'éditeur SQL
4. Cliquez sur **"Run"**
5. Vérifiez les messages dans les résultats

**Ce que fait le script** :
- ✅ Vérifie si les tables `clients` et `user_settings` existent
- ✅ Les crée si elles n'existent pas
- ✅ Active RLS sur les tables
- ✅ Crée les RLS policies nécessaires
- ✅ Crée les triggers pour `updated_at`
- ✅ Crée les settings pour les utilisateurs existants
- ✅ Affiche un rapport de vérification

### 2. Vérifier la Configuration OpenAI

**Pour l'erreur 500 sur `generate-quote`** :

1. Ouvrez **Supabase Dashboard** > **Project Settings** > **Edge Functions**
2. Vérifiez que `OPENAI_API_KEY` est configurée dans les **Secrets**
3. Si elle n'existe pas :
   - Cliquez sur **"Add Secret"**
   - Nom : `OPENAI_API_KEY`
   - Valeur : Votre clé API OpenAI
   - Cliquez sur **"Save"**

### 3. Amélioration de la Gestion d'Erreurs

**Fichiers modifiés** :
- ✅ `src/hooks/useClients.ts` : Gestion des erreurs 404
- ✅ `src/hooks/useUserSettings.ts` : Gestion des erreurs 404

**Améliorations** :
- ✅ Détection des erreurs 404 (table n'existe pas)
- ✅ Messages d'avertissement dans la console
- ✅ Fallback vers fake data si activé
- ✅ Retour de valeurs par défaut (tableau vide, null) plutôt que d'erreurs

---

## 📋 Checklist de Vérification

### Tables et RLS
- [ ] Exécuter `VERIFIER-ET-CREER-TABLES.sql` dans Supabase
- [ ] Vérifier que les tables `clients` et `user_settings` existent
- [ ] Vérifier que RLS est activé sur les tables
- [ ] Vérifier que les policies RLS existent

### Configuration
- [ ] Vérifier que `OPENAI_API_KEY` est configurée dans Supabase
- [ ] Vérifier que `SUPABASE_URL` est correct
- [ ] Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est configurée

### Test
- [ ] Recharger l'application
- [ ] Vérifier que les erreurs 404 ont disparu
- [ ] Vérifier que la génération de devis fonctionne

---

## 🔍 Diagnostic

### Comment Vérifier si les Tables Existent

1. Ouvrez **Supabase Dashboard** > **Table Editor**
2. Vérifiez si les tables suivantes existent :
   - `clients`
   - `user_settings`

### Comment Vérifier les RLS Policies

1. Ouvrez **Supabase Dashboard** > **Authentication** > **Policies**
2. Sélectionnez la table `clients`
3. Vérifiez que les policies suivantes existent :
   - "Users can view their own clients"
   - "Users can create their own clients"
   - "Users can update their own clients"
   - "Users can delete their own clients"
4. Répétez pour `user_settings`

### Comment Vérifier les Secrets

1. Ouvrez **Supabase Dashboard** > **Project Settings** > **Edge Functions**
2. Vérifiez que les secrets suivants existent :
   - `OPENAI_API_KEY`
   - `SUPABASE_URL` (généralement automatique)
   - `SUPABASE_SERVICE_ROLE_KEY` (généralement automatique)

---

## 🚨 Messages d'Erreur et Solutions

| Erreur | Cause | Solution |
|--------|-------|----------|
| `404` sur `clients` | Table n'existe pas ou RLS bloque | Exécuter `VERIFIER-ET-CREER-TABLES.sql` |
| `404` sur `user_settings` | Table n'existe pas ou RLS bloque | Exécuter `VERIFIER-ET-CREER-TABLES.sql` |
| `500` sur `generate-quote` | OPENAI_API_KEY manquante | Configurer la clé dans Supabase Secrets |
| `500` sur `generate-quote` | Tables manquantes | Exécuter `VERIFIER-ET-CREER-TABLES.sql` |

---

## 📝 Fichiers Créés/Modifiés

### Créés
- ✅ `supabase/VERIFIER-ET-CREER-TABLES.sql` : Script de diagnostic et création

### Modifiés
- ✅ `src/hooks/useClients.ts` : Gestion des erreurs 404
- ✅ `src/hooks/useUserSettings.ts` : Gestion des erreurs 404

---

## ✅ Résultat Attendu

Après avoir exécuté le script SQL :
- ✅ Les tables `clients` et `user_settings` existent
- ✅ Les RLS policies sont configurées
- ✅ Les erreurs 404 disparaissent
- ✅ L'application peut charger les clients et settings
- ✅ La génération de devis fonctionne (si OPENAI_API_KEY est configurée)

---

**Date** : $(date +"%d/%m/%Y")
**Statut** : ✅ **SCRIPTS CRÉÉS ET GESTION D'ERREURS AMÉLIORÉE**

