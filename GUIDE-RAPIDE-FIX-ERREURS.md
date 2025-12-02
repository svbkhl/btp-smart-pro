# 🚨 GUIDE RAPIDE - CORRIGER LES ERREURS 404 ET 500

## ⚠️ ERREURS ACTUELLES

Vous voyez ces erreurs dans la console :
- ❌ `404` sur `clients` et `user_settings` (tables n'existent pas)
- ❌ `500` sur `generate-quote` (Edge Function en erreur)

---

## ✅ SOLUTION EN 3 ÉTAPES (5 minutes)

### ÉTAPE 1 : Créer les Tables (2 minutes)

1. **Ouvrez** : https://supabase.com/dashboard
2. **Sélectionnez** votre projet
3. **Cliquez sur** : **"SQL Editor"** (dans le menu de gauche)
4. **Cliquez sur** : **"New query"** (bouton en haut)
5. **Ouvrez le fichier** : `supabase/VERIFIER-ET-CREER-TABLES.sql` dans votre éditeur
6. **Copiez TOUT** le contenu (Cmd+A puis Cmd+C)
7. **Collez** dans l'éditeur SQL de Supabase (Cmd+V)
8. **Cliquez sur** : **"Run"** (ou appuyez sur Ctrl+Enter / Cmd+Enter)
9. **Vérifiez** que vous voyez des messages `✅` dans les résultats

**Résultat attendu** : Vous devriez voir des messages comme :
```
✅ Table clients créée
✅ Table user_settings créée
✅ Policies RLS pour clients créées
✅ Policies RLS pour user_settings créées
```

### ÉTAPE 2 : Vérifier que les Tables Existent (1 minute)

1. **Cliquez sur** : **"Table Editor"** (dans le menu de gauche)
2. **Vérifiez** que vous voyez dans la liste :
   - ✅ `clients`
   - ✅ `user_settings`

**Si vous ne les voyez pas** : Re-exécutez l'ÉTAPE 1

### ÉTAPE 3 : Configurer la Clé OpenAI (2 minutes)

1. **Cliquez sur** : **"Project Settings"** (icône engrenage en bas du menu)
2. **Cliquez sur** : **"Edge Functions"** (dans le menu de gauche)
3. **Scrollez** jusqu'à la section **"Secrets"**
4. **Vérifiez** si `OPENAI_API_KEY` existe dans la liste
5. **Si elle n'existe pas** :
   - Cliquez sur **"Add Secret"** ou **"New Secret"**
   - **Nom** : `OPENAI_API_KEY`
   - **Valeur** : Votre clé API OpenAI (commence par `sk-...`)
   - Cliquez sur **"Save"** ou **"Add"**

**Où trouver votre clé OpenAI** :
- Allez sur https://platform.openai.com/api-keys
- Connectez-vous
- Créez une nouvelle clé si nécessaire
- Copiez la clé (elle commence par `sk-...`)

### ÉTAPE 4 : Recharger l'Application

1. **Rechargez** la page de l'application (F5 ou Cmd+R)
2. **Ouvrez la console** (F12)
3. **Vérifiez** qu'il n'y a plus d'erreurs 404
4. **Testez** la génération d'un devis

---

## 🔍 VÉRIFICATION

### Comment Savoir si les Tables Sont Créées

1. **Ouvrez** : Supabase Dashboard > **Table Editor**
2. **Cherchez** dans la liste :
   - `clients` ✅
   - `user_settings` ✅

### Comment Savoir si la Clé OpenAI est Configurée

1. **Ouvrez** : Supabase Dashboard > **Project Settings** > **Edge Functions**
2. **Scrollez** jusqu'à **"Secrets"**
3. **Vérifiez** que `OPENAI_API_KEY` est dans la liste ✅

### Comment Tester

1. **Rechargez** l'application
2. **Allez sur** : `/ai` ou `/dashboard` > Section IA
3. **Remplissez** le formulaire :
   - Client : Test Client
   - Type de travaux : Peinture
   - Surface : 50
   - Matériaux : Peinture
4. **Cliquez sur** : "Générer le devis"
5. **Si ça fonctionne** : Vous verrez le devis généré ✅
6. **Si erreur 500** : Vérifiez que `OPENAI_API_KEY` est bien configurée

---

## 🆘 SI ÇA NE FONCTIONNE TOUJOURS PAS

### Problème : Erreur 404 Persiste

**Solution** :
1. Vérifiez que vous êtes dans le **bon projet** Supabase
2. Vérifiez que vous avez les **droits administrateur**
3. Essayez de créer les tables manuellement (voir ci-dessous)

### Problème : Erreur 500 Persiste

**Causes possibles** :
1. **OPENAI_API_KEY non configurée** → Voir ÉTAPE 3
2. **Clé API invalide** → Vérifiez que la clé est correcte
3. **Quota OpenAI dépassé** → Vérifiez votre compte OpenAI

**Solution** :
1. Vérifiez les **logs** de l'Edge Function :
   - Supabase Dashboard > **Edge Functions** > **generate-quote** > **Logs**
   - Regardez les erreurs récentes
2. Vérifiez que `OPENAI_API_KEY` est bien configurée (ÉTAPE 3)

---

## 📝 CRÉER LES TABLES MANUELLEMENT (Si le script ne fonctionne pas)

Si le script SQL ne fonctionne pas, créez les tables manuellement :

### Table `clients`

```sql
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

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

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

### Table `user_settings`

```sql
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  company_logo_url TEXT,
  siret TEXT,
  vat_number TEXT,
  legal_form TEXT,
  terms_and_conditions TEXT,
  signature_data TEXT,
  signature_name TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  reminder_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);
```

---

## ✅ CHECKLIST FINALE

- [ ] Script SQL exécuté dans Supabase
- [ ] Tables `clients` et `user_settings` visibles dans Table Editor
- [ ] `OPENAI_API_KEY` configurée dans Secrets
- [ ] Application rechargée
- [ ] Plus d'erreurs 404 dans la console
- [ ] Génération de devis fonctionne

---

**Fichier à utiliser** : `supabase/VERIFIER-ET-CREER-TABLES.sql`

**Temps estimé** : 5 minutes

