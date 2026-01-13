# 🔒 Guide : Correction Anti-Doublons Google Calendar

## 🎯 Problème Résolu

**Avant** : Quand vous modifiez un événement dans Google Calendar, l'app créait un NOUVEL événement au lieu de modifier l'existant.

**Après** : La modification dans Google Calendar met à jour l'événement existant (pas de doublon).

---

## ✅ Corrections Appliquées

### 1. **Clé Composite Unique**
- **Contrainte** : `UNIQUE (google_calendar_id, google_event_id)`
- **Effet** : Empêche les doublons au niveau base de données
- **Fichier** : `supabase/FIX-GOOGLE-CALENDAR-ANTI-DOUBLONS.sql`

### 2. **UPSERT au lieu de INSERT/UPDATE**
- **Avant** : Recherche manuelle → INSERT ou UPDATE séparés
- **Après** : `upsert()` avec `onConflict` sur la clé composite
- **Effet** : PostgreSQL gère automatiquement l'UPDATE si existe, INSERT sinon
- **Fichier** : `supabase/functions/google-calendar-sync-incremental/index.ts`

### 3. **Colonnes Ajoutées**
- `google_calendar_id` : ID du calendrier Google (obligatoire pour clé composite)
- `google_updated_at` : Timestamp de modification Google (pour résoudre conflits)
- `last_update_source` : 'app' ou 'google' (anti-loop)
- `deleted_at` : Soft delete pour événements supprimés dans Google

### 4. **Soft Delete**
- Les événements supprimés dans Google Calendar sont marqués `deleted_at` au lieu d'être supprimés
- Permet de garder l'historique et de restaurer si besoin

---

## 🚀 Déploiement

### Étape 1 : Exécuter la Migration SQL

```sql
-- Exécutez dans Supabase SQL Editor
-- Fichier: supabase/FIX-GOOGLE-CALENDAR-ANTI-DOUBLONS.sql
```

**Ce script** :
- ✅ Ajoute toutes les colonnes manquantes
- ✅ Crée la contrainte UNIQUE `(google_calendar_id, google_event_id)`
- ✅ Nettoie les doublons existants
- ✅ Crée les index nécessaires

### Étape 2 : Redéployer les Edge Functions

```bash
cd supabase/

# Redéployer les fonctions modifiées
supabase functions deploy google-calendar-sync-incremental
supabase functions deploy google-calendar-sync-processor
supabase functions deploy google-calendar-webhook
supabase functions deploy google-calendar-sync-changes
```

### Étape 3 : Mettre à jour les événements existants

Si vous avez des événements existants avec `google_event_id` mais sans `google_calendar_id`, exécutez :

```sql
-- Mettre à jour les événements existants avec google_calendar_id
UPDATE public.events e
SET google_calendar_id = (
  SELECT gcc.calendar_id
  FROM public.google_calendar_connections gcc
  WHERE gcc.company_id = e.company_id
  AND gcc.enabled = true
  LIMIT 1
)
WHERE e.google_event_id IS NOT NULL
AND e.google_calendar_id IS NULL;
```

---

## 🧪 Tests

### Test 1 : Modifier un événement dans Google Calendar

1. **Créer** un événement dans l'app
2. **Vérifier** qu'il apparaît dans Google Calendar
3. **Modifier le titre** dans Google Calendar
4. **Attendre** la synchronisation (max 15 minutes ou déclencher manuellement)
5. **Vérifier** que l'événement dans l'app a changé de titre
6. **Vérifier** qu'il n'y a **PAS** de nouvel événement créé

### Test 2 : Supprimer un événement dans Google Calendar

1. **Créer** un événement dans l'app
2. **Supprimer** l'événement dans Google Calendar
3. **Attendre** la synchronisation
4. **Vérifier** que `events.deleted_at` est rempli dans l'app
5. **Vérifier** que l'événement n'apparaît plus dans le calendrier

### Test 3 : Modifier un événement dans l'app

1. **Créer** un événement dans l'app
2. **Modifier** le titre dans l'app
3. **Vérifier** que la modification apparaît dans Google Calendar
4. **Vérifier** que `events.last_update_source = 'app'`

---

## 🔍 Vérification

### Vérifier les doublons

```sql
-- Compter les doublons (devrait être 0)
SELECT 
  google_calendar_id, 
  google_event_id, 
  COUNT(*) as count
FROM public.events
WHERE google_calendar_id IS NOT NULL
AND google_event_id IS NOT NULL
GROUP BY google_calendar_id, google_event_id
HAVING COUNT(*) > 1;
```

### Vérifier la contrainte UNIQUE

```sql
-- Vérifier que la contrainte existe
SELECT 
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.events'::regclass
AND conname = 'events_google_calendar_event_unique';
```

### Vérifier les colonnes

```sql
-- Vérifier que toutes les colonnes existent
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
AND column_name IN (
  'google_calendar_id',
  'google_event_id',
  'google_updated_at',
  'last_update_source',
  'deleted_at',
  'last_synced_at'
)
ORDER BY column_name;
```

---

## 📊 Logs de Debugging

Les Edge Functions loggent maintenant :
- ✅ `Événement trouvé par google_event_id`
- ✅ `Événement mis à jour (UPSERT)`
- ✅ `Nouvel événement créé (UPSERT)`
- ✅ `Événement supprimé (soft delete)`

Consultez les logs dans Supabase Dashboard → Edge Functions → Logs.

---

## ⚠️ Points Importants

1. **Clé Composite** : Toujours utiliser `(google_calendar_id, google_event_id)` ensemble
2. **UPSERT** : Utiliser `upsert()` avec `onConflict` au lieu de INSERT/UPDATE séparés
3. **Anti-Loop** : Toujours mettre `last_update_source = 'google'` lors des syncs depuis Google
4. **Soft Delete** : Utiliser `deleted_at` au lieu de DELETE réel
5. **Sync Token** : Toujours sauvegarder `sync_token` pour sync incrémentale

---

## 🐛 Dépannage

### Les doublons persistent

1. Vérifiez que la contrainte UNIQUE existe :
   ```sql
   SELECT * FROM pg_constraint 
   WHERE conname = 'events_google_calendar_event_unique';
   ```

2. Vérifiez que `google_calendar_id` est rempli :
   ```sql
   SELECT COUNT(*) FROM events 
   WHERE google_event_id IS NOT NULL 
   AND google_calendar_id IS NULL;
   ```

3. Exécutez le nettoyage manuel :
   ```sql
   -- Supprimer les doublons (garder le plus récent)
   DELETE FROM public.events e1
   USING (
     SELECT google_calendar_id, google_event_id, MAX(updated_at) as max_updated_at
     FROM public.events
     WHERE google_calendar_id IS NOT NULL
     AND google_event_id IS NOT NULL
     GROUP BY google_calendar_id, google_event_id
     HAVING COUNT(*) > 1
   ) duplicates
   WHERE e1.google_calendar_id = duplicates.google_calendar_id
   AND e1.google_event_id = duplicates.google_event_id
   AND e1.updated_at < duplicates.max_updated_at;
   ```

### Les modifications Google ne se reflètent pas

1. Vérifiez que les webhooks sont actifs :
   ```sql
   SELECT * FROM google_calendar_webhooks 
   WHERE enabled = true 
   AND expiration_timestamp > EXTRACT(EPOCH FROM now())::BIGINT * 1000;
   ```

2. Vérifiez que `last_update_source` est bien 'google' :
   ```sql
   SELECT * FROM events 
   WHERE last_update_source = 'google' 
   ORDER BY last_synced_at DESC 
   LIMIT 10;
   ```

3. Déclenchez manuellement la sync :
   ```bash
   curl -X POST https://votre-projet.supabase.co/functions/v1/google-calendar-sync-changes \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"company_id": "xxx", "calendar_id": "yyy"}'
   ```

---

## ✅ Checklist Post-Déploiement

- [ ] Migration SQL exécutée
- [ ] Edge Functions redéployées
- [ ] Contrainte UNIQUE vérifiée
- [ ] Colonnes vérifiées
- [ ] Doublons nettoyés
- [ ] Test modification Google → App réussi
- [ ] Test modification App → Google réussi
- [ ] Test suppression Google → App réussi
- [ ] Aucun doublon créé après tests

---

## 🎉 Résultat Final

Après déploiement complet :

- ✅ **Modification Google** → Met à jour l'événement existant (pas de doublon)
- ✅ **Suppression Google** → Soft delete (`deleted_at` rempli)
- ✅ **Modification App** → Met à jour dans Google Calendar
- ✅ **Création App** → Crée dans Google Calendar avec `google_event_id` stocké
- ✅ **Aucun doublon** : Contrainte UNIQUE empêche les doublons
- ✅ **Anti-loop** : `last_update_source` évite les boucles infinies
