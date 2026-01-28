# 🛡️ GUIDE DU TRIGGER UNIVERSEL COMPANY_ID

## 🎯 Vue d'ensemble

Le trigger universel `enforce_company_id` est une **sécurité maximale** pour l'isolation multi-tenant. Il **force automatiquement** `company_id` depuis le JWT sur toutes les insertions, empêchant le frontend de définir cette valeur.

**Principe:** Le backend a TOUJOURS le dernier mot sur `company_id`. Jamais le frontend.

---

## 🔒 POURQUOI CE TRIGGER EST CRITIQUE

### ❌ SANS le Trigger

```typescript
// Frontend malveillant peut faire:
await supabase
  .from("clients")
  .insert({
    name: "Client",
    company_id: "UUID-D-UNE-AUTRE-ENTREPRISE" // ⚠️ DANGEREUX!
  });

// Le client sera créé dans l'entreprise de quelqu'un d'autre!
```

### ✅ AVEC le Trigger

```typescript
// Le frontend envoie:
await supabase
  .from("clients")
  .insert({
    name: "Client",
    company_id: "UUID-D-UNE-AUTRE-ENTREPRISE" // ← Ignoré!
  });

// Le trigger force:
// NEW.company_id = (auth.jwt()->>'company_id')::uuid
// Le client est créé dans la BONNE entreprise ✅
```

**Résultat:** Impossible de créer des données dans une autre entreprise, même avec un client malveillant.

---

## 🚀 INSTALLATION

### ÉTAPE 1: Exécuter le Script

1. **Ouvrir Supabase Dashboard**
2. **Aller dans SQL Editor**
3. **Copier/coller** `supabase/migrations/universal_company_trigger.sql`
4. **Cliquer sur "Run"**

### ÉTAPE 2: Vérifier l'Installation

```sql
-- Vérifier que tous les triggers sont appliqués
SELECT * FROM public.check_company_triggers();
```

**Résultat attendu:**
```
table_name  | has_company_id | has_trigger | trigger_status
------------|----------------|-------------|---------------
clients     | true           | true        | ✅ OK
projects    | true           | true        | ✅ OK
invoices    | true           | true        | ✅ OK
quotes      | true           | true        | ✅ OK
employees   | true           | true        | ✅ OK
events      | true           | true        | ✅ OK
```

---

## 🛠️ CE QUE LE SCRIPT FAIT

### 1. Crée la Fonction de Trigger

```sql
CREATE OR REPLACE FUNCTION public.enforce_company_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    jwt_company_id UUID;
BEGIN
    -- 1. Récupérer company_id du JWT
    jwt_company_id := (auth.jwt()->>'company_id')::uuid;
    
    -- 2. Vérifier qu'il existe
    IF jwt_company_id IS NULL THEN
        RAISE EXCEPTION 'company_id missing in JWT';
    END IF;
    
    -- 3. FORCER company_id (ignorer frontend)
    NEW.company_id := jwt_company_id;
    
    RETURN NEW;
END;
$$;
```

**Caractéristiques:**
- ✅ `SECURITY DEFINER` - Fonctionne même avec RLS
- ✅ Throw une erreur claire si JWT invalide
- ✅ Force TOUJOURS company_id depuis JWT
- ✅ Impossible à contourner

---

### 2. Applique Automatiquement à Toutes les Tables

Le script scanne toutes les tables avec `company_id` et applique le trigger:

```sql
-- Automatique pour:
clients
projects
invoices
quotes
employees
events
notifications
-- etc.
```

**Tables exclues:**
- `companies` (table racine)
- `company_users` (table de liaison)

---

### 3. Crée des Fonctions Utilitaires

#### A. Vérifier les Triggers
```sql
SELECT * FROM public.check_company_triggers();
```

#### B. Appliquer à une Nouvelle Table
```sql
SELECT public.apply_company_trigger('ma_nouvelle_table');
```

---

## 🎯 UTILISATION AU QUOTIDIEN

### Frontend: Créer un Client

```typescript
// ❌ NE PAS faire ça (mais même si vous le faites, c'est sûr!)
const { data } = await supabase
  .from("clients")
  .insert({
    name: "John Doe",
    email: "john@example.com",
    company_id: "WRONG-UUID" // ← Sera IGNORÉ par le trigger
  });

// ✅ FAIRE ça (propre)
const { data } = await supabase
  .from("clients")
  .insert({
    name: "John Doe",
    email: "john@example.com"
    // Pas de company_id! Le trigger le force automatiquement
  });

console.log(data.company_id); 
// → UUID du JWT de l'utilisateur connecté ✅
```

### Backend: Le Trigger en Action

```
1. Frontend envoie INSERT sans company_id
2. Trigger s'exécute BEFORE INSERT
3. Trigger récupère company_id depuis auth.jwt()
4. Trigger force NEW.company_id = jwt_company_id
5. INSERT s'exécute avec le BON company_id
```

---

## 🔍 TESTS ET VÉRIFICATIONS

### Test 1: Créer un Client

```typescript
// Se connecter avec User A (Company A)
const { data } = await supabase
  .from("clients")
  .insert({ name: "Test Client" })
  .select()
  .single();

console.log(data.company_id);
// → Doit être le company_id de Company A ✅
```

### Test 2: Vérifier l'Isolation

```typescript
// Se connecter avec User B (Company B)
const { data: allClients } = await supabase
  .from("clients")
  .select("*");

// allClients ne doit contenir QUE les clients de Company B
// Le client créé par User A ne doit PAS apparaître ✅
```

### Test 3: Tentative Malveillante

```typescript
// Essayer de créer un client dans une autre entreprise
const { data, error } = await supabase
  .from("clients")
  .insert({
    name: "Hacker Client",
    company_id: "OTHER-COMPANY-UUID" // Tentative malveillante
  })
  .select()
  .single();

// Le trigger IGNORE cette valeur
console.log(data.company_id);
// → company_id du JWT, PAS "OTHER-COMPANY-UUID" ✅
```

---

## 🛠️ MAINTENANCE

### Ajouter une Nouvelle Table

Quand vous créez une nouvelle table avec `company_id`:

```sql
-- 1. Créer la table
CREATE TABLE public.ma_nouvelle_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID, -- ← Colonne company_id
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Appliquer le trigger automatiquement
SELECT public.apply_company_trigger('ma_nouvelle_table');

-- Résultat: "✅ Trigger applied successfully to table ma_nouvelle_table"
```

### Vérifier Périodiquement

```sql
-- Vérifier que tous les triggers sont OK
SELECT * FROM public.check_company_triggers();

-- Si une table montre "❌ MISSING", réappliquer:
SELECT public.apply_company_trigger('nom_de_la_table');
```

### Réappliquer Tous les Triggers

Si vous modifiez la fonction `enforce_company_id()`:

```sql
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'company_id'
          AND table_schema = 'public'
          AND table_name NOT IN ('companies', 'company_users')
    LOOP
        PERFORM public.apply_company_trigger(table_record.table_name);
        RAISE NOTICE 'Trigger réappliqué: %', table_record.table_name;
    END LOOP;
END $$;
```

---

## ⚠️ DÉPANNAGE

### Erreur: "company_id missing in JWT token"

**Cause:** L'utilisateur n'appartient à aucune entreprise.

**Solution:**
```sql
-- Ajouter l'utilisateur à une entreprise
INSERT INTO public.company_users (user_id, company_id, role, status)
VALUES ('USER-UUID', 'COMPANY-UUID', 'member', 'active');
```

### Erreur: "permission denied for function enforce_company_id"

**Cause:** Problème de permissions.

**Solution:**
```sql
-- Réappliquer les permissions
GRANT EXECUTE ON FUNCTION public.enforce_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_company_id() TO anon;
```

### Le Trigger ne S'Applique Pas

**Cause:** Table créée après l'exécution du script.

**Solution:**
```sql
SELECT public.apply_company_trigger('nom_de_la_table');
```

---

## 🎯 STRATÉGIE DE SÉCURITÉ COMPLÈTE

### Couches de Sécurité

```
┌─────────────────────────────────────────────────────┐
│  1. TRIGGER (Backend Force)                         │
│  ✅ company_id FORCÉ depuis JWT                     │
│  ✅ Impossible de contourner                        │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  2. RLS POLICIES (Backend Filter)                   │
│  ✅ Filtre les SELECT par company_id                │
│  ✅ Empêche UPDATE/DELETE autres entreprises        │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  3. FRONTEND VALIDATION (Double Check)              │
│  ✅ validateDataIsolation()                         │
│  ✅ Log si RLS échoue                               │
└─────────────────────────────────────────────────────┘
```

**Avec ces 3 couches:**
- ✅ Impossible de créer des données dans une autre entreprise
- ✅ Impossible de lire les données d'une autre entreprise
- ✅ Impossible de modifier/supprimer les données d'une autre entreprise

---

## 📊 COMPARAISON AVANT/APRÈS

### ❌ AVANT le Trigger

```typescript
// Vulnérabilité potentielle
await supabase.from("clients").insert({
  name: "Client",
  company_id: companyId // ← Valeur du frontend (non sûr!)
});

// Problèmes:
// - Le frontend peut se tromper
// - Un bug frontend peut créer des données dans la mauvaise entreprise
// - Un client malveillant peut forcer company_id
```

### ✅ APRÈS le Trigger

```typescript
// Sécurité maximale
await supabase.from("clients").insert({
  name: "Client"
  // Pas de company_id! Le trigger le force depuis JWT ✅
});

// Avantages:
// - Le backend a toujours le dernier mot
// - Impossible de créer dans la mauvaise entreprise
// - Même un client malveillant est bloqué
```

---

## 🎯 CHECKLIST COMPLÈTE

### Installation
- [ ] Exécuter `universal_company_trigger.sql`
- [ ] Vérifier avec `SELECT * FROM public.check_company_triggers();`
- [ ] Toutes les tables doivent avoir `✅ OK`

### Frontend
- [ ] Supprimer tous les `company_id` passés explicitement
- [ ] Le trigger force automatiquement la valeur
- [ ] Tester la création d'enregistrements

### Tests
- [ ] Créer un client dans Company A
- [ ] Vérifier que `company_id` = Company A
- [ ] Se connecter dans Company B
- [ ] Vérifier que le client de A n'apparaît PAS

### Maintenance
- [ ] Nouvelle table? → `apply_company_trigger()`
- [ ] Vérifier périodiquement avec `check_company_triggers()`

---

## 🎉 RÉSULTAT FINAL

Avec le trigger universel en place:

**SÉCURITÉ MAXIMALE:**
- ✅ `company_id` TOUJOURS forcé depuis JWT
- ✅ Frontend NE PEUT JAMAIS modifier `company_id`
- ✅ Même un client malveillant est bloqué
- ✅ Erreur claire si JWT invalide

**SIMPLICITÉ:**
- ✅ Appliqué automatiquement à toutes les tables
- ✅ Nouvelles tables: 1 commande SQL
- ✅ Pas de code à changer dans le frontend

**MAINTENABILITÉ:**
- ✅ Une seule fonction pour tout
- ✅ Modifications centralisées
- ✅ Facile à tester et vérifier

---

**🛡️ Le trigger universel est la fondation de votre sécurité multi-tenant !**

---

**Créé le:** 2026-01-23  
**Version:** 1.0  
**Statut:** Production-ready
