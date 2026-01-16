# ✅ VÉRIFICATION APRÈS MIGRATION

## 1. Vérifier que les tables sont créées

Dans Supabase Dashboard > **Table Editor**, vérifier que ces tables existent :
- ✅ `quote_sections`
- ✅ `quote_lines`
- ✅ `quote_section_library`
- ✅ `quote_line_library`
- ✅ `company_settings`

## 2. Vérifier les colonnes de `ai_quotes`

Dans Supabase Dashboard > **Table Editor** > `ai_quotes`, vérifier les colonnes :
- ✅ `company_id` (UUID)
- ✅ `client_id` (UUID)
- ✅ `tva_rate` (NUMERIC)
- ✅ `tva_non_applicable_293b` (BOOLEAN)
- ✅ `subtotal_ht` (NUMERIC)
- ✅ `total_tva` (NUMERIC)
- ✅ `total_ttc` (NUMERIC)
- ✅ `mode` (TEXT)

## 3. Tester la création d'un devis détaillé

1. **Créer un nouveau devis détaillé**
   - Cliquer sur "Nouveau devis"
   - Choisir "Devis détaillé"
   - Sélectionner un client

2. **Ajouter une section**
   - Cliquer sur "+ Ajouter un titre"
   - Entrer : "Plâtrerie - Isolation"

3. **Ajouter des lignes**
   - Cliquer sur "+ Ajouter une ligne" sous la section
   - Ligne 1 :
     - Prestation : "Plaque de plâtre"
     - Unité : "m²"
     - Quantité : 10
     - Prix HT : 8.50
   - Ligne 2 :
     - Prestation : "Laine de verre"
     - Unité : "m²"
     - Quantité : 10
     - Prix HT : 12.00

4. **Sauvegarder**
   - Cliquer sur "Créer le devis"
   - **Vérifier qu'il n'y a PAS d'erreur 404 dans la console**

5. **Recharger la page**
   - Actualiser la page (F5)
   - Vérifier que le devis est toujours là
   - Vérifier que les sections et lignes sont bien affichées

## 4. Vérifier les totaux

Après création, vérifier dans la console ou dans le devis :
- Total HT = 205.00 € (10 × 8.50 + 10 × 12.00)
- TVA = selon le taux (ex: 20% = 41.00 €)
- Total TTC = 246.00 € (si TVA 20%)

## 5. Vérifier TVA 293B

1. Créer un nouveau devis
2. Cocher "TVA non applicable – Article 293 B du CGI"
3. Ajouter une ligne
4. Sauvegarder
5. Vérifier que :
   - Total TVA = 0 €
   - Total TTC = Total HT

## ✅ Résultat attendu

- ✅ Zéro erreur 404 dans la console
- ✅ Sections sauvegardées et récupérées
- ✅ Lignes sauvegardées et récupérées
- ✅ Totaux corrects
- ✅ TVA 293B fonctionnelle

Si tout fonctionne, c'est bon ! 🎉
