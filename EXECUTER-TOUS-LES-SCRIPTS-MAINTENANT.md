# ⚡ EXÉCUTER TOUS LES SCRIPTS SQL MAINTENANT

## 📋 TU DOIS EXÉCUTER 4 SCRIPTS (6 MIN)

**Important** : Le CLI Supabase ne supporte pas l'exécution directe de fichiers SQL.  
Tu dois les exécuter via le **Dashboard Supabase**.

---

## 🔗 LIEN RAPIDE

https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

---

## ✅ SCRIPT 1/4 : Colonnes Signature (1 min)

### Fichier : `supabase/ADD-SIGNATURE-COLUMNS.sql`

1. **Ouvre le Dashboard** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Copie TOUT le contenu** du fichier `supabase/ADD-SIGNATURE-COLUMNS.sql`
3. **Colle dans l'éditeur SQL**
4. **Clique "Run"** (ou Cmd+Enter)
5. **Vérifie** : Messages ✅ "Colonne signed ajoutée", etc.

---

## ✅ SCRIPT 2/4 : Fix Contraintes Status (1 min)

### Fichier : `supabase/FIX-STATUS-CONSTRAINT.sql`

1. **New query** ou rafraîchir la page
2. **Copie TOUT le contenu** de `supabase/FIX-STATUS-CONSTRAINT.sql`
3. **Colle** → **Run**
4. **Vérifie** : Contraintes avec `'signed'`, `'paid'` ajoutées

---

## ✅ SCRIPT 3/4 : Système Paiement (2 min)

### Fichier : `supabase/ADD-PAYMENT-FLOW-COLUMNS.sql`

1. **New query**
2. **Copie TOUT** de `supabase/ADD-PAYMENT-FLOW-COLUMNS.sql`
3. **Colle** → **Run**
4. **Vérifie** : 
   ```
   ✅ SYSTÈME DE PAIEMENT STRIPE CONFIGURÉ
   Tables: invoices, payments créées
   Trigger créé
   ```

---

## ✅ SCRIPT 4/4 : Paiement Plusieurs Fois (2 min)

### Fichier : `supabase/ADD-PAYMENT-SCHEDULES.sql`

1. **New query**
2. **Copie TOUT** de `supabase/ADD-PAYMENT-SCHEDULES.sql`
3. **Colle** → **Run**
4. **Vérifie** :
   ```
   ✅ SYSTÈME DE PAIEMENT EN PLUSIEURS FOIS
   Table payment_schedules créée
   Fonctions créées
   Triggers configurés
   ```

---

## 🎯 APRÈS LES 4 SCRIPTS

### Vérifier en SQL :

```sql
-- Vérifier les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoices', 'payments', 'payment_schedules');

-- Vérifier les colonnes signature
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ai_quotes' 
AND column_name IN ('signed', 'signed_at', 'signature_data');

-- Vérifier les fonctions
SELECT proname FROM pg_proc 
WHERE proname IN (
  'generate_payment_schedule',
  'is_previous_installment_paid',
  'get_next_unpaid_installment'
);
```

**Résultat attendu** :
- 3 tables
- 3 colonnes signature
- 3 fonctions

---

## 🚀 APRÈS SQL → DÉPLOYER EDGE FUNCTIONS

Une fois les 4 scripts exécutés, reviens ici et je déploierai les Edge Functions ! 

Ou exécute toi-même :

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

supabase functions deploy create-payment-link --project-ref renmjmqlmafqjzldmsgs
supabase functions deploy create-payment-link-v2 --project-ref renmjmqlmafqjzldmsgs
supabase functions deploy stripe-invoice-webhook --project-ref renmjmqlmafqjzldmsgs
```

---

**🎯 COMMENCE PAR LE SCRIPT 1 !**
