# 🔒 Guide - Isolation Stricte Multi-Tenant

## 📋 Vue d'ensemble

Ce guide décrit l'implémentation de l'isolation stricte des données entre entreprises dans BTP Smart Pro. L'objectif est de garantir qu'une entreprise ne peut JAMAIS voir ou modifier les données d'une autre entreprise.

---

## 🏗️ Architecture

### Principe

- **Chaque utilisateur appartient à UNE SEULE entreprise** (via `company_users`)
- **Le `company_id` est forcé automatiquement** côté backend via triggers
- **Le frontend ne doit JAMAIS envoyer `company_id`**
- **Les policies RLS garantissent l'isolation** même en cas de bug frontend

### Flux de données

1. **Utilisateur se connecte** → Récupère son `company_id` depuis `company_users`
2. **Frontend fait une requête** → Ne passe PAS `company_id`
3. **Trigger BEFORE INSERT** → Force automatiquement `company_id` depuis `current_company_id()`
4. **RLS Policy** → Vérifie que `company_id` correspond avant INSERT/SELECT/UPDATE/DELETE

---

## 🗄️ Schéma de données

### Fonction Helper : `current_company_id()`

```sql
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
```

**Comportement :**
- Retourne le `company_id` de l'utilisateur connecté (`auth.uid()`)
- Récupère depuis `company_users` (premier si plusieurs)
- Utilisé dans toutes les policies RLS

### Tables avec `company_id` (toutes NOT NULL)

Les tables suivantes ont `company_id UUID NOT NULL` avec FK vers `companies(id)` :

- ✅ `clients`
- ✅ `projects`
- ✅ `ai_quotes`
- ✅ `invoices`
- ✅ `payments`
- ✅ `employees`
- ✅ `events`
- ✅ `notifications`
- ✅ `messages`
- ✅ `ai_conversations`
- ✅ `ai_messages`
- ✅ `candidatures`
- ✅ `taches_rh`
- ✅ `rh_activities`
- ✅ `employee_performances`
- ✅ `maintenance_reminders`
- ✅ `image_analysis`
- ✅ `employee_assignments`

### Index

Chaque table a un index sur `company_id` :
```sql
CREATE INDEX idx_<table>_company_id ON public.<table>(company_id);
```

---

## 🔐 Row Level Security (RLS)

### Policies strictes

Toutes les tables métier ont 4 policies RLS :

#### SELECT
```sql
USING (company_id = public.current_company_id())
```
→ L'utilisateur ne voit que les données de son entreprise

#### INSERT
```sql
WITH CHECK (company_id = public.current_company_id())
```
→ L'utilisateur ne peut créer que dans son entreprise

#### UPDATE
```sql
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id())
```
→ L'utilisateur ne peut modifier que les données de son entreprise

#### DELETE
```sql
USING (company_id = public.current_company_id())
```
→ L'utilisateur ne peut supprimer que les données de son entreprise

---

## ⚙️ Triggers automatiques

### Fonction : `force_company_id()`

```sql
CREATE OR REPLACE FUNCTION public.force_company_id()
RETURNS TRIGGER
```

**Comportement :**
- S'exécute **BEFORE INSERT** sur toutes les tables métier
- Récupère `company_id` depuis `current_company_id()`
- **Écrase** toute valeur de `company_id` envoyée par le frontend
- **Rejette** l'opération si l'utilisateur n'a pas de `company_id`

**Sécurité :**
- Même si le frontend envoie un `company_id` incorrect, il sera écrasé
- Impossible de créer des données pour une autre entreprise

---

## 💻 Frontend

### ⚠️ RÈGLE ABSOLUE

**Le frontend ne doit JAMAIS envoyer `company_id` dans les mutations.**

### Avant (❌ Incorrect)

```typescript
const insertData = {
  name: "Client ABC",
  company_id: companyId, // ❌ NE PAS ENVOYER
};
```

### Après (✅ Correct)

```typescript
const insertData = {
  name: "Client ABC",
  // company_id sera ajouté automatiquement par le trigger
};
```

### Hooks à modifier

Les hooks suivants doivent être modifiés pour retirer `company_id` :

- `useClients.ts` → `useCreateClient`
- `useProjects.ts` → `useCreateProject`
- `useInvoices.ts` → `useCreateInvoice`
- `useQuotes.ts` → `useCreateQuote`
- `useEvents.ts` → `useCreateEvent`
- Etc.

**Note :** Les triggers garantissent que `company_id` sera ajouté automatiquement, même si le frontend ne l'envoie pas.

---

## 🔄 Migration des données existantes

### Script de backfill

Avant de rendre `company_id` NOT NULL, il faut :

1. **Identifier les données sans `company_id`**
2. **Les rattacher à l'entreprise de leur créateur**
3. **Vérifier qu'il n'y a plus de `company_id` NULL**

### Exemple de backfill

```sql
-- Pour chaque ligne sans company_id, attribuer le company_id du user_id
UPDATE public.clients
SET company_id = (
  SELECT company_id 
  FROM public.company_users 
  WHERE user_id = clients.user_id 
  LIMIT 1
)
WHERE company_id IS NULL;
```

**Important :** Faire cela pour TOUTES les tables avant de rendre `company_id` NOT NULL.

---

## ✅ Vérification

### Script de vérification

Exécutez `supabase/VERIFY-STRICT-ISOLATION.sql` pour vérifier :

- ✅ Toutes les tables ont `company_id NOT NULL`
- ✅ Tous les index sont créés
- ✅ RLS est activé sur toutes les tables
- ✅ Les policies strictes sont en place
- ✅ Les triggers `force_company_id` sont créés
- ✅ Aucun `company_id` NULL dans les données

### Test manuel

1. **Créer deux entreprises de test** (A et B)
2. **Créer des données** pour chaque entreprise
3. **Vérifier** que l'entreprise A ne voit que ses données
4. **Vérifier** que l'entreprise B ne voit que ses données
5. **Tenter** de créer des données pour l'autre entreprise → Doit échouer

---

## 🛡️ Sécurité garantie

### Même en cas de bug frontend

- ✅ Les triggers forcent toujours le bon `company_id`
- ✅ Les policies RLS rejettent les requêtes invalides
- ✅ Impossible de contourner via l'API Supabase directe

### Architecture défensive

1. **Trigger** → Force `company_id` (première couche)
2. **RLS Policy** → Vérifie `company_id` (deuxième couche)
3. **Frontend** → N'envoie pas `company_id` (bonne pratique)

---

## 📝 Checklist de déploiement

- [ ] Exécuter la migration `20250128000001_STRICT_MULTI_TENANT_ISOLATION.sql`
- [ ] Vérifier avec `VERIFY-STRICT-ISOLATION.sql`
- [ ] Backfill des données existantes (si nécessaire)
- [ ] Modifier le frontend pour retirer `company_id` des insertions
- [ ] Tester l'isolation avec deux entreprises
- [ ] Vérifier qu'aucune donnée ne se mélange

---

**Dernière mise à jour :** Janvier 2025
