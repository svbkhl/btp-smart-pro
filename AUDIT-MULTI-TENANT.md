# 🔒 AUDIT MULTI-TENANT - ISOLATION DES DONNÉES PAR ENTREPRISE

## 🚨 PROBLÈME CRITIQUE DÉTECTÉ

**Symptôme** : Un compte entreprise peut voir les paiements de test du compte administrateur.
**Cause** : Absence d'isolation stricte des données par `company_id`.
**Gravité** : 🔴 **CRITIQUE** - Faille de sécurité majeure

---

## 📊 ÉTAT DES LIEUX - TABLES AVEC/SANS company_id

### ✅ Tables AVEC company_id (OK)
- `companies` ✅ (table principale)
- `company_users` ✅ (association user ↔ company)
- `clients` ✅
- `ai_quotes` ✅
- `invoices` ✅
- `payments` ✅
- `projects` ✅

### ❌ Tables SANS company_id (À CORRIGER)
- `messages` ❌ **CRITIQUE**
- `email_messages` ❌ **CRITIQUE**
- `events` ❌
- `user_settings` ❌
- `signatures` ❌
- `signature_sessions` ❌
- `contact_requests` ❌
- `notifications` ❌

---

## 🔍 ANALYSE DU PROBLÈME DES PAIEMENTS

### Scénario actuel (MAUVAIS)
```sql
-- ❌ Requête actuelle (NON FILTRÉE)
SELECT * FROM payments WHERE user_id = 'xxx';
```

**Problème** : 
- Filtre sur `user_id` uniquement
- Si l'admin et l'entreprise partagent le même `user_id`, les données se mélangent
- Ou si les RLS policies sont mal configurées

### Scénario attendu (BON)
```sql
-- ✅ Requête sécurisée (FILTRÉE PAR COMPANY)
SELECT * FROM payments 
WHERE company_id = 'current_company_id';
```

---

## 🎯 PLAN DE CORRECTION

### Phase 1 : URGENT - Sécuriser les paiements (1h)
1. Vérifier les RLS policies sur `payments`
2. Ajouter filtre `company_id` dans toutes les requêtes de paiements
3. Tester l'isolation

### Phase 2 : Ajouter company_id aux tables critiques (2h)
1. `messages` - Messagerie
2. `email_messages` - Historique emails
3. `signatures` - Signatures électroniques
4. `signature_sessions` - Sessions de signature

### Phase 3 : Sécuriser le contexte utilisateur (1h)
1. Identifier le `company_id` actif depuis la session
2. Créer un hook `useCurrentCompany()`
3. Injecter automatiquement `company_id` dans toutes les requêtes

### Phase 4 : RLS Policies strictes (1h)
1. Activer RLS sur toutes les tables
2. Créer policies WITH CHECK (company_id = current_company())
3. Interdire toute requête cross-company

### Phase 5 : Tests de sécurité (1h)
1. Créer 2 comptes entreprise de test
2. Vérifier qu'aucune donnée ne fuite
3. Tests automatisés

---

## 🔐 RÈGLES DE SÉCURITÉ MULTI-TENANT

### Règle 1 : Tout est lié à une entreprise
```sql
-- Toute table métier DOIT avoir company_id
ALTER TABLE ma_table ADD COLUMN company_id UUID NOT NULL 
  REFERENCES companies(id) ON DELETE CASCADE;
```

### Règle 2 : Filtrage systématique
```typescript
// ❌ INTERDIT
const { data } = await supabase.from('payments').select('*');

// ✅ OBLIGATOIRE
const { data } = await supabase
  .from('payments')
  .select('*')
  .eq('company_id', currentCompanyId);
```

### Règle 3 : RLS Policy stricte
```sql
-- ✅ Policy type
CREATE POLICY "Users can only see their company data"
ON public.payments
FOR SELECT
USING (company_id = (
  SELECT company_id FROM company_users 
  WHERE user_id = auth.uid() LIMIT 1
));
```

### Règle 4 : Contexte unique
```typescript
// Un utilisateur = UNE entreprise active à la fois
const { currentCompanyId } = useCurrentCompany();
```

---

## 📋 CHECKLIST DE VÉRIFICATION

### Pour chaque table métier
- [ ] Colonne `company_id UUID NOT NULL` existe
- [ ] Index sur `company_id` créé
- [ ] Foreign key vers `companies(id)` active
- [ ] RLS activé (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`)
- [ ] Policy SELECT avec filtre `company_id`
- [ ] Policy INSERT avec `WITH CHECK (company_id = ...)`
- [ ] Policy UPDATE avec filtre `company_id`
- [ ] Policy DELETE avec filtre `company_id`

### Pour chaque requête frontend
- [ ] Filtre `.eq('company_id', currentCompanyId)`
- [ ] Pas de requête globale non filtrée
- [ ] Test d'isolation réussi

---

## 🚀 PROCHAINES ÉTAPES IMMÉDIATES

1. **MAINTENANT** : Créer script SQL de migration
2. **MAINTENANT** : Créer RLS policies strictes
3. **AUJOURD'HUI** : Modifier les requêtes frontend critiques (payments, quotes, invoices)
4. **DEMAIN** : Compléter toutes les autres tables
5. **TESTS** : Vérification complète de l'isolation

---

## ⚠️ IMPACT ET RISQUES

### Impact technique
- Modification de schéma de base de données
- Mise à jour de toutes les requêtes
- Temps estimé : **6 heures**

### Risques si non corrigé
- 🔴 **Fuite de données entre entreprises**
- 🔴 **Non-conformité RGPD**
- 🔴 **Impossibilité de scaler en SaaS**
- 🔴 **Perte de confiance des clients**

---

## 📞 CONTACT

- **Priorité** : 🔴 CRITIQUE
- **Délai** : IMMÉDIAT
- **Responsable** : Équipe technique

---

*Document créé le : 05/01/2026*
*Statut : 🔴 EN COURS DE CORRECTION*
