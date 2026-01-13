# 🔥 Guide : Correction project_id undefined causant erreur UUID "events"

## 🎯 Problème Identifié

L'erreur `invalid input syntax for type uuid: "events"` se produit lorsque :
1. `project_id` est `undefined` dans le payload JavaScript
2. PostgreSQL essaie de convertir `undefined` en UUID
3. Le trigger de validation ne gère pas correctement `project_id` NULL
4. Des valeurs invalides comme "events", "undefined" sont passées

---

## ✅ Corrections Appliquées

### 1. Script SQL de Correction

**Fichier** : `supabase/FIX-EVENTS-PROJECT-ID-UNDEFINED.sql`

- ✅ Vérifie/rend `project_id` nullable si nécessaire
- ✅ Améliore le trigger pour gérer `project_id` NULL
- ✅ Bloque explicitement "events", "undefined", chaînes vides
- ✅ Nettoie les données corrompues
- ✅ Vérifie la fonction `create_notification`

### 2. Corrections Frontend

**Fichier** : `src/hooks/useEvents.ts`

- ✅ Nettoyage du payload : suppression de toutes les valeurs `undefined`
- ✅ Seules les clés avec des valeurs définies sont incluses
- ✅ `project_id` est omis si `undefined`

**Fichier** : `src/components/EventForm.tsx`

- ✅ Construction de `eventData` sans valeurs `undefined`
- ✅ `project_id` inclus seulement si `validProjectId` est défini
- ✅ Pas de `project_id: undefined` dans le payload

---

## 🚀 Actions Requises

### Étape 1 : Exécuter le Script SQL

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Ouvrez** le fichier : `supabase/FIX-EVENTS-PROJECT-ID-UNDEFINED.sql`
3. **Copiez** tout le contenu
4. **Collez** dans l'éditeur SQL
5. **Cliquez sur** "Run"

### Étape 2 : Vérifier project_id

```sql
-- Vérifier que project_id est nullable
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
AND column_name = 'project_id';
-- Résultat attendu : is_nullable = 'YES'
```

### Étape 3 : Vérifier les données corrompues

```sql
-- Vérifier qu'il n'y a plus de project_id invalides
SELECT COUNT(*) 
FROM public.events 
WHERE project_id::text = 'events'
   OR project_id::text = 'undefined'
   OR project_id::text = '';
-- Résultat attendu : 0
```

---

## 🔍 Comportement Attendu

### Payload JavaScript

**AVANT (❌ Problématique)** :
```javascript
{
  user_id: "uuid-valid",
  company_id: "uuid-valid",
  project_id: undefined,  // ❌ Problème !
  title: "Event"
}
```

**APRÈS (✅ Corrigé)** :
```javascript
{
  user_id: "uuid-valid",
  company_id: "uuid-valid",
  // project_id omis si undefined
  title: "Event"
}
```

### PostgreSQL

- ✅ `project_id` peut être `NULL` (nullable)
- ✅ `project_id` n'est jamais `undefined` (omis du payload)
- ✅ Le trigger valide que `project_id` est soit NULL, soit un UUID valide
- ✅ Le trigger bloque "events", "undefined", chaînes vides

---

## 🧪 Test de Validation

### Test 1 : Créer un événement sans project_id

1. **Allez sur** : `/calendar`
2. **Créez** un nouvel événement **sans** sélectionner de projet
3. **Vérifiez** dans la console :
   ```
   🔍 [useCreateEvent] Payload nettoyé avant insertion:
   {
     "user_id": "...",
     "company_id": "...",
     "title": "...",
     ...
     // Pas de project_id
   }
   ```
4. **Vérifiez** que l'événement est créé avec succès
5. **Vérifiez** dans Supabase que `project_id` est `NULL`

### Test 2 : Créer un événement avec project_id

1. **Créez** un nouvel événement **avec** un projet sélectionné
2. **Vérifiez** dans la console que `project_id` est un UUID valide
3. **Vérifiez** que l'événement est créé avec succès
4. **Vérifiez** dans Supabase que `project_id` est l'UUID du projet

### Test 3 : Vérifier les logs Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/postgres-logs
2. **Cherchez** les erreurs contenant "invalid input syntax for type uuid"
3. **Vérifiez** qu'il n'y a plus d'erreur

---

## ❌ Erreurs Courantes

### Erreur : "project_id invalide: 'undefined'"

**Cause** : `project_id` est `undefined` dans le payload JavaScript.

**Solution** :
1. Vérifiez que le payload est nettoyé (pas de valeurs `undefined`)
2. Vérifiez que `project_id` est omis si `undefined`
3. Exécutez le script SQL de correction

### Erreur : "project_id invalide: 'events'"

**Cause** : La chaîne "events" est passée comme `project_id`.

**Solution** :
1. Vérifiez que `validProjectId` est bien validé avant inclusion
2. Vérifiez que le trigger bloque "events"
3. Exécutez le script SQL de correction

### Erreur : "column project_id does not exist"

**Cause** : La colonne `project_id` n'existe pas dans la table.

**Solution** :
1. Vérifiez que la table `events` a bien une colonne `project_id`
2. Exécutez le script SQL de correction qui vérifie/ajoute la colonne

---

## 📊 Checklist de Vérification

- [ ] Script SQL `FIX-EVENTS-PROJECT-ID-UNDEFINED.sql` exécuté
- [ ] `project_id` est nullable dans la table `events`
- [ ] Trigger `validate_event_uuid_fields_trigger` actif
- [ ] Aucune donnée corrompue (project_id = "events" ou "undefined")
- [ ] Frontend déployé avec nettoyage du payload
- [ ] Test de création d'événement sans project_id réussi
- [ ] Test de création d'événement avec project_id réussi
- [ ] Plus d'erreur "invalid input syntax for type uuid: 'events'"

---

## 🎯 Résultat Attendu

Après toutes ces étapes :
- ✅ Plus d'erreur "invalid input syntax for type uuid: 'events'"
- ✅ `project_id` peut être `NULL` (optionnel)
- ✅ `project_id` n'est jamais `undefined` dans le payload
- ✅ Le trigger valide correctement `project_id` NULL
- ✅ Création d'événement fonctionnelle
- ✅ Événements affichés correctement dans le calendrier

---

## 📚 Documentation

- **Script SQL** : `supabase/FIX-EVENTS-PROJECT-ID-UNDEFINED.sql`
- **Guide** : `GUIDE-FIX-PROJECT-ID-UNDEFINED.md` (ce fichier)
- **Script précédent** : `supabase/FIX-EVENTS-UUID-ERROR-COMPLETE.sql`
