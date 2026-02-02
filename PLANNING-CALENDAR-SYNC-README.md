# 🔄 Synchronisation Automatique Planning ↔️ Calendrier

## 📋 Vue d'ensemble

Ce système synchronise automatiquement les **affectations de chantier** (Mon Planning) avec le **calendrier personnel** (Calendrier & Agenda).

### ✨ Fonctionnalités

1. **Synchronisation automatique bidirectionnelle**
   - Création d'affectation → Création d'événement dans le calendrier
   - Modification d'affectation → Mise à jour de l'événement
   - Suppression d'affectation → Suppression de l'événement

2. **Notifications des affectations du lendemain**
   - Affichage automatique en haut de l'écran
   - Liste expandable des affectations
   - Possibilité de masquer la notification (valable 24h)
   - Rafraîchissement automatique toutes les 30 minutes

---

## 🏗️ Architecture

### Fichiers créés

#### 1. `/src/hooks/usePlanningCalendarSync.ts`
Hook de synchronisation automatique des affectations vers le calendrier.

**Fonctions principales:**
- `useSyncPlanningToCalendar()` : Mutation pour synchroniser une affectation

**Actions supportées:**
- `create` : Créer un événement dans le calendrier
- `update` : Mettre à jour l'événement lié
- `delete` : Supprimer l'événement lié

**Format des événements créés:**
```typescript
{
  title: "🏗️ Chantier: [Nom du projet]",
  description: "Affectation de travail...",
  start_date: "[Date]T[Heure début]:00",
  end_date: "[Date]T[Heure fin]:00",
  location: "[Adresse du chantier]",
  type: "task",
  color: "#f59e0b", // Orange pour les chantiers
  reminder_minutes: 720, // Rappel 12h avant
}
```

#### 2. `/src/hooks/usePlanningNotifications.ts`
Hook pour récupérer les affectations à venir et formater les notifications.

**Fonctions principales:**
- `useTomorrowAssignments()` : Récupère les affectations de demain
- `useUpcomingAssignments()` : Récupère les affectations de la semaine
- `formatAssignmentNotification()` : Formate une affectation pour notification

#### 3. `/src/components/TomorrowAssignmentsNotification.tsx`
Composant de notification affiché en haut de l'écran.

**Caractéristiques:**
- Position fixe en haut de l'écran
- Animation d'apparition/disparition
- Liste expandable
- Mémorisation du dismiss (localStorage)
- Design gradient orange/amber

#### 4. `/supabase/migrations/20240202000000_add_linked_event_to_assignments.sql`
Migration SQL pour ajouter la colonne `linked_event_id` à la table `employee_assignments`.

---

## 📊 Base de données

### Modification de la table `employee_assignments`

Nouvelle colonne ajoutée :

```sql
linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL
```

**Comportement:**
- Stocke l'ID de l'événement lié dans le calendrier
- Si l'événement est supprimé manuellement → `linked_event_id` devient `NULL`
- Index créé pour optimiser les performances

---

## 🔧 Utilisation

### Dans MyPlanning.tsx

La synchronisation est automatique lors des opérations CRUD :

```typescript
// Import du hook
import { useSyncPlanningToCalendar } from "@/hooks/usePlanningCalendarSync";

// Initialisation
const syncToCalendar = useSyncPlanningToCalendar();

// Utilisation lors de la création/modification
await syncToCalendar.mutateAsync({
  assignmentId: "uuid-de-l-affectation",
  action: "create" // ou "update" ou "delete"
});
```

### Dans App.tsx

Le composant de notification est ajouté globalement :

```tsx
{user && !isPublicPage && <TomorrowAssignmentsNotification />}
```

---

## 🎯 Cas d'usage

### 1. Employé crée une affectation
1. L'employé crée une affectation dans "Mon Planning"
2. ✅ Un événement est automatiquement créé dans son calendrier
3. 🔔 Le soir, une notification lui rappelle son affectation du lendemain

### 2. Manager modifie une affectation
1. Le manager modifie les horaires d'un employé
2. ✅ L'événement dans le calendrier de l'employé est mis à jour automatiquement
3. 🔔 L'employé voit les nouvelles horaires dans la notification

### 3. Affectation supprimée
1. Une affectation est supprimée
2. ✅ L'événement lié est supprimé du calendrier automatiquement
3. 🔔 La notification ne l'affiche plus

---

## ⚙️ Configuration

### Rafraîchissement des notifications

Par défaut, les notifications sont rafraîchies toutes les 30 minutes.

Pour modifier :
```typescript
// Dans usePlanningNotifications.ts
refetchInterval: 30 * 60 * 1000, // 30 minutes
```

### Rappels des événements

Par défaut, les événements ont un rappel 12h avant (le soir pour le lendemain).

Pour modifier :
```typescript
// Dans usePlanningCalendarSync.ts
reminder_minutes: 720, // 12h = 720 minutes
```

### Couleur des événements de chantier

Par défaut, les événements de chantier sont orange (#f59e0b).

Pour modifier :
```typescript
// Dans usePlanningCalendarSync.ts
color: "#f59e0b", // Orange
```

---

## 🐛 Debugging

### Logs de synchronisation

Les hooks ajoutent des logs détaillés dans la console :

```
🔄 [SyncPlanningToCalendar] Action: create, Assignment ID: xxx
✅ [SyncPlanningToCalendar] Événement créé dans le calendrier: yyy
```

### Vérifier les données

```sql
-- Vérifier les affectations avec événements liés
SELECT a.*, e.title as event_title
FROM employee_assignments a
LEFT JOIN events e ON a.linked_event_id = e.id
WHERE a.employee_id = 'uuid-employe';

-- Voir les affectations de demain
SELECT * FROM employee_assignments
WHERE date = CURRENT_DATE + INTERVAL '1 day'
AND employee_id = 'uuid-employe';
```

---

## 🚀 Déploiement

### 1. Appliquer la migration SQL

```bash
# Connexion à Supabase
supabase db push

# Ou manuellement dans Supabase Dashboard → SQL Editor
```

### 2. Redéployer l'application

```bash
git add .
git commit -m "feat: Synchronisation automatique Planning ↔️ Calendrier + Notifications"
git push
```

### 3. Vérifier le fonctionnement

1. Créer une affectation dans "Mon Planning"
2. Vérifier qu'un événement apparaît dans "Calendrier & Agenda"
3. Le lendemain d'une affectation, vérifier qu'une notification apparaît

---

## 📝 Notes importantes

### Gestion des erreurs

- Si la synchronisation échoue, l'affectation est quand même créée
- Un toast d'erreur est affiché mais l'opération n'est pas bloquée
- Les logs dans la console permettent de diagnostiquer le problème

### Permissions RLS

Assurez-vous que les politiques RLS permettent :
- Aux employés de lire leurs propres affectations
- Aux employés de créer des événements dans leur calendrier
- Aux managers de créer/modifier les affectations des employés

### Performance

- Index ajouté sur `linked_event_id` pour optimiser les requêtes
- Cache React Query avec `staleTime` de 60 minutes
- Rafraîchissement automatique toutes les 30 minutes

---

## 🎨 Personnalisation

### Modifier le design de la notification

Éditez `/src/components/TomorrowAssignmentsNotification.tsx`:

```tsx
// Changer le gradient
className="bg-gradient-to-r from-amber-500/95 to-orange-500/95"

// Changer la position
className="fixed top-16 left-0 right-0"
```

### Ajouter plus d'informations

Dans `usePlanningCalendarSync.ts`, ajoutez des champs à `eventData`:

```typescript
const eventData = {
  // ... champs existants
  notes: `Chef de chantier: ${assignment.supervisor}`,
  attendees: assignment.team_members,
};
```

---

## ✅ Tests recommandés

1. **Test de création**
   - Créer une affectation → Vérifier l'événement dans le calendrier

2. **Test de modification**
   - Modifier les horaires → Vérifier la mise à jour de l'événement

3. **Test de suppression**
   - Supprimer une affectation → Vérifier la suppression de l'événement

4. **Test de notification**
   - Créer une affectation pour demain → Vérifier la notification le soir

5. **Test de dismiss**
   - Masquer la notification → Vérifier qu'elle ne réapparaît pas aujourd'hui

---

## 🆘 Support

En cas de problème :
1. Vérifier les logs dans la console du navigateur
2. Vérifier les données dans Supabase Dashboard
3. S'assurer que la migration SQL a été appliquée
4. Vérifier les permissions RLS

---

**Date de création:** 2 février 2026  
**Version:** 1.0.0  
**Auteur:** BTP Smart Pro Team
