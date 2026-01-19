# 🏢 Guide de Migration Multi-Tenant (SaaS)

## 📋 Cause racine du problème

**Problème actuel :** Un client créé voit toutes les données de l'admin/test (paiements, clients, devis, chantiers, etc.)

**Cause :** L'application n'isole pas les données par entreprise. Toutes les requêtes utilisent uniquement `user_id`, ce qui permet à un utilisateur de voir les données d'un autre utilisateur si les RLS policies ne sont pas strictes.

**Solution :** Passage en mode SaaS multi-tenant avec :
- Une table `companies` pour chaque entreprise
- Une table `company_users` pour lier users ↔ companies
- Un champ `company_id` sur **toutes** les tables métier
- RLS policies strictes basées sur `company_id`

## 🎯 Objectif

Chaque entreprise ne voit **que ses propres données**, même si un bug frontend essaie d'accéder à d'autres données.

## 📦 Livrables

### 1. Migration SQL complète
- **Fichier :** `supabase/migrations/20250127000001_complete_multi_tenant_migration.sql`
- **Contenu :**
  - ✅ Ajout de `company_id` nullable à toutes les tables métier
  - ✅ Backfill des données existantes (création d'entreprise par défaut)
  - ✅ Passage de `company_id` en NOT NULL
  - ✅ Ajout des FK + indexes
  - ✅ Création/update des RLS policies

### 2. Script de vérification
- **Fichier :** `supabase/VERIFICATION-POST-MIGRATION-MULTI-TENANT.sql`
- **Utilisation :** Exécuter après la migration pour vérifier que tout est correct

## 🚀 Étapes d'exécution

### Étape 1 : Vérifier les prérequis

Assurez-vous que les tables `companies` et `company_users` existent :
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'company_users');
```

Si elles n'existent pas, exécutez d'abord :
- `supabase/migrations/COMPLETE-SYSTEM-INVITATIONS-AND-CONTACT.sql`

### Étape 2 : Exécuter la migration

1. Ouvrir Supabase Dashboard → SQL Editor
2. Ouvrir le fichier : `supabase/migrations/20250127000001_complete_multi_tenant_migration.sql`
3. Copier tout le contenu
4. Coller dans l'éditeur SQL
5. Cliquer sur "Run"

**⚠️ IMPORTANT :** Cette migration est **safe** :
- N'efface aucune donnée
- Travaille sur des copies temporaires
- Peut être interrompue et relancée

### Étape 3 : Vérifier la migration

Exécuter le script de vérification :
```sql
-- Copier le contenu de VERIFICATION-POST-MIGRATION-MULTI-TENANT.sql
-- et l'exécuter dans SQL Editor
```

**Vérifications importantes :**
- ✅ Toutes les tables ont `company_id`
- ✅ Aucune ligne n'a `company_id = NULL`
- ✅ Toutes les RLS policies sont créées
- ✅ Chaque entreprise a ses propres données

### Étape 4 : Tester l'isolation

1. Connectez-vous avec un compte de test (entreprise A)
2. Créez un client, un devis, une facture
3. Connectez-vous avec un autre compte (entreprise B)
4. **Vérifiez** : L'entreprise B ne doit **pas** voir les données de l'entreprise A

## 🔧 Modifications Frontend Requises

### 1. Gestion de l'entreprise courante

**Fichier à créer/modifier :** `src/hooks/useAuth.tsx`

Ajouter la gestion de `currentCompanyId` :

```typescript
// Dans useAuth
const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

useEffect(() => {
  if (user) {
    // Récupérer la première company active
    supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCurrentCompanyId(data.company_id);
          // Stocker dans localStorage pour persistance
          localStorage.setItem('currentCompanyId', data.company_id);
        }
      });
  }
}, [user]);
```

### 2. Filtrer toutes les requêtes par `company_id`

**Exemple pour `useClients` :**

```typescript
// AVANT
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', user.id);

// APRÈS
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id', currentCompanyId); // RLS fait déjà le filtre, mais on peut l'ajouter pour performance
```

**Important :** Le RLS côté base fait déjà le filtre automatiquement, mais ajouter `.eq('company_id', currentCompanyId)` améliore les performances.

### 3. Créer des données avec `company_id`

**Exemple pour création de client :**

```typescript
// Dans useCreateClient
const { data, error } = await supabase
  .from('clients')
  .insert({
    user_id: user.id,
    company_id: currentCompanyId, // ⚠️ CRITIQUE
    name: clientData.name,
    email: clientData.email,
    // ...
  });
```

**RLS vérifiera automatiquement** que `currentCompanyId` appartient à l'utilisateur connecté.

### 4. Création automatique d'entreprise au premier login

**Modifier :** `src/pages/CompleteProfile.tsx` ou créer un hook

```typescript
// Après création du compte
const createDefaultCompany = async () => {
  // Créer l'entreprise
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: userSettings.company_name || `${user.email}'s Company`,
      owner_id: user.id,
    })
    .select()
    .single();

  if (!companyError && company) {
    // Ajouter l'utilisateur comme owner
    await supabase
      .from('company_users')
      .insert({
        company_id: company.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });
  }
};
```

## 📊 Tables concernées par la migration

### Tables principales (déjà partiellement migrées)
- ✅ `clients`
- ✅ `projects`
- ✅ `ai_quotes`

### Tables à migrer complètement
- 📋 `invoices` (factures)
- 📋 `payments` (paiements)
- 📋 `employees` (employés)
- 📋 `employee_assignments` (affectations)
- 📋 `events` (événements calendrier)
- 📋 `notifications` (notifications)
- 📋 `candidatures` (candidatures RH)
- 📋 `taches_rh` (tâches RH)
- 📋 `rh_activities` (activités RH)
- 📋 `employee_performances` (performances)
- 📋 `maintenance_reminders` (rappels)
- 📋 `image_analysis` (analyses images)
- 📋 `ai_conversations` (conversations IA)
- 📋 `email_queue` (file emails)
- 📋 `messages` (messagerie)
- 📋 `email_messages` (emails envoyés)

### Tables conditionnelles (si elles existent)
- 📋 `quote_lines` (lignes devis détaillés)
- 📋 `quote_sections` (sections devis détaillés)
- 📋 `quote_line_library` (bibliothèque lignes)
- 📋 `quote_section_library` (bibliothèque sections)
- 📋 `materials_price_catalog` (catalogue prix)

## 🔒 Sécurité RLS

Toutes les tables ont maintenant des policies RLS qui vérifient :

**SELECT / VIEW :**
```sql
company_id IN (SELECT company_id FROM public.current_company_ids())
```

**INSERT / CREATE :**
```sql
company_id IN (SELECT company_id FROM public.current_company_ids())
AND user_id = auth.uid()  -- Si la table a user_id
```

**UPDATE / MODIFY :**
```sql
-- USING (vérification lecture)
company_id IN (SELECT company_id FROM public.current_company_ids())
-- WITH CHECK (vérification écriture)
company_id IN (SELECT company_id FROM public.current_company_ids())
```

**DELETE :**
```sql
company_id IN (SELECT company_id FROM public.current_company_ids())
```

**⚠️ CRITIQUE :** Même si le frontend bugue et essaie d'accéder à `company_id` d'une autre entreprise, la base de données **refusera** automatiquement.

## ✅ Vérifications post-migration

1. **Aucune perte de données :**
   ```sql
   -- Compter avant/après (à faire manuellement avant migration)
   SELECT COUNT(*) FROM clients;  -- Doit être identique
   ```

2. **Isolation fonctionnelle :**
   - User A crée des données → User A les voit
   - User B connecté → User B ne voit **pas** les données de User A

3. **RLS actif :**
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND policyname LIKE '%Company members%';
   ```

4. **Pas de NULL restants :**
   ```sql
   SELECT 'clients' AS table, COUNT(*) AS nulls
   FROM clients WHERE company_id IS NULL
   UNION ALL
   SELECT 'projects', COUNT(*) FROM projects WHERE company_id IS NULL;
   -- Tous doivent être 0
   ```

## 🐛 Dépannage

### Problème : "company_id cannot be null"

**Cause :** Des lignes n'ont pas été backfillées.

**Solution :** Re-exécuter la fonction de backfill :
```sql
SELECT public.backfill_company_id_for_table('TABLE_NAME');
```

### Problème : "permission denied"

**Cause :** RLS policies trop strictes ou user pas membre de company.

**Solution :** Vérifier `company_users` :
```sql
SELECT * FROM company_users WHERE user_id = 'USER_ID';
```

### Problème : User ne voit aucune donnée

**Cause :** User n'a pas de company assignée.

**Solution :** Créer une company pour ce user :
```sql
-- Créer company
INSERT INTO companies (name, owner_id) 
VALUES ('Nom Entreprise', 'USER_ID') 
RETURNING id;

-- Ajouter user comme owner
INSERT INTO company_users (company_id, user_id, role, status)
VALUES ('COMPANY_ID', 'USER_ID', 'owner', 'active');
```

## 📝 Notes importantes

- ✅ **Aucune perte de données** : La migration est 100% safe
- ✅ **Pas de downtime** : Migration progressive
- ✅ **RLS actif** : Sécurité garantie côté base
- ⚠️ **Frontend à mettre à jour** : Voir section "Modifications Frontend"

## 🚀 Prochaines étapes

1. ✅ Exécuter la migration SQL
2. ⏳ Mettre à jour les hooks frontend pour utiliser `company_id`
3. ⏳ Ajouter la gestion de `currentCompanyId` dans `useAuth`
4. ⏳ Tester l'isolation avec 2 comptes différents
5. ⏳ Vérifier que les créations de données incluent `company_id`
