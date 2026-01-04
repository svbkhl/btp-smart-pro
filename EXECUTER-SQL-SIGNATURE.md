# 🚨 URGENT : Ajouter les Colonnes de Signature

## ❌ Le Problème
La table `ai_quotes` n'a pas la colonne `signed` (boolean), ce qui empêche la signature de fonctionner.

## ✅ La Solution : Exécuter ce SQL

### Méthode 1 : Dashboard Supabase (RECOMMANDÉ)

1. **Ouvre le Dashboard Supabase**
   - Va sur https://supabase.com/dashboard
   - Sélectionne ton projet `renmjmqlmafqjzldmsgs`

2. **Va dans SQL Editor**
   - Clique sur "SQL Editor" dans le menu de gauche
   - Clique sur "New query"

3. **Copie-colle ce SQL complet** :

```sql
-- =====================================================
-- AJOUTER LES COLONNES DE SIGNATURE ÉLECTRONIQUE
-- =====================================================

DO $$ 
BEGIN
  -- ai_quotes: signed (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signed'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne signed ajoutée à ai_quotes';
  END IF;

  -- ai_quotes: signed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Colonne signed_at ajoutée à ai_quotes';
  END IF;

  -- ai_quotes: signed_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signed_by'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed_by TEXT;
    RAISE NOTICE '✅ Colonne signed_by ajoutée à ai_quotes';
  END IF;

  -- ai_quotes: signature_data (base64 de l'image)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_data TEXT;
    RAISE NOTICE '✅ Colonne signature_data ajoutée à ai_quotes';
  END IF;

  -- ai_quotes: signature_user_agent (traçabilité)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signature_user_agent'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_user_agent TEXT;
    RAISE NOTICE '✅ Colonne signature_user_agent ajoutée à ai_quotes';
  END IF;

  -- ai_quotes: signature_url (lien public de signature)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signature_url'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_url TEXT;
    RAISE NOTICE '✅ Colonne signature_url ajoutée à ai_quotes';
  END IF;

  -- ai_quotes: signature_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signature_token'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_token TEXT;
    RAISE NOTICE '✅ Colonne signature_token ajoutée à ai_quotes';
  END IF;
END $$;

-- Faire la même chose pour la table quotes (si elle existe)
DO $$ 
BEGIN
  -- Vérifier si la table quotes existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'quotes'
  ) THEN
    -- quotes: signed (boolean)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signed'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signed BOOLEAN DEFAULT false;
      RAISE NOTICE '✅ Colonne signed ajoutée à quotes';
    END IF;

    -- quotes: signed_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signed_at'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
      RAISE NOTICE '✅ Colonne signed_at ajoutée à quotes';
    END IF;

    -- quotes: signed_by
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signed_by'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signed_by TEXT;
      RAISE NOTICE '✅ Colonne signed_by ajoutée à quotes';
    END IF;

    -- quotes: signature_data
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signature_data'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signature_data TEXT;
      RAISE NOTICE '✅ Colonne signature_data ajoutée à quotes';
    END IF;

    -- quotes: signature_user_agent
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signature_user_agent'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signature_user_agent TEXT;
      RAISE NOTICE '✅ Colonne signature_user_agent ajoutée à quotes';
    END IF;

    -- quotes: signature_url
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signature_url'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signature_url TEXT;
      RAISE NOTICE '✅ Colonne signature_url ajoutée à quotes';
    END IF;

    -- quotes: signature_token
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signature_token'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signature_token TEXT;
      RAISE NOTICE '✅ Colonne signature_token ajoutée à quotes';
    END IF;
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_quotes_signed ON public.ai_quotes(signed) WHERE signed = true;
CREATE INDEX IF NOT EXISTS idx_ai_quotes_signature_token ON public.ai_quotes(signature_token) WHERE signature_token IS NOT NULL;

-- Faire de même pour quotes si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quotes'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_quotes_signed ON public.quotes(signed) WHERE signed = true;
    CREATE INDEX IF NOT EXISTS idx_quotes_signature_token ON public.quotes(signature_token) WHERE signature_token IS NOT NULL;
  END IF;
END $$;
```

4. **Clique sur "Run"** (Ctrl+Enter ou le bouton "Run")

5. **Vérifie le résultat** : Tu devrais voir des messages "✅ Colonne ... ajoutée"

---

## 📊 Colonnes Ajoutées

| Colonne | Type | Description |
|---------|------|-------------|
| `signed` | BOOLEAN | ✅ Indique si le devis est signé |
| `signed_at` | TIMESTAMPTZ | Date/heure de la signature |
| `signed_by` | TEXT | Nom du signataire |
| `signature_data` | TEXT | Image signature en base64 (PNG) |
| `signature_user_agent` | TEXT | Navigateur (traçabilité) |
| `signature_url` | TEXT | URL publique pour signer |
| `signature_token` | TEXT | Token de sécurité |

---

## 🧪 Après Exécution

1. **Recharge la page de signature** du devis
2. **Clique sur "Signer le devis"**
3. **Dessine ta signature** dans le canvas
4. **Clique sur "Valider la signature"**
5. **✅ Ça devrait fonctionner !**

---

## ⚠️ Si Ça Ne Marche Toujours Pas

Envoie-moi le message d'erreur complet de la console.



