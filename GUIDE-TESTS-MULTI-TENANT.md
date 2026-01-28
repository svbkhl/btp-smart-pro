# 🧪 Guide des Tests Multi-tenant

## 📋 Vue d'Ensemble

Les tests multi-tenant valident que l'isolation entre entreprises fonctionne correctement à tous les niveaux :
- Row Level Security (RLS)
- Triggers PostgreSQL
- Politiques de sécurité
- Filtres frontend

---

## 🚀 Installation

### Étape 1 : Installer Vitest

```bash
npm install -D vitest @vitest/ui
```

### Étape 2 : Ajouter le script de test

Dans `package.json`, ajoutez (si pas déjà présent) :

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run"
  }
}
```

---

## 🧪 Exécution des Tests

### Tests Multi-tenant Spécifiques

```bash
# Mode watch (recommandé pour développement)
npm run test tests/multi-tenant-isolation.test.ts

# Mode unique (CI/CD)
npm run test:run tests/multi-tenant-isolation.test.ts

# Avec interface UI
npm run test:ui
```

### Tous les Tests

```bash
# Exécuter tous les tests
npm run test

# Avec coverage
npm run test -- --coverage
```

---

## 📊 Structure des Tests

### Tests Implémentés

Le fichier `tests/multi-tenant-isolation.test.ts` contient :

#### 1. **Setup Global**
- Création de 2 entreprises test (Company A et B)
- Création d'1 utilisateur par entreprise
- Configuration des clients Supabase

#### 2. **Tests Clients**
- ✅ Isolation en lecture (SELECT)
- ✅ Isolation en écriture (INSERT)
- ✅ Isolation en modification (UPDATE)
- ✅ Isolation en suppression (DELETE)

#### 3. **Tests Projets**
- ✅ Isolation CRUD complète
- ✅ Vérification RLS

#### 4. **Tests Invoices & Quotes**
- ✅ Isolation factures
- ✅ Isolation devis

#### 5. **Tests RLS (Sans Filtres Frontend)**
- ✅ Validation que RLS bloque vraiment
- ✅ Tests d'exploitation (tentatives de bypass)

---

## 📝 Résultats Attendus

### ✅ Tests Passants

```
✓ CLIENT - Read Isolation
✓ CLIENT - Write Isolation
✓ CLIENT - Update Isolation
✓ CLIENT - Delete Isolation
✓ PROJECT - CRUD Isolation
✓ INVOICE - CRUD Isolation
✓ QUOTE - CRUD Isolation
✓ RLS - Direct Query (sans filtres)
✓ EXPLOITATION - Bypass tentatives blocked

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Time:        12.5s
```

### ❌ Tests Échouants (Problèmes d'Isolation)

Si des tests échouent, cela indique un problème de sécurité :

```
✗ CLIENT - Read Isolation
  Expected: 0 clients from Company B
  Received: 1 client (LEAK DETECTED!)

✗ RLS - Direct Query
  Expected: RLS to block access
  Received: User B accessed Company A's data
```

---

## 🐛 Debugging en Cas d'Échec

### 1. Vérifier RLS Activé

```sql
-- Exécuter dans Supabase SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'projects', 'invoices', 'quotes');

-- Résultat attendu: rowsecurity = true pour toutes les tables
```

### 2. Vérifier Politiques RLS

```sql
-- Lister toutes les politiques
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. Vérifier Triggers

```sql
-- Lister les triggers sur company_id
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%company%'
ORDER BY event_object_table;
```

### 4. Tester Manuellement

```sql
-- Se connecter en tant qu'utilisateur A
SET request.jwt.claims TO '{"company_id": "UUID_COMPANY_A"}';

-- Essayer de lire les données de Company B
SELECT * FROM clients WHERE company_id = 'UUID_COMPANY_B';
-- Résultat attendu: 0 lignes

-- Essayer de créer un client dans Company B
INSERT INTO clients (name, company_id) 
VALUES ('Test', 'UUID_COMPANY_B');
-- Résultat attendu: Erreur ou trigger force company_id de A
```

---

## 🔧 Corrections Possibles

### Si RLS n'est pas activé

```sql
-- Activer RLS sur une table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- etc.

-- Ou exécuter le script d'activation global
-- supabase/migrations/ACTIVER-RLS-TOUTES-TABLES-URGENT.sql
```

### Si Politiques Manquantes

```sql
-- Créer les 4 politiques standards pour une table
CREATE POLICY "select_own_company" ON clients
  FOR SELECT USING (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "insert_own_company" ON clients
  FOR INSERT WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "update_own_company" ON clients
  FOR UPDATE USING (company_id = (auth.jwt()->>'company_id')::uuid)
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "delete_own_company" ON clients
  FOR DELETE USING (company_id = (auth.jwt()->>'company_id')::uuid);
```

### Si Trigger Manquant

```sql
-- Appliquer le trigger universel
-- Exécuter: supabase/migrations/universal_company_trigger.sql
```

---

## 📊 Rapport Final

À la fin des tests, un rapport détaillé est généré :

```
═══════════════════════════════════════════════════════════
📊 RAPPORT FINAL - TESTS D'ISOLATION MULTI-TENANT
═══════════════════════════════════════════════════════════

Total de tests : 9
✅ Tests passés : 9
❌ Tests échoués : 0

🔒 NIVEAU DE SÉCURITÉ : EXCELLENT (100%)

═══════════════════════════════════════════════════════════
```

Si des vulnérabilités sont détectées :

```
🚨 VULNÉRABILITÉS DÉTECTÉES :

1. [CLIENT - Read Isolation] User B peut lire les clients de Company A
   → Vérifier RLS policies sur table clients
   
2. [RLS - Direct Query] Bypass possible sans filtres frontend
   → Activer RLS avec: ALTER TABLE clients ENABLE ROW LEVEL SECURITY

══════════════════════════════════════════════════════════
🔴 NIVEAU DE SÉCURITÉ : CRITIQUE
⚠️  NE PAS DÉPLOYER EN PRODUCTION AVANT CORRECTIONS
══════════════════════════════════════════════════════════
```

---

## 🎯 Checklist Avant Production

Avant de déployer en production, **tous** ces tests doivent passer :

- [ ] ✅ Tests Multi-tenant : 9/9 passés
- [ ] ✅ RLS activé sur toutes les tables métier
- [ ] ✅ Politiques RLS créées (SELECT, INSERT, UPDATE, DELETE)
- [ ] ✅ Trigger `enforce_company_id` appliqué
- [ ] ✅ Aucune fuite de données détectée
- [ ] ✅ Tests d'exploitation bloqués

---

## 📚 Ressources

### Fichiers Pertinents

- **Tests** : `tests/multi-tenant-isolation.test.ts`
- **Config Vitest** : `vitest.config.ts`
- **Guide Test** : `GUIDE-TESTS-ISOLATION.md` (ancien)
- **Migration RLS** : `supabase/migrations/ACTIVER-RLS-TOUTES-TABLES-URGENT.sql`
- **Trigger Universel** : `supabase/migrations/universal_company_trigger.sql`
- **Audit SQL** : `supabase/migrations/audit_multi_tenant.sql`

### Documentation Externe

- [Vitest Documentation](https://vitest.dev/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## 🆘 Support

En cas de problème :

1. **Vérifier les logs** : Les tests loguent chaque étape
2. **Mode verbose** : `npm run test -- --reporter=verbose`
3. **Isoler un test** : `npm run test -- -t "CLIENT - Read Isolation"`
4. **Consulter** : `GUIDE-AUDIT-SQL.md` pour diagnostic SQL

---

**Dernière mise à jour** : 25 janvier 2026  
**Version** : 1.0.0  
**Status** : ⏳ Configuration en cours
