# 🧪 Test : Notifications Automatiques

## 🎯 Objectif

Vérifier que les notifications sont créées automatiquement lorsque :
- Un nouveau projet est créé
- Un nouveau client est créé
- Le statut d'un projet change
- Un projet est en retard

---

## ✅ Prérequis

1. **La table `notifications` existe** ✅
2. **Les politiques RLS sont configurées** ✅
3. **Les triggers sont configurés** (à vérifier)

---

## 🔍 Étape 1 : Vérifier les Triggers

### Dans Supabase Dashboard → SQL Editor

Exécutez : `supabase/VÉRIFIER-TRIGGERS-NOTIFICATIONS.sql`

**Résultat attendu** :
- ✅ Fonction `create_notification` : 1 ligne
- ✅ Triggers sur `projects` : 3 lignes
  - `trigger_notify_project_created`
  - `trigger_notify_project_overdue`
  - `trigger_notify_project_status_change`
- ✅ Triggers sur `clients` : 1 ligne
  - `trigger_notify_client_created`
- ✅ Fonctions de trigger : 4 lignes

**Si les triggers n'existent pas**, exécutez :
`supabase/CREATE-EMAIL-SYSTEM.sql` (sections 2, 3, 4)

---

## 🧪 Étape 2 : Tester les Notifications Automatiques

### Test 1 : Créer un Nouveau Projet

1. **Dans l'application** :
   - Allez dans "Projets"
   - Cliquez sur "Créer un projet"
   - Remplissez le formulaire
   - Cliquez sur "Créer"

2. **Vérifiez** :
   - Une notification "Nouveau projet créé" devrait apparaître
   - Le type devrait être "success"
   - La notification devrait être liée au projet (`related_table: 'projects'`)

3. **Dans Supabase Dashboard → Table Editor → notifications** :
   - Vérifiez qu'une nouvelle notification a été créée
   - Vérifiez que `user_id` correspond à votre utilisateur
   - Vérifiez que `related_table = 'projects'`
   - Vérifiez que `related_id` correspond à l'ID du projet

### Test 2 : Créer un Nouveau Client

1. **Dans l'application** :
   - Allez dans "Clients"
   - Cliquez sur "Créer un client"
   - Remplissez le formulaire
   - Cliquez sur "Créer"

2. **Vérifiez** :
   - Une notification "Nouveau client ajouté" devrait apparaître
   - Le type devrait être "success"
   - La notification devrait être liée au client (`related_table: 'clients'`)

3. **Dans Supabase Dashboard → Table Editor → notifications** :
   - Vérifiez qu'une nouvelle notification a été créée
   - Vérifiez que `user_id` correspond à votre utilisateur
   - Vérifiez que `related_table = 'clients'`
   - Vérifiez que `related_id` correspond à l'ID du client

### Test 3 : Changer le Statut d'un Projet

1. **Dans l'application** :
   - Allez dans "Projets"
   - Cliquez sur un projet
   - Changez le statut (par exemple : "planifié" → "en cours")
   - Sauvegardez

2. **Vérifiez** :
   - Une notification "Statut du projet mis à jour" devrait apparaître
   - Le type devrait être "info"
   - La notification devrait indiquer le nouveau statut

3. **Dans Supabase Dashboard → Table Editor → notifications** :
   - Vérifiez qu'une nouvelle notification a été créée
   - Vérifiez que le message contient le nouveau statut

### Test 4 : Créer un Projet en Retard

1. **Dans l'application** :
   - Allez dans "Projets"
   - Créez un nouveau projet avec :
     - **Date de fin** : une date passée (par exemple : hier)
     - **Statut** : "planifié" ou "en cours" (pas "termine")

2. **Vérifiez** :
   - Une notification "Projet en retard" devrait apparaître
   - Le type devrait être "urgent"
   - La notification devrait indiquer la date de fin prévue

3. **Dans Supabase Dashboard → Table Editor → notifications** :
   - Vérifiez qu'une notification urgente a été créée
   - Vérifiez que le message contient la date de fin

---

## 🔧 Si les Notifications ne sont Pas Créées

### Problème 1 : Les Triggers n'Existent Pas

**Solution** :
1. Exécutez `supabase/CREATE-EMAIL-SYSTEM.sql` (sections 2, 3, 4)
2. Vérifiez avec `supabase/VÉRIFIER-TRIGGERS-NOTIFICATIONS.sql`

### Problème 2 : La Fonction create_notification() n'Existe Pas

**Solution** :
1. Exécutez `supabase/FIX-PERMISSIONS-NOTIFICATIONS.sql`
2. Cette fonction est créée dans ce script

### Problème 3 : Les Triggers sont Désactivés

**Solution** :
Dans SQL Editor, exécutez :
```sql
-- Activer tous les triggers
ALTER TABLE public.projects ENABLE TRIGGER ALL;
ALTER TABLE public.clients ENABLE TRIGGER ALL;
```

### Problème 4 : Erreur dans les Triggers

**Solution** :
1. Vérifiez les logs dans Supabase Dashboard → Logs → Postgres Logs
2. Vérifiez que la fonction `create_notification()` fonctionne :
```sql
-- Tester la fonction
SELECT public.create_notification(
  auth.uid(),
  'Test',
  'Ceci est un test',
  'info'
);
```

---

## 📊 Vérification dans l'Application

### Vérifier les Notifications en Temps Réel

1. **Ouvrez deux onglets** de l'application
2. **Dans le premier onglet** : Ouvrez les notifications (🔔)
3. **Dans le deuxième onglet** : Créez un nouveau projet
4. **Dans le premier onglet** : La notification devrait apparaître automatiquement (sans recharger)

### Vérifier le Compteur de Notifications

1. **Vérifiez** que le badge sur l'icône 🔔 affiche le bon nombre
2. **Créez une notification** : Le compteur devrait augmenter
3. **Marquez comme lu** : Le compteur devrait diminuer
4. **Marquez toutes comme lues** : Le compteur devrait être à 0

---

## ✅ Checklist

- [ ] Les triggers existent (vérifié avec `VÉRIFIER-TRIGGERS-NOTIFICATIONS.sql`)
- [ ] La fonction `create_notification()` existe
- [ ] Les politiques RLS sont configurées
- [ ] Une notification est créée lors de la création d'un projet
- [ ] Une notification est créée lors de la création d'un client
- [ ] Une notification est créée lors du changement de statut d'un projet
- [ ] Une notification est créée pour un projet en retard
- [ ] Les notifications s'affichent en temps réel
- [ ] Le compteur de notifications fonctionne
- [ ] Les notifications peuvent être marquées comme lues

---

## 🎯 Prochaines Étapes

Après avoir vérifié que les notifications automatiques fonctionnent :

1. **Testez les notifications en temps réel** (deux onglets)
2. **Testez les notifications pour différents types d'événements**
3. **Vérifiez que les notifications sont correctement liées aux projets/clients**
4. **Testez les filtres et la recherche de notifications** (si implémentés)

---

**Exécutez `supabase/VÉRIFIER-TRIGGERS-NOTIFICATIONS.sql` pour vérifier les triggers !** 🚀

