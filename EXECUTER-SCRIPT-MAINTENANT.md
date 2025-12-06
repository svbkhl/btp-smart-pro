# 🚨 EXÉCUTER LE SCRIPT SQL MAINTENANT

## ⚡ Action Immédiate Requise

La table `companies` n'existe pas. Tu **DOIS** exécuter ce script SQL pour que la création d'entreprise fonctionne.

---

## 📋 Script SQL à Exécuter

**Copie-colle ce script dans Supabase SQL Editor** :

```sql
-- =====================================================
-- 🚀 CRÉER LA TABLE companies
-- =====================================================

-- Créer la table companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'custom' CHECK (plan IN ('basic', 'pro', 'enterprise', 'custom')),
  features JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  support_level INTEGER DEFAULT 0 CHECK (support_level IN (0, 1, 2)),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'no_support')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);

-- Activer RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;

-- Policy pour permettre aux admins système de créer des entreprises
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_companies_updated_at();
```

---

## 🎯 Étapes à Suivre

1. **Ouvre** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Sélectionne TOUT le script ci-dessus** (Cmd+A)
3. **Copie** (Cmd+C)
4. **Colle dans l'éditeur SQL** (Cmd+V)
5. **Clique sur "Run"** (Cmd+Enter)

---

## ✅ Vérification

Après avoir exécuté le script :

1. **Va dans** : Table Editor
2. **Tu devrais voir** : `companies` dans la liste
3. **Recharge la page** de l'application (F5)
4. **Teste** : Créer une entreprise

---

## 🚨 Si ça ne marche toujours pas

Vérifie que tu es bien admin :

```sql
SELECT * FROM public.user_roles WHERE role = 'administrateur';
```

Si tu n'apparais pas, exécute ceci (remplace `TON_USER_ID`) :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('TON_USER_ID', 'administrateur')
ON CONFLICT (user_id) DO UPDATE SET role = 'administrateur';
```

---

**⚠️ SANS EXÉCUTER CE SCRIPT, TU NE POURRAS PAS CRÉER D'ENTREPRISES !**







