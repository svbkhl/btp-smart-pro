-- 🔍 SCRIPT DE VÉRIFICATION : Colonnes nécessaires pour l'onglet Paiements
-- Exécute ce script dans Supabase Dashboard → SQL Editor

-- ==========================================
-- 1️⃣ VÉRIFIER LES COLONNES DE ai_quotes
-- ==========================================

SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'ai_quotes'
AND column_name IN ('signed', 'signed_at', 'signer_name', 'signature_data', 'signature_ip_address', 'payment_status')
ORDER BY column_name;

-- ⚠️ TU DEVRAIS VOIR :
-- signed | boolean | YES
-- signed_at | timestamp with time zone | YES
-- signer_name | text | YES
-- signature_data | text | YES
-- signature_ip_address | text | YES  
-- payment_status | text | YES (si existe)

-- ==========================================
-- 2️⃣ VÉRIFIER LES DEVIS SIGNÉS
-- ==========================================

SELECT 
  id,
  quote_number,
  client_name,
  estimated_cost,
  signed,
  signed_at,
  signer_name,
  payment_status,
  created_at
FROM ai_quotes
WHERE signed = true
ORDER BY signed_at DESC
LIMIT 10;

-- ⚠️ SI LA REQUÊTE RETOURNE DES LIGNES :
-- → Tu as des devis signés !
-- → Ils devraient apparaître dans l'onglet Paiements

-- ⚠️ SI LA REQUÊTE EST VIDE :
-- → Tu n'as pas encore de devis signés
-- → C'est normal que l'onglet Paiements soit vide
-- → Suis le guide GUIDE-TEST-PAIEMENTS.md

-- ==========================================
-- 3️⃣ VÉRIFIER LES PAIEMENTS
-- ==========================================

SELECT 
  id,
  reference,
  amount,
  status,
  payment_type,
  quote_id,
  created_at,
  paid_date
FROM payments
ORDER BY created_at DESC
LIMIT 10;

-- ⚠️ SI LA REQUÊTE RETOURNE DES LIGNES :
-- → Tu as déjà des paiements
-- → Ils devraient apparaître dans l'onglet Paiements

-- ==========================================
-- 4️⃣ AJOUTER LES COLONNES SI MANQUANTES
-- ==========================================

-- ⚠️ SEULEMENT SI les colonnes n'existent pas (voir étape 1)

DO $$ 
BEGIN
  -- Ajouter la colonne signed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_quotes' AND column_name = 'signed'
  ) THEN
    ALTER TABLE ai_quotes ADD COLUMN signed BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne signed ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE '⚠️ Colonne signed existe déjà dans ai_quotes';
  END IF;

  -- Ajouter la colonne signed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_quotes' AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE ai_quotes ADD COLUMN signed_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Colonne signed_at ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE '⚠️ Colonne signed_at existe déjà dans ai_quotes';
  END IF;

  -- Ajouter la colonne signer_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_quotes' AND column_name = 'signer_name'
  ) THEN
    ALTER TABLE ai_quotes ADD COLUMN signer_name TEXT;
    RAISE NOTICE '✅ Colonne signer_name ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE '⚠️ Colonne signer_name existe déjà dans ai_quotes';
  END IF;

  -- Ajouter la colonne signature_data
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_quotes' AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE ai_quotes ADD COLUMN signature_data TEXT;
    RAISE NOTICE '✅ Colonne signature_data ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE '⚠️ Colonne signature_data existe déjà dans ai_quotes';
  END IF;

  -- Ajouter la colonne signature_ip_address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_quotes' AND column_name = 'signature_ip_address'
  ) THEN
    ALTER TABLE ai_quotes ADD COLUMN signature_ip_address TEXT;
    RAISE NOTICE '✅ Colonne signature_ip_address ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE '⚠️ Colonne signature_ip_address existe déjà dans ai_quotes';
  END IF;

  -- Ajouter la colonne payment_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_quotes' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE ai_quotes ADD COLUMN payment_status TEXT;
    RAISE NOTICE '✅ Colonne payment_status ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE '⚠️ Colonne payment_status existe déjà dans ai_quotes';
  END IF;
END $$;

-- ==========================================
-- 5️⃣ CRÉER UN DEVIS DE TEST SIGNÉ (OPTIONNEL)
-- ==========================================

-- ⚠️ UNIQUEMENT POUR TEST - Ne pas utiliser en production !
-- ⚠️ Remplace 'YOUR_USER_ID' par ton vrai user_id

/*
INSERT INTO ai_quotes (
  user_id,
  client_name,
  quote_number,
  estimated_cost,
  status,
  signed,
  signed_at,
  signer_name,
  created_at
) VALUES (
  'YOUR_USER_ID', -- ⚠️ REMPLACE PAR TON USER ID
  'Client Test',
  'DEVIS-TEST-001',
  5000,
  'signed',
  true,
  NOW(),
  'Test Signataire',
  NOW()
);
*/

-- ==========================================
-- 📊 RÉSUMÉ DES VÉRIFICATIONS
-- ==========================================

-- ✅ Étape 1 : Vérifie que toutes les colonnes existent
-- ✅ Étape 2 : Vérifie s'il y a des devis signés
-- ✅ Étape 3 : Vérifie s'il y a des paiements
-- ✅ Étape 4 : Ajoute les colonnes manquantes (si nécessaire)
-- ⚠️ Étape 5 : Crée un devis test signé (optionnel, pour test uniquement)

-- ==========================================
-- 🎯 RÉSULTAT ATTENDU
-- ==========================================

-- Si tu as des devis signés (étape 2 retourne des lignes) :
-- → Ils DOIVENT apparaître dans Facturation → Paiements → Section orange

-- Si tu n'as PAS de devis signés (étape 2 vide) :
-- → C'est NORMAL que l'onglet Paiements soit vide
-- → Suis le guide GUIDE-TEST-PAIEMENTS.md pour créer et signer un devis

-- ==========================================
-- 🔗 LIEN DE SIGNATURE POUR UN DEVIS
-- ==========================================

-- Pour obtenir le lien de signature d'un devis :
SELECT 
  id,
  quote_number,
  CONCAT('https://www.btpsmartpro.com/sign/', id) as signature_link
FROM ai_quotes
WHERE signed = false
ORDER BY created_at DESC
LIMIT 5;

