# 🔥 Guide Complet : Correction Erreur UUID "events" - Version Définitive

## 🎯 Problème Identifié

L'erreur `invalid input syntax for type uuid: "events"` se produit lorsque :
1. La chaîne "events" est passée comme valeur UUID à une colonne UUID
2. La fonction `current_company_id()` pourrait retourner "events" dans certains cas
3. Les RLS policies utilisent `current_company_id()` sans validation
4. Il y a confusion entre `id` (UUID Supabase) et `google_event_id` (string Google Calendar)

---

## ✅ Corrections Appliquées

### 1. Script SQL Complet de Correction

**Fichier** : `supabase/FIX-EVENTS-UUID-ERROR-COMPLETE.sql`

- ✅ Supprime les données corrompues (company_id = "events")
- ✅ Sécurise `current_company_id()` pour ne JAMAIS retourner "events"
- ✅ Crée une fonction `is_valid_uuid_strict()` qui bloque "events"
- ✅ Crée un trigger de validation avant INSERT/UPDATE
- ✅ Corrige les RLS policies avec validation stricte
- ✅ Vérifie/ajoute les colonnes Google Calendar
- ✅ Sépare clairement `id` (UUID) et `google_event_id` (TEXT)

### 2. Corrections Frontend

**Fichier** : `src/hooks/useEvents.ts`

- ✅ Validation stricte de `currentCompanyId` avant chaque requête
- ✅ Suppression des `.eq("company_id", ...)` redondants (RLS gère déjà)
- ✅ Validation de tous les UUID avant insertion/mise à jour
- ✅ Messages d'erreur explicites

---

## 🚀 Actions Requises

### Étape 1 : Exécuter le Script SQL (URGENT)

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Ouvrez** le fichier : `supabase/FIX-EVENTS-UUID-ERROR-COMPLETE.sql`
3. **Copiez** tout le contenu
4. **Collez** dans l'éditeur SQL
5. **Cliquez sur** "Run"

### Étape 2 : Vérifier les Données

Après l'exécution, vérifiez qu'il n'y a plus de données corrompues :

```sql
-- Vérifier les événements avec UUID invalides
SELECT COUNT(*) 
FROM public.events 
WHERE company_id::text = 'events'
   OR user_id::text = 'events'
   OR NOT (company_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
```

Le résultat doit être `0`.

### Étape 3 : Vérifier current_company_id()

Testez que la fonction ne retourne jamais "events" :

```sql
-- Tester current_company_id() pour votre utilisateur
SELECT public.current_company_id() as company_id,
       public.is_valid_uuid_strict(public.current_company_id()::TEXT) as is_valid;
```

Le résultat doit montrer un UUID valide et `is_valid = true`.

### Étape 4 : Vérifier les RLS Policies

Vérifiez que la nouvelle policy est active :

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events';
```

Vous devriez voir `Company users can manage events - ULTRA SECURE`.

---

## 🔍 Mapping Google Calendar ↔ Database

### Colonnes UUID (Supabase)
- `id` : UUID unique Supabase (généré automatiquement)
- `user_id` : UUID de l'utilisateur (auth.users)
- `company_id` : UUID de l'entreprise
- `project_id` : UUID du projet (optionnel)

### Colonnes Google Calendar
- `google_event_id` : **TEXT** (string de Google Calendar, ex: "abc123xyz")
- `synced_with_google` : boolean (true si synchronisé)
- `google_sync_error` : text (message d'erreur si sync échoue)

### ⚠️ IMPORTANT

**NE JAMAIS** utiliser `google_event_id` comme UUID !
- `google_event_id` est une **string** de Google Calendar
- `id` est l'UUID Supabase
- Les deux sont **différents** et ne doivent **jamais** être confondus

---

## 🔒 Sécurité Multi-Niveau

### Niveau 1 : Frontend
- Validation stricte de tous les UUID avant envoi
- Blocage explicite de "events", "calendar", etc.

### Niveau 2 : Trigger PostgreSQL
- Validation avant INSERT/UPDATE
- Blocage de toute valeur invalide

### Niveau 3 : RLS Policies
- Isolation par `company_id`
- Validation stricte de `current_company_id()`
- Fallback sécurisé si `current_company_id()` retourne NULL

---

## 🧪 Test de Validation

### Test 1 : Créer un événement

1. **Allez sur** : `/calendar`
2. **Créez** un nouvel événement
3. **Vérifiez** dans la console qu'il n'y a pas d'erreur UUID
4. **Vérifiez** dans Supabase que l'événement a bien un `company_id` UUID valide

### Test 2 : Synchroniser avec Google Calendar

1. **Créez** un événement
2. **Vérifiez** que `google_event_id` est bien une string (pas un UUID)
3. **Vérifiez** que `synced_with_google` passe à `true`

### Test 3 : Lire les événements

1. **Allez sur** : `/calendar`
2. **Vérifiez** que les événements s'affichent correctement
3. **Vérifiez** dans la console qu'il n'y a pas d'erreur UUID

### Test 4 : Vérifier current_company_id()

```sql
-- Tester que current_company_id() ne retourne jamais "events"
SELECT 
  auth.uid() as user_id,
  public.current_company_id() as company_id,
  public.is_valid_uuid_strict(public.current_company_id()::TEXT) as is_valid
FROM auth.users
WHERE id = auth.uid();
```

---

## ❌ Erreurs Courantes

### Erreur : "company_id invalide: 'events'"

**Cause** : `currentCompanyId` contient "events" au lieu d'un UUID.

**Solution** :
1. Vérifiez que `useAuth()` retourne un `currentCompanyId` valide
2. Vérifiez que l'utilisateur est bien associé à une entreprise dans `company_users`
3. Exécutez le script SQL de correction
4. Vérifiez que `current_company_id()` fonctionne correctement

### Erreur : "user_id invalide: 'events'"

**Cause** : `user.id` contient "events" au lieu d'un UUID.

**Solution** :
1. Vérifiez que l'utilisateur est bien authentifié
2. Vérifiez que `supabase.auth.getUser()` retourne un utilisateur valide
3. Exécutez le script SQL de correction

### Erreur : "RLS policy violation"

**Cause** : La RLS policy bloque l'accès car `current_company_id()` retourne NULL ou invalide.

**Solution** :
1. Vérifiez que l'utilisateur est bien dans `company_users`
2. Vérifiez que `company_id` dans `company_users` est un UUID valide
3. Exécutez le script SQL de correction qui ajoute un fallback

### Erreur : "google_event_id utilisé comme UUID"

**Cause** : Confusion entre `id` (UUID) et `google_event_id` (TEXT).

**Solution** :
1. Vérifiez que `google_event_id` est bien de type TEXT dans la DB
2. Ne jamais utiliser `google_event_id` dans une requête `.eq("id", ...)`
3. Utiliser `google_event_id` uniquement pour les requêtes Google Calendar

---

## 📊 Checklist de Vérification

- [ ] Script SQL exécuté avec succès
- [ ] Aucune donnée corrompue (company_id = "events")
- [ ] Fonction `current_company_id()` sécurisée
- [ ] Fonction `is_valid_uuid_strict()` créée
- [ ] Trigger de validation créé
- [ ] RLS policy "Company users can manage events - ULTRA SECURE" active
- [ ] Colonnes `google_event_id`, `synced_with_google`, `google_sync_error` existent
- [ ] Frontend déployé avec validations renforcées
- [ ] Test de création d'événement réussi
- [ ] Test de synchronisation Google Calendar réussi
- [ ] Test de lecture d'événements réussi
- [ ] Plus d'erreur "invalid input syntax for type uuid: 'events'"

---

## 🎯 Résultat Attendu

Après toutes ces étapes :
- ✅ Plus d'erreur "invalid input syntax for type uuid: 'events'"
- ✅ Séparation claire entre `id` (UUID) et `google_event_id` (TEXT)
- ✅ Validation stricte de tous les UUID (frontend + trigger + RLS)
- ✅ `current_company_id()` ne retourne jamais "events"
- ✅ Événements Google Calendar correctement synchronisés et affichés
- ✅ Sécurité triple niveau (frontend + trigger + RLS)

---

## 🔍 Debugging Avancé

### Vérifier les logs Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/postgres-logs
2. **Cherchez** les erreurs contenant "invalid input syntax for type uuid"
3. **Identifiez** la requête qui cause l'erreur

### Vérifier les RLS Policies

```sql
-- Voir toutes les policies sur events
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events';
```

### Vérifier les triggers

```sql
-- Voir tous les triggers sur events
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'events'
AND event_object_schema = 'public';
```

---

## 📚 Documentation

- **Script SQL** : `supabase/FIX-EVENTS-UUID-ERROR-COMPLETE.sql`
- **Guide** : `GUIDE-FIX-EVENTS-UUID-COMPLETE.md` (ce fichier)
- **Script précédent** : `supabase/FIX-EVENTS-UUID-ERROR.sql` (version simplifiée)
