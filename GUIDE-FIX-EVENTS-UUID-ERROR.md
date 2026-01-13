# 🔥 Guide : Correction Erreur "invalid input syntax for type uuid: 'events'"

## 🎯 Problème Identifié

L'erreur `invalid input syntax for type uuid: "events"` se produit lorsque :
1. La chaîne "events" est passée comme valeur UUID à une colonne UUID
2. Il y a confusion entre `id` (UUID Supabase) et `google_event_id` (string Google Calendar)
3. `company_id` ou `user_id` reçoit une valeur invalide

---

## ✅ Corrections Appliquées

### 1. Script SQL de Nettoyage et Validation

**Fichier** : `supabase/FIX-EVENTS-UUID-ERROR.sql`

- ✅ Supprime les données corrompues (company_id = "events")
- ✅ Vérifie/ajoute les colonnes `google_event_id`, `synced_with_google`, `google_sync_error`
- ✅ Crée une fonction `is_valid_uuid_strict()` qui bloque "events"
- ✅ Crée un trigger de validation avant INSERT/UPDATE
- ✅ Sépare clairement `id` (UUID) et `google_event_id` (TEXT)

### 2. Validations Frontend Renforcées

**Fichier** : `src/hooks/useEvents.ts`

- ✅ Validation stricte de `currentCompanyId` avant chaque requête
- ✅ Validation de tous les UUID avant insertion/mise à jour
- ✅ Messages d'erreur explicites

---

## 🚀 Actions Requises

### Étape 1 : Exécuter le Script SQL

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Ouvrez** le fichier : `supabase/FIX-EVENTS-UUID-ERROR.sql`
3. **Copiez** tout le contenu
4. **Collez** dans l'éditeur SQL
5. **Cliquez sur** "Run"

### Étape 2 : Vérifier les Données

Après l'exécution du script, vérifiez qu'il n'y a plus de données corrompues :

```sql
-- Vérifier les événements avec company_id invalide
SELECT COUNT(*) 
FROM public.events 
WHERE company_id::text = 'events'
   OR user_id::text = 'events'
   OR NOT (company_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
```

Le résultat doit être `0`.

### Étape 3 : Vérifier la Structure

Vérifiez que toutes les colonnes existent :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position;
```

Vous devriez voir :
- `id` : uuid
- `user_id` : uuid
- `company_id` : uuid
- `google_event_id` : text (⚠️ TEXT, pas UUID)
- `synced_with_google` : boolean
- `google_sync_error` : text

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

---

## ❌ Erreurs Courantes

### Erreur : "company_id invalide: 'events'"

**Cause** : `currentCompanyId` contient "events" au lieu d'un UUID.

**Solution** :
1. Vérifiez que `useAuth()` retourne un `currentCompanyId` valide
2. Vérifiez que l'utilisateur est bien associé à une entreprise dans `company_users`
3. Exécutez le script SQL de nettoyage

### Erreur : "user_id invalide: 'events'"

**Cause** : `user.id` contient "events" au lieu d'un UUID.

**Solution** :
1. Vérifiez que l'utilisateur est bien authentifié
2. Vérifiez que `supabase.auth.getUser()` retourne un utilisateur valide
3. Exécutez le script SQL de nettoyage

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
- [ ] Colonnes `google_event_id`, `synced_with_google`, `google_sync_error` existent
- [ ] Trigger de validation créé
- [ ] Fonction `is_valid_uuid_strict()` créée
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
- ✅ Validation stricte de tous les UUID
- ✅ Événements Google Calendar correctement synchronisés et affichés
