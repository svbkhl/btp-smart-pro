# 🚨 INSTRUCTIONS URGENTES - Créer la table companies

## ⚠️ Problème Actuel

Tu as cette erreur :
```
⚠️ Table companies n'existe pas encore
Failed to load resource: the server responded with a status of 500
```

**Cause** : La table `companies` n'existe pas dans Supabase.

---

## ✅ SOLUTION (2 minutes)

### Étape 1 : Ouvrir Supabase SQL Editor

1. Va sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new**
2. Tu verras un éditeur SQL vide

### Étape 2 : Copier le Script

1. Ouvre le fichier : `supabase/SCRIPT-URGENT-CREER-COMPANIES.sql`
2. **Sélectionne TOUT** (Cmd+A ou Ctrl+A)
3. **Copie** (Cmd+C ou Ctrl+C)

### Étape 3 : Coller et Exécuter

1. **Colle** dans l'éditeur SQL de Supabase (Cmd+V ou Ctrl+V)
2. **Clique sur "Run"** (ou appuie sur Cmd+Enter / Ctrl+Enter)
3. **Attends** quelques secondes

### Étape 4 : Vérifier

Tu devrais voir dans les résultats :
```
✅ Table companies créée avec succès !
nombre_de_lignes: 0
```

---

## 🔍 Si ça ne marche pas

### Erreur : "relation user_roles does not exist"

**Solution** : La table `user_roles` n'existe pas. Exécute d'abord ce script :

```sql
-- Créer la table user_roles si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('administrateur', 'utilisateur')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Donner le rôle administrateur à ton compte
-- Remplace TON_USER_ID par ton UUID (trouve-le dans auth.users)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur' 
FROM auth.users 
WHERE email = 'ton-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Erreur : "relation company_users does not exist"

**Solution** : Crée d'abord la table `company_users` :

```sql
-- Créer la table company_users
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company_users"
  ON public.company_users FOR SELECT
  USING (auth.uid() = user_id);
```

---

## ✅ Après avoir exécuté le script

1. **Recharge** l'application (F5 ou Cmd+R)
2. **Vérifie** dans la console qu'il n'y a plus d'erreur 500
3. **Teste** de créer une entreprise dans l'interface admin

---

## 📋 Checklist

- [ ] Script SQL copié dans Supabase
- [ ] Script exécuté avec succès
- [ ] Message "✅ Table companies créée avec succès !" visible
- [ ] Application rechargée
- [ ] Plus d'erreur 500 dans la console
- [ ] Bouton "Créer" fonctionne dans "Gestion des Entreprises"

---

## 🆘 Si rien ne fonctionne

Envoie-moi :
1. Le **message d'erreur complet** de Supabase SQL Editor
2. Une **capture d'écran** de l'erreur dans la console du navigateur














