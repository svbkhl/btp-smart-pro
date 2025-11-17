# 🔧 Résolution : Erreur "ai_quotes does not exist"

## 🎯 Problème

**Erreur** : `ERROR: 42P01: relation "public.ai_quotes" does not exist`

Le script `AUTOMATED-NOTIFICATIONS-SYSTEM.sql` essaie de modifier la table `ai_quotes` mais elle n'existe pas encore.

---

## ✅ Solution : Utiliser le Script Complet

### Étape 1 : Exécuter le Script Complet

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Ouvrez le fichier** : `supabase/AUTOMATED-NOTIFICATIONS-COMPLETE.sql`
   - ⚠️ **IMPORTANT** : Utilisez `AUTOMATED-NOTIFICATIONS-COMPLETE.sql` (pas l'ancien)
3. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
4. **Collez dans SQL Editor** (Cmd+V)
5. **Cliquez sur "Run"** (Cmd+Enter)

**✅ Résultat attendu** :
- `Tables créées: 8`
- `Fonctions créées: 10`

---

## 🎯 Ce que fait le Script Complet

Le script `AUTOMATED-NOTIFICATIONS-COMPLETE.sql` :

1. ✅ **Crée toutes les tables nécessaires** si elles n'existent pas :
   - `ai_quotes`
   - `maintenance_reminders`
   - `notifications`
   - `email_queue`
   - `projects`
   - `clients`
   - `payments` (nouvelle)
   - `notification_log` (nouvelle)

2. ✅ **Crée les politiques RLS** si elles n'existent pas

3. ✅ **Ajoute les colonnes nécessaires** aux tables existantes

4. ✅ **Crée toutes les fonctions SQL** pour les notifications

5. ✅ **Crée les triggers** pour mettre à jour les dates

---

## 🔍 Vérification

### Vérifier que les Tables Existent

Dans SQL Editor, exécutez :

```sql
-- Vérifier les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'ai_quotes',
  'maintenance_reminders',
  'notifications',
  'email_queue',
  'payments',
  'notification_log',
  'projects',
  'clients'
)
ORDER BY table_name;
```

**Résultat attendu** : 8 lignes (une pour chaque table)

### Vérifier les Fonctions

```sql
-- Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'check_pending_quotes',
  'check_unconfirmed_quotes',
  'check_upcoming_worksites',
  'check_ending_worksites',
  'check_maintenance_due',
  'check_payments_due',
  'check_overdue_payments',
  'create_notification',
  'create_notification_with_email',
  'get_user_email'
)
ORDER BY routine_name;
```

**Résultat attendu** : 10 lignes (une pour chaque fonction)

---

## 🆘 Si l'Erreur Persiste

### Option 1 : Vérifier que la Table ai_quotes Existe

```sql
-- Vérifier si la table existe
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'ai_quotes'
);
```

Si le résultat est `false`, la table n'existe pas. Exécutez `AUTOMATED-NOTIFICATIONS-COMPLETE.sql`.

### Option 2 : Créer la Table ai_quotes Manuellement

Si le script complet ne fonctionne pas, créez la table manuellement :

```sql
-- Créer la table ai_quotes
CREATE TABLE IF NOT EXISTS public.ai_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  surface NUMERIC,
  work_type TEXT,
  materials TEXT[],
  image_urls TEXT[],
  estimated_cost NUMERIC,
  details JSONB,
  status TEXT DEFAULT 'draft',
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;
```

Ensuite, ré-exécutez `AUTOMATED-NOTIFICATIONS-COMPLETE.sql`.

---

## ✅ Après la Correction

Une fois le script exécuté avec succès :

1. ✅ **Vérifiez** que toutes les tables existent
2. ✅ **Vérifiez** que toutes les fonctions existent
3. ✅ **Continuez** avec l'étape 2 : Déployer la fonction `smart-notifications`

---

**Le script `AUTOMATED-NOTIFICATIONS-COMPLETE.sql` résout cette erreur automatiquement !** 🚀

