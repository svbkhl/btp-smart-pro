# 🔥 SCRIPT FINAL - ISOLATION COMPLÈTE DES DONNÉES

## 🎯 OBJECTIF

Ce script va **RÉSOUDRE DÉFINITIVEMENT** le problème de mélange de données entre les comptes en ajoutant des **RLS policies strictes** sur la table `payments`.

---

## 📋 SCRIPT À EXÉCUTER

### **Script 5 : Isolation des paiements par entreprise**

[**supabase/migrations/20260105000005_fix_payments_rls.sql**](/Users/sabrikhalfallah/Downloads/BTP%20SMART%20PRO/supabase/migrations/20260105000005_fix_payments_rls.sql)

---

## 🚀 MARCHE À SUIVRE

1. **Clique sur le lien rose** ci-dessus
2. **Copie tout le contenu** (Cmd+A puis Cmd+C)
3. **Va dans Supabase SQL Editor**
4. **Colle et clique sur "Run"**

---

## ✅ CE QUE CE SCRIPT FAIT

### 1️⃣ **Ajoute `company_id` à la table `payments`** (si pas déjà présent)

### 2️⃣ **Migre les données existantes**
- Associe chaque paiement à son entreprise via `quote_id` ou `invoice_id`
- Remplit automatiquement la colonne `company_id`

### 3️⃣ **Rend `company_id` obligatoire**
- Empêche la création de nouveaux paiements sans entreprise

### 4️⃣ **Active les RLS policies strictes**
- **SELECT** : Utilisateurs ne voient QUE les paiements de leur entreprise
- **INSERT** : Utilisateurs ne peuvent créer QUE des paiements pour leur entreprise
- **UPDATE** : Utilisateurs ne peuvent modifier QUE les paiements de leur entreprise
- **DELETE** : Seul le OWNER peut supprimer des paiements

---

## 🎉 RÉSULTAT ATTENDU

Après l'exécution de ce script :

✅ **Chaque paiement est lié à UNE entreprise**
✅ **Les utilisateurs ne voient QUE les paiements de LEUR entreprise**
✅ **Plus de mélange de données entre comptes**
✅ **Sécurité maximale avec RLS**

---

## 📊 VÉRIFICATION

Après avoir exécuté le script, vérifie avec cette requête :

```sql
-- Vérifier que tous les paiements ont un company_id
SELECT 
  COUNT(*) AS total_payments,
  COUNT(company_id) AS payments_with_company,
  COUNT(*) - COUNT(company_id) AS payments_without_company
FROM public.payments;
-- payments_without_company devrait être 0

-- Vérifier les RLS policies sur payments
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'payments';
-- Devrait afficher 4 policies (SELECT, INSERT, UPDATE, DELETE)
```

---

## 🔥 **EXÉCUTE CE SCRIPT MAINTENANT !**

Une fois exécuté, **rafraîchis ton application** et vérifie que tu ne vois plus les paiements des autres comptes !

---

*Script créé le : 05/01/2026*
*Statut : 🔥 CRITIQUE - À EXÉCUTER IMMÉDIATEMENT*
