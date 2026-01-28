# 🧪 GUIDE DES TESTS D'ISOLATION MULTI-TENANT

## 🎯 Vue d'ensemble

Les tests d'isolation valident que la sécurité multi-tenant fonctionne correctement à tous les niveaux:
- ✅ RLS (Row Level Security)
- ✅ Triggers (force company_id)
- ✅ Policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Protection contre les exploits

---

## 🚀 INSTALLATION

### 1. Installer les Dépendances

```bash
npm install --save-dev vitest @supabase/supabase-js
```

### 2. Ajouter le Script dans package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:isolation": "vitest tests/multi-tenant-isolation.test.ts",
    "test:isolation:watch": "vitest tests/multi-tenant-isolation.test.ts --watch"
  }
}
```

### 3. Configurer les Variables d'Environnement

Créer `.env.test` (ou utiliser `.env`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## ▶️ EXÉCUTION DES TESTS

### Exécuter Tous les Tests

```bash
npm run test:isolation
```

### Watch Mode (ré-exécution automatique)

```bash
npm run test:isolation:watch
```

### Exécuter un Groupe de Tests Spécifique

```bash
# Tests clients uniquement
npm run test:isolation -- -t "CLIENTS"

# Tests projets uniquement
npm run test:isolation -- -t "PROJECTS"
```

---

## 📊 CE QUE LES TESTS VALIDENT

### Pour Chaque Section Métier (Clients, Projects, Invoices, Quotes)

#### TEST 1: Isolation en Lecture (SELECT)
```typescript
// User A crée des données
const { data } = await companyA.supabase.from("clients").insert(...);

// User B essaie de les lire
const { data: leaked } = await companyB.supabase
  .from("clients")
  .select("*")
  .eq("id", data.id);

// ✅ DOIT ÉCHOUER: leaked doit être vide
expect(leaked).toHaveLength(0);
```

**Validation:** RLS bloque l'accès aux données d'autres entreprises.

---

#### TEST 2: Isolation en Écriture (INSERT)
```typescript
// User B essaie de créer des données avec company_id de A
const { data } = await companyB.supabase
  .from("clients")
  .insert({
    name: "Hacker Client",
    company_id: companyA.id // ← Tentative malveillante
  })
  .select()
  .single();

// ✅ DOIT RÉUSSIR MAIS: data.company_id doit être companyB.id
expect(data.company_id).toBe(companyB.id);
```

**Validation:** Le trigger force toujours `company_id` depuis le JWT.

---

#### TEST 3: Isolation en Modification (UPDATE)
```typescript
// User B essaie de modifier des données de A
const { data } = await companyB.supabase
  .from("clients")
  .update({ name: "Modified by B" })
  .eq("id", clientIdA)
  .select();

// ✅ DOIT ÉCHOUER: data doit être vide
expect(data).toHaveLength(0);
```

**Validation:** RLS empêche la modification des données d'autres entreprises.

---

#### TEST 4: Isolation en Suppression (DELETE)
```typescript
// User B essaie de supprimer des données de A
const { data } = await companyB.supabase
  .from("clients")
  .delete()
  .eq("id", clientIdA)
  .select();

// ✅ DOIT ÉCHOUER: data doit être vide
expect(data).toHaveLength(0);

// Vérifier que les données existent toujours
const { data: still_exists } = await companyA.supabase
  .from("clients")
  .select("*")
  .eq("id", clientIdA)
  .single();

expect(still_exists).toBeTruthy();
```

**Validation:** RLS empêche la suppression des données d'autres entreprises.

---

#### TEST 5: RLS Sans Filtre Frontend
```typescript
// Requête SANS filtre explicite company_id
const { data } = await companyB.supabase
  .from("clients")
  .select("*"); // Pas de .eq("company_id", ...)

// ✅ RLS doit retourner UNIQUEMENT les données de B
const allBelongToB = data.every(client => client.company_id === companyB.id);
expect(allBelongToB).toBe(true);
```

**Validation:** RLS fonctionne même sans filtres frontend (double protection).

---

### Tests Bonus: Tentatives d'Exploitation

#### Exploit 1: Bypass du Trigger avec UPDATE
```typescript
// Créer un client dans B
const { data: clientB } = await companyB.supabase
  .from("clients")
  .insert({ name: "Client B" })
  .select()
  .single();

// Essayer de changer company_id vers A après création
const { data: updated } = await companyB.supabase
  .from("clients")
  .update({ company_id: companyA.id })
  .eq("id", clientB.id)
  .select()
  .single();

// ✅ DOIT ÉCHOUER: company_id reste companyB.id
expect(updated.company_id).toBe(companyB.id);
```

**Validation:** Impossible de modifier `company_id` après création.

---

#### Exploit 2: Injection SQL
```typescript
// Tentative d'injection SQL via company_id
try {
  await companyB.supabase.from("clients").insert({
    name: "SQL Injection",
    company_id: "'; DROP TABLE clients; --" as any
  });
} catch (error) {
  // ✅ Erreur attendue (UUID invalide)
}
```

**Validation:** Protection contre les injections SQL.

---

#### Exploit 3: Accès Direct avec ID Deviné
```typescript
// User A crée un client
const { data: clientA } = await companyA.supabase
  .from("clients")
  .insert({ name: "Secret Client" })
  .select()
  .single();

// User B essaie d'accéder avec l'ID exact
const { data: accessed } = await companyB.supabase
  .from("clients")
  .select("*")
  .eq("id", clientA.id)
  .single();

// ✅ DOIT ÉCHOUER: accessed doit être null
expect(accessed).toBeNull();
```

**Validation:** RLS bloque l'accès même avec un ID exact.

---

## 📊 RAPPORT FINAL

À la fin des tests, un rapport détaillé est affiché:

```
═══════════════════════════════════════════════════════════════
📊 RAPPORT FINAL DES TESTS D'ISOLATION
═══════════════════════════════════════════════════════════════

Tests exécutés: 28
✅ Passés: 28
❌ Échoués: 0

🎉 Aucune vulnérabilité détectée! L'isolation fonctionne parfaitement.

═══════════════════════════════════════════════════════════════
```

Si des vulnérabilités sont détectées:

```
⚠️  VULNÉRABILITÉS DÉTECTÉES:

1. [Clients] Isolation en lecture
   Erreur: User B peut lire les clients de A

2. [Projects] Isolation en suppression
   Erreur: User B peut supprimer les projets de A
```

---

## 🔍 INTERPRÉTER LES RÉSULTATS

### ✅ Tous les Tests Passent

**Signification:** L'isolation multi-tenant fonctionne parfaitement.

**Actions:**
- ✅ Déployer en production en toute confiance
- ✅ Documenter la configuration actuelle
- ✅ Exécuter les tests régulièrement (CI/CD)

---

### ❌ Tests d'Isolation en Lecture Échouent

**Cause possible:**
- RLS désactivé sur la table
- Policies RLS mal configurées
- JWT ne contient pas company_id

**Solution:**
1. Vérifier que RLS est activé:
   ```sql
   SELECT * FROM public.check_table_isolation('clients');
   ```

2. Exécuter l'audit:
   ```sql
   -- Voir supabase/migrations/audit_multi_tenant.sql
   ```

3. Appliquer les policies:
   ```sql
   CREATE POLICY "select_own_company" ON clients
     FOR SELECT USING (company_id = (auth.jwt()->>'company_id')::uuid);
   ```

---

### ❌ Tests d'Isolation en Écriture Échouent

**Cause possible:**
- Trigger `enforce_company_id` manquant ou désactivé
- Fonction trigger mal configurée

**Solution:**
1. Vérifier le trigger:
   ```sql
   SELECT * FROM public.check_company_triggers();
   ```

2. Réappliquer le trigger:
   ```sql
   SELECT public.apply_company_trigger('clients');
   ```

3. Voir le guide complet:
   ```
   GUIDE-TRIGGER-UNIVERSEL.md
   ```

---

### ❌ Tests RLS Sans Filtre Échouent

**Cause possible:**
- Les policies RLS ne fonctionnent pas
- Le frontend contourne RLS (ne devrait jamais arriver)

**Solution:**
1. Désactiver temporairement les filtres frontend
2. Tester directement avec SQL Editor
3. Vérifier les policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'clients';
   ```

---

## 🛠️ MAINTENANCE DES TESTS

### Ajouter une Nouvelle Section

Pour tester une nouvelle table (ex: `employees`):

```typescript
describe('👥 ISOLATION - EMPLOYEES', () => {
  let employeeIdA: string;

  it('Setup: User A crée un employé', async () => {
    const { data } = await companyA.supabase
      .from('employees')
      .insert({ name: 'Employee Test A' })
      .select()
      .single();

    employeeIdA = data!.id;
    recordTest('Employees', 'Setup', true);
  });

  // Tests 1-5: Copier/coller le pattern des autres sections
  // et remplacer 'clients' par 'employees'
});
```

---

### Modifier les Données de Test

```typescript
// Dans beforeAll()
companyA = await createTestCompany(
  'Custom Company A', // ← Changer le nom
  `custom-a-${Date.now()}@test.com`,
  'CustomPassword123!'
);
```

---

### Ajouter des Tests d'Exploitation

```typescript
describe('🔓 TESTS D\'EXPLOITATION', () => {
  it('Tentative 4: Mon nouvel exploit', async () => {
    // Code de test
    
    const passed = /* condition */;
    recordTest('Exploitation', 'Mon nouvel exploit', passed);
  });
});
```

---

## 🎯 BONNES PRATIQUES

### 1. Exécuter les Tests Régulièrement

```bash
# Dans votre CI/CD
npm run test:isolation
```

### 2. Tester Après Chaque Migration

```bash
# Après une migration SQL
npm run test:isolation

# Si échec, investiguer immédiatement
```

### 3. Nettoyer les Données de Test

Les tests nettoient automatiquement avec `afterAll()`, mais si interrompu:

```sql
-- Nettoyer manuellement
DELETE FROM clients WHERE email LIKE '%@test.com';
DELETE FROM companies WHERE name LIKE 'Test Company%';
```

### 4. Isoler les Tests

```typescript
// Utiliser des IDs uniques pour éviter les conflits
const timestamp = Date.now();
const email = `test-${timestamp}@test.com`;
```

---

## ⚠️ AVERTISSEMENTS

### ❌ NE PAS exécuter sur Production

Les tests créent et suppriment des données. Toujours exécuter sur:
- ✅ Environnement de développement local
- ✅ Environnement de staging
- ❌ JAMAIS sur production

### ❌ NE PAS commettre les credentials

Ne jamais commit `.env.test` avec de vraies credentials.

```gitignore
# .gitignore
.env.test
.env.local
```

### ✅ Utiliser des Comptes de Test

Créer des comptes dédiés pour les tests:
- `test-admin@myapp.com`
- `test-user-a@myapp.com`
- `test-user-b@myapp.com`

---

## 📋 CHECKLIST COMPLÈTE

### Avant d'Exécuter les Tests
- [ ] Installer les dépendances (`npm install`)
- [ ] Configurer `.env.test` avec les bonnes credentials
- [ ] Vérifier que Supabase est accessible
- [ ] Utiliser un environnement de développement (pas production!)

### Après les Tests
- [ ] Lire le rapport final attentivement
- [ ] Si échecs, investiguer immédiatement
- [ ] Documenter les vulnérabilités trouvées
- [ ] Corriger et ré-exécuter

### Maintenance Régulière
- [ ] Exécuter les tests après chaque migration SQL
- [ ] Exécuter les tests avant chaque déploiement
- [ ] Mettre à jour les tests si nouveaux cas d'usage
- [ ] Monitorer les résultats dans CI/CD

---

## 🎉 RÉSULTAT ATTENDU

Avec une configuration correcte:

```
✅ 28/28 tests passés
🎉 Aucune vulnérabilité détectée
🔒 Isolation multi-tenant parfaite
```

---

**Créé le:** 2026-01-23  
**Version:** 1.0  
**Statut:** Production-ready
