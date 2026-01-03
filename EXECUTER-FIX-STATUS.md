# 🚨 URGENT : Fixer la Contrainte CHECK sur Status

## ❌ Le Problème

La contrainte CHECK sur `ai_quotes.status` bloque la valeur `'signed'` !

**Erreur** :
```
new row for relation "ai_quotes" violates check constraint "ai_quotes_status_check"
```

**Actuellement autorisé** : `'draft', 'sent', 'accepted', 'rejected'`  
**Manquant** : `'signed'`, `'paid'`

---

## ✅ Solution : Exécuter ce SQL

### 📋 Étapes

1. **Dashboard Supabase** → **SQL Editor** → **New query**
2. **Copie-colle ce SQL complet** :

```sql
-- =====================================================
-- FIX: Ajouter 'signed' et 'paid' aux contraintes CHECK
-- =====================================================

-- 1️⃣ Supprimer la contrainte existante sur ai_quotes
ALTER TABLE public.ai_quotes 
DROP CONSTRAINT IF EXISTS ai_quotes_status_check;

-- 2️⃣ Recréer avec les bons statuts
ALTER TABLE public.ai_quotes
ADD CONSTRAINT ai_quotes_status_check 
CHECK (status IN ('draft', 'sent', 'signed', 'accepted', 'rejected', 'paid', 'cancelled'));

-- 3️⃣ Pareil pour quotes (si elle existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'quotes'
  ) THEN
    ALTER TABLE public.quotes 
    DROP CONSTRAINT IF EXISTS quotes_status_check;
    
    ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_status_check 
    CHECK (status IN ('draft', 'sent', 'signed', 'accepted', 'rejected', 'paid', 'cancelled'));
  END IF;
END $$;
```

3. **Clique sur "Run"**

---

## 🎯 Nouveaux Statuts Autorisés

| Status | Description | Quand |
|--------|-------------|-------|
| `draft` | Brouillon | Création |
| `sent` | Envoyé au client | Après email |
| **`signed`** | ✅ **Signé électroniquement** | **Après signature** |
| `accepted` | Accepté (alternatif) | Confirmation client |
| `rejected` | Rejeté | Refus client |
| **`paid`** | ✅ **Payé** | **Après paiement** |
| `cancelled` | Annulé | Annulation |

---

## 🧪 Après Exécution

1. **Recharge la page de signature**
2. **Signe le devis**
3. **✅ Ça devrait marcher !**

---

## 📊 Flow Complet

```
draft → sent → signed → paid
         ↓       ↓
    rejected  cancelled
```

