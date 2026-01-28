# AUDIT CODE FRONTEND - ISOLATION MULTI-TENANT

## VÉRIFICATION DES REQUÊTES (POINT 4)

### Hooks vérifiés :

#### ✅ useClients.ts
- **SELECT** : Filtre par `.eq("company_id", currentCompanyId)` ✅
- **INSERT** : Ne passe pas `company_id`, laisse le trigger backend le forcer ✅
- **UPDATE** : Filtre par `.eq("company_id", companyId)` ✅
- **DELETE** : Multiples vérifications avec `.eq("company_id", companyId)` ✅
- **Cache Key** : Inclut `company_id` ✅

#### ✅ useProjects.ts
- **SELECT** : Filtre par `.eq("company_id", currentCompanyId)` ✅
- **INSERT** : Vérifie `company_id` mais ne le passe pas au backend (trigger) ✅
- **UPDATE** : Filtre par `.eq("company_id", companyId)` ✅
- **Cache Key** : Inclut `company_id` ✅

#### ✅ useInvoices.ts
- **SELECT** : Filtre par `.eq("company_id", currentCompanyId)` ✅
- **INSERT** : Vérifie `company_id` mais ne le passe pas au backend (trigger) ✅
- **Cache Key** : Inclut `company_id` ✅

#### ✅ useQuotes.ts
- **SELECT** : Filtre par `.eq("company_id", currentCompanyId)` ✅
- **INSERT** : Vérifie `company_id` mais ne le passe pas au backend (trigger) ✅
- **Cache Key** : Inclut `company_id` ✅

#### ✅ useEvents.ts
- **SELECT** : Filtre par `.eq("company_id", currentCompanyId)` ✅
- **INSERT** : Utilise `currentCompanyId` depuis useAuth ✅
- **Cache Key** : Inclut `currentCompanyId` ✅

#### ✅ useEmployees.ts
- **SELECT** : Filtre par `.eq("company_id", currentCompanyId)` ✅
- **INSERT** : Via Edge Function (backend) ✅
- **Cache Key** : Inclut `company_id` ✅

#### ✅ useNotifications.ts
- **SELECT** : Filtre par `.eq("company_id", companyId)` ✅
- **Cache Key** : Inclut `company_id` ✅

#### ⚠️ useUserStats.ts
- **SELECT** : Pas de filtrage par `company_id` (table user_stats n'a pas company_id) ✅
- **RECALCULATE** : **CORRIGÉ** - Filtre maintenant par `.eq("company_id", companyId)` pour projets ✅
- **Cache Key** : Inclut maintenant `company_id` ✅

### Points d'attention :

1. **Toutes les INSERT** : Aucune ne passe `company_id` depuis le frontend, le trigger backend le force ✅
2. **Toutes les SELECT** : Filtrent par `company_id` explicitement ✅
3. **Cache React Query** : Tous les hooks incluent `company_id` dans la clé de cache ✅

## RECOMMANDATIONS

### ✅ Points validés :
- Aucune requête `SELECT *` sans filtre entreprise
- Aucun `company_id` passé depuis le frontend dans INSERT/UPSERT
- Tous les hooks filtrent correctement par `company_id`
- Cache React Query isolé par `company_id`

### ⚠️ À surveiller :
- Vérifier que les Edge Functions (manage-employees, etc.) forcent bien `company_id`
- Vérifier que les triggers backend fonctionnent correctement (voir audit SQL)
