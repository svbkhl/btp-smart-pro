# 🛠️ FIX DEVIS DÉTAILLÉ : SUPPRESSION DES 404

## Problème

Les tables suivantes retournent 404 :
- `quote_sections`
- `quote_lines`
- `quote_section_library`
- `quote_line_library`
- `company_settings`
- Fonction RPC `recompute_quote_totals_with_293b`

## Solution

### Étape 1 : Appliquer la migration SQL

1. Ouvrir **Supabase Dashboard** > **SQL Editor**
2. Copier **TOUT** le contenu du fichier : `supabase/migrations/20260119000001_fix_detailed_quotes_tables.sql`
3. Coller dans l'éditeur SQL
4. Cliquer sur **"Run"**
5. Vérifier que les tables sont créées dans **Table Editor**

### Étape 2 : Vérification

Après l'exécution, vérifier que les tables suivantes existent :
- ✅ `quote_sections`
- ✅ `quote_lines`
- ✅ `quote_section_library`
- ✅ `quote_line_library`
- ✅ `company_settings`

Vérifier que `ai_quotes` a les colonnes :
- ✅ `company_id`
- ✅ `client_id`
- ✅ `tva_rate`
- ✅ `tva_non_applicable_293b`
- ✅ `subtotal_ht`
- ✅ `total_tva`
- ✅ `total_ttc`
- ✅ `mode`

### Étape 3 : Test

1. Créer un nouveau devis détaillé
2. Ajouter une section (ex: "Plâtrerie")
3. Ajouter 2 lignes avec quantités et prix
4. Cliquer sur "Créer le devis"
5. Vérifier qu'il n'y a plus de 404 dans la console
6. Recharger la page
7. Vérifier que les sections et lignes sont bien récupérées

## Modifications apportées au code

### 1. Script SQL consolidé
- Fichier : `supabase/migrations/20260119000001_fix_detailed_quotes_tables.sql`
- Crée toutes les tables manquantes avec RLS et policies
- Ajoute les colonnes manquantes à `ai_quotes`
- Crée les fonctions utilitaires

### 2. Mapping sections temporaires → UUID réels
- Les sections sont créées **AVANT** les lignes
- Un mapping `temp_id → real_uuid` est construit
- Les lignes utilisent les UUID réels (plus de "temp-section-..." dans la DB)

### 3. Recalcul totaux sans RPC
- Le recalcul se fait côté frontend avec `computeQuoteTotals()`
- Les totaux sont mis à jour via `UPDATE ai_quotes`
- Fallback sur RPC si elle existe

### 4. Gestion company_settings
- Les préférences TVA sont sauvegardées dans `company_settings`
- Si la table n'existe pas, les valeurs par défaut sont utilisées (pas de crash)

## Résultat attendu

✅ Zéro requête 404 sur Supabase
✅ Sections/lignes sauvegardées et rechargées
✅ Totaux recalculés correctement
✅ TVA 293B fonctionnelle
✅ Bibliothèques (sections/lignes) opérationnelles
