# 🚨 RÉSOUDRE LES ERREURS 404 ET 500 - GUIDE RAPIDE

## ⚠️ ERREURS ACTUELLES

Vous avez ces erreurs :
- ❌ `404` sur `clients` (table n'existe pas)
- ❌ `404` sur `user_settings` (table n'existe pas)
- ❌ `500` sur `generate-quote` (Edge Function en erreur)

---

## ✅ SOLUTION RAPIDE (5 minutes)

### ÉTAPE 1 : Créer les Tables dans Supabase

1. **Ouvrez** : https://supabase.com/dashboard
2. **Sélectionnez** votre projet
3. **Allez dans** : **SQL Editor** (menu de gauche)
4. **Cliquez sur** : **"New query"**
5. **Copiez-collez** le contenu du fichier `supabase/VERIFIER-ET-CREER-TABLES.sql`
6. **Cliquez sur** : **"Run"** (ou Ctrl+Enter)
7. **Vérifiez** que vous voyez des messages `✅` dans les résultats

### ÉTAPE 2 : Vérifier que les Tables Existent

1. **Allez dans** : **Table Editor** (menu de gauche)
2. **Vérifiez** que vous voyez :
   - ✅ `clients`
   - ✅ `user_settings`

Si vous ne les voyez pas, **re-exécutez** le script SQL de l'étape 1.

### ÉTAPE 3 : Configurer la Clé OpenAI (pour l'erreur 500)

1. **Allez dans** : **Project Settings** > **Edge Functions**
2. **Scrollez** jusqu'à **"Secrets"**
3. **Vérifiez** si `OPENAI_API_KEY` existe
4. **Si elle n'existe pas** :
   - Cliquez sur **"Add Secret"**
   - Nom : `OPENAI_API_KEY`
   - Valeur : Votre clé API OpenAI (commence par `sk-...`)
   - Cliquez sur **"Save"**

### ÉTAPE 4 : Recharger l'Application

1. **Rechargez** la page de l'application (F5 ou Cmd+R)
2. **Vérifiez** que les erreurs 404 ont disparu dans la console
3. **Testez** la génération d'un devis

---

## 🔍 VÉRIFICATION

### Comment Savoir si ça Fonctionne

1. **Ouvrez la console** (F12)
2. **Vérifiez** qu'il n'y a plus d'erreurs 404 sur `clients` et `user_settings`
3. **Testez** la génération d'un devis :
   - Allez sur `/ai` ou `/dashboard` > Section IA
   - Remplissez le formulaire
   - Cliquez sur "Générer le devis"
   - Si ça fonctionne, vous verrez le devis généré

---

## 🆘 SI ÇA NE FONCTIONNE TOUJOURS PAS

### Problème : Les Tables N'Apparaissent Pas

**Solution** :
1. Vérifiez que vous êtes dans le **bon projet** Supabase
2. Vérifiez que vous avez les **droits administrateur**
3. Essayez de créer les tables manuellement :

```sql
-- Créer la table clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'actif',
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Créer les policies
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON public.clients FOR DELETE
USING (auth.uid() = user_id);
```

Puis faites la même chose pour `user_settings` (voir le fichier `VERIFIER-ET-CREER-TABLES.sql`).

### Problème : Erreur 500 Persiste

**Causes possibles** :
1. **OPENAI_API_KEY non configurée** → Voir Étape 3 ci-dessus
2. **Clé API invalide** → Vérifiez que la clé est correcte
3. **Quota OpenAI dépassé** → Vérifiez votre compte OpenAI

**Solution** :
1. Vérifiez les **logs** de l'Edge Function dans Supabase :
   - Allez dans **Edge Functions** > **generate-quote** > **Logs**
   - Regardez les erreurs récentes
2. Vérifiez que `OPENAI_API_KEY` est bien configurée (voir Étape 3)

---

## 📞 BESOIN D'AIDE ?

Si vous avez toujours des problèmes :
1. **Vérifiez** que vous avez exécuté le script SQL
2. **Vérifiez** que les tables existent dans Table Editor
3. **Vérifiez** que `OPENAI_API_KEY` est configurée
4. **Regardez** les logs dans Supabase Edge Functions

---

**Fichier à utiliser** : `supabase/VERIFIER-ET-CREER-TABLES.sql`

