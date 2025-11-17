# 📅 Système de Calendrier - Guide d'Installation

## 📋 Vue d'Ensemble

Ce système permet de gérer des événements dans un calendrier avec :
- ✅ Vue jour/semaine/mois
- ✅ Création/édition/suppression d'événements
- ✅ Liaison avec les projets
- ✅ Types d'événements (réunion, tâche, échéance, rappel, autre)
- ✅ Événements toute la journée
- ✅ Rappels
- ✅ Notifications automatiques

---

## 🚀 Installation en 2 Étapes

### Étape 1 : Appliquer le Script SQL

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Allez dans SQL Editor** (💬 dans le menu)
3. **Cliquez sur "New query"**
4. **Ouvrez le fichier** : `supabase/CREATE-CALENDAR-SYSTEM.sql`
5. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
6. **Collez dans SQL Editor** (`Cmd+V`)
7. **Cliquez sur "Run"** (ou `Cmd+Enter`)
8. **Vérifiez** : Vous devriez voir "Success"

---

### Étape 2 : Vérifier que tout fonctionne

1. **Dans l'application**, allez dans **Calendrier**
2. **Cliquez sur "Nouvel événement"**
3. **Créez un événement de test**
4. **Vérifiez** que l'événement apparaît dans le calendrier

---

## ✅ Vérification

### Vérifier que la Table est Créée

Dans **SQL Editor**, exécutez :

```sql
-- Vérifier la table events
SELECT * FROM public.events LIMIT 5;

-- Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%event%';
```

Vous devriez voir :
- ✅ Table `events`
- ✅ Fonction `get_events_by_date_range`
- ✅ Fonction `get_today_events`

### Vérifier les Triggers

```sql
-- Vérifier les triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%event%';
```

Vous devriez voir :
- ✅ `trigger_update_events_updated_at`
- ✅ `trigger_validate_event_dates`
- ✅ `trigger_notify_event_created`

---

## 🎯 Fonctionnalités

### Types d'Événements

- **Réunion** (bleu) : Réunions avec clients ou équipe
- **Tâche** (vert) : Tâches à effectuer
- **Échéance** (orange) : Dates limites importantes
- **Rappel** (violet) : Rappels importants
- **Autre** (gris) : Autres types d'événements

### Vues Disponibles

- **Jour** : Vue détaillée d'un jour avec heures
- **Semaine** : Vue de la semaine avec tous les jours
- **Mois** : Vue mensuelle avec tous les événements

### Fonctionnalités

- ✅ Créer un événement
- ✅ Modifier un événement
- ✅ Supprimer un événement
- ✅ Lier un événement à un projet
- ✅ Événements toute la journée
- ✅ Rappels (minutes avant l'événement)
- ✅ Lieu de l'événement
- ✅ Description de l'événement

---

## 🔧 Configuration Avancée

### Changer les Couleurs par Défaut

Dans `src/pages/Calendar.tsx`, modifiez `EVENT_TYPES` :

```typescript
const EVENT_TYPES = {
  meeting: { label: "Réunion", color: "#3b82f6" }, // Bleu
  task: { label: "Tâche", color: "#10b981" }, // Vert
  deadline: { label: "Échéance", color: "#f59e0b" }, // Orange
  reminder: { label: "Rappel", color: "#8b5cf6" }, // Violet
  other: { label: "Autre", color: "#6b7280" }, // Gris
};
```

### Ajouter de Nouveaux Types d'Événements

1. **Dans la base de données**, modifiez le type `event_type` (si nécessaire)
2. **Dans `EventForm.tsx`**, ajoutez le nouveau type dans `EVENT_TYPES`
3. **Dans `Calendar.tsx`**, ajoutez le nouveau type dans `EVENT_TYPES`

---

## 🆘 Dépannage

### Les Événements ne s'Affichent Pas

1. **Vérifiez que la table `events` existe** :
   ```sql
   SELECT * FROM public.events;
   ```

2. **Vérifiez les politiques RLS** :
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'events';
   ```

3. **Vérifiez que l'utilisateur est connecté** :
   - Les événements sont filtrés par `user_id`
   - Seuls les événements de l'utilisateur connecté sont affichés

### Erreur : "relation does not exist"

**Solution** : La table `events` n'existe pas. Exécutez le script SQL `CREATE-CALENDAR-SYSTEM.sql`.

### Erreur : "permission denied"

**Solution** : Vérifiez que les politiques RLS sont correctement configurées. Les politiques doivent permettre à l'utilisateur de voir/créer/modifier/supprimer ses propres événements.

### Les Événements ne se Lient pas aux Projets

1. **Vérifiez que la clé étrangère existe** :
   ```sql
   SELECT * FROM information_schema.table_constraints
   WHERE table_name = 'events'
   AND constraint_type = 'FOREIGN KEY';
   ```

2. **Vérifiez que le projet existe** :
   - Le `project_id` doit correspondre à un projet existant
   - Le projet doit appartenir à l'utilisateur connecté

---

## 📝 Résumé des Fichiers

- ✅ `supabase/CREATE-CALENDAR-SYSTEM.sql` - Script SQL principal
- ✅ `src/hooks/useEvents.ts` - Hooks pour gérer les événements
- ✅ `src/components/EventForm.tsx` - Formulaire d'événement
- ✅ `src/pages/Calendar.tsx` - Page calendrier avec vues jour/semaine/mois
- ✅ `src/components/Sidebar.tsx` - Ajout du lien Calendrier
- ✅ `src/App.tsx` - Ajout de la route `/calendar`

---

## 🎉 C'est Fait !

**Votre système de calendrier est maintenant configuré !**

### Ce qui Fonctionne :

1. ✅ Création d'événements
2. ✅ Modification d'événements
3. ✅ Suppression d'événements
4. ✅ Vue jour/semaine/mois
5. ✅ Liaison avec les projets
6. ✅ Types d'événements
7. ✅ Rappels
8. ✅ Notifications automatiques

### Prochaines Étapes :

1. ✅ Testez la création d'événements
2. ✅ Testez les différentes vues
3. ✅ Testez la liaison avec les projets
4. ✅ Testez les rappels

---

**Besoin d'aide ? Consultez la section "Dépannage" ou demandez de l'aide !** 📚

