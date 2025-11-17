# 📋 Guide d'Installation - Module RH

## ✅ Ce qui a été créé

Le module RH complet a été intégré à votre application BTP Smart Pro avec :

### 📊 Pages créées
- **Dashboard RH** (`/rh/dashboard`) - Vue d'ensemble avec statistiques
- **Gestion des Employés** (`/rh/employees`) - Liste et détails des employés
- **Candidatures** (`/rh/candidatures`) - Gestion du recrutement
- **Tâches RH** (`/rh/taches`) - Suivi des tâches RH

### 🗄️ Tables Supabase
- `teams` - Équipes
- `candidatures` - Candidatures
- `taches_rh` - Tâches RH
- `employee_performances` - Performances employés
- `rh_activities` - Activités RH (feed)

### 🔧 Hooks personnalisés
- `useRH.ts` - Tous les hooks pour gérer les données RH

---

## 🚀 Installation

### Étape 1 : Créer les tables Supabase

1. **Ouvrez Supabase Dashboard** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans** : SQL Editor (menu de gauche)
4. **Ouvrez le fichier** : `supabase/CREATE-RH-MODULE.sql`
5. **Copiez TOUT le contenu** du fichier
6. **Collez dans l'éditeur SQL** de Supabase
7. **Cliquez sur** "Run" ou "Exécuter"
8. **Vérifiez** que les tables sont créées dans Table Editor

### Étape 2 : Vérifier les tables

Dans Supabase Dashboard → Table Editor, vous devriez voir :
- ✅ `teams`
- ✅ `candidatures`
- ✅ `taches_rh`
- ✅ `employee_performances`
- ✅ `rh_activities`

### Étape 3 : Tester le module

1. **Démarrez l'application** : `npm run dev`
2. **Connectez-vous** en tant qu'administrateur
3. **Cliquez sur "RH"** dans la sidebar
4. **Testez les fonctionnalités** :
   - Dashboard RH
   - Gestion des employés
   - Candidatures
   - Tâches RH

---

## 📖 Utilisation

### Dashboard RH

Le dashboard affiche :
- **Total Employés** : Nombre total d'employés
- **Taux de Présence** : Pourcentage d'employés actifs
- **Candidatures Actives** : Candidatures en attente ou en entretien
- **Tâches Complétées** : Pourcentage de tâches terminées
- **Activité Récente** : Feed des dernières activités RH

### Gestion des Employés

- **Tableau** avec tous les employés
- **Recherche** par nom, poste, email
- **Détails** : Cliquez sur "Voir détails" pour voir les informations complètes
- **Alertes** : Contrats arrivant à terme (30 jours avant)

### Candidatures

- **Créer** une nouvelle candidature
- **Filtrer** par statut (en attente, entretien, accepté, refusé, archivé)
- **Score de correspondance** : 0-100% pour évaluer la candidature
- **Notes internes** : Ajoutez des notes pour le suivi
- **Changer le statut** directement depuis le tableau

### Tâches RH

- **Créer** des tâches RH (validation, entretien, mise à jour, formation, autre)
- **Priorités** : Basse, Moyenne, Haute, Urgente
- **Statuts** : En cours, En attente, Terminé, Annulé
- **Date d'échéance** : Suivi des deadlines
- **Statistiques** : Taux de completion global

---

## 🔐 Permissions

Le module RH est **réservé aux administrateurs** uniquement :
- Seuls les utilisateurs avec le rôle `dirigeant` peuvent accéder
- Les employés (`salarie`) n'ont pas accès au module RH

---

## 🎨 Design

Le module suit le même design que le reste de l'application :
- **Couleurs sobres** : Gris, bleu, vert, rouge pour les alertes
- **Composants réutilisables** : Card, Table, Badge, Dialog, etc.
- **Responsive** : Fonctionne sur mobile, tablette et desktop
- **Thème** : Compatible avec le thème sombre/clair

---

## 📊 Fonctionnalités Avancées

### Alertes Automatiques

Le système détecte automatiquement :
- **Contrats arrivant à terme** : Alerte 30 jours avant la fin
- **Absences répétées** : (À implémenter avec les données de présence)
- **Formations à prévoir** : (À implémenter)

### Activités RH

Toutes les actions créent automatiquement une activité :
- Nouvelle candidature
- Contrat signé
- Tâche créée
- Statut modifié

---

## 🔄 Prochaines Améliorations (Optionnel)

### Insights IA

Ajoutez une section "Insights RH" dans le Dashboard avec :
- Suggestions automatiques basées sur les données
- Détection de patterns (absences, retards, etc.)
- Recommandations de recrutement

### Performances Employés

- Calcul automatique du taux de présence
- Suivi de la ponctualité
- Score de productivité
- Graphiques d'évolution

### Équipes

- Créer et gérer des équipes
- Assigner des chefs d'équipe
- Voir les membres de chaque équipe

---

## 🐛 Dépannage

### Erreur : "Table does not exist"

**Solution** : Exécutez le script SQL `CREATE-RH-MODULE.sql` dans Supabase

### Erreur : "Permission denied"

**Solution** : Vérifiez que vous êtes connecté en tant qu'administrateur (rôle `dirigeant`)

### Les données ne s'affichent pas

**Solution** :
1. Vérifiez que les tables sont créées
2. Vérifiez les politiques RLS dans Supabase
3. Vérifiez la console du navigateur (F12) pour les erreurs

---

## ✅ Checklist

- [ ] Script SQL exécuté dans Supabase
- [ ] Tables créées et visibles dans Table Editor
- [ ] Navigation "RH" visible dans la sidebar (admin uniquement)
- [ ] Dashboard RH accessible
- [ ] Gestion des employés fonctionnelle
- [ ] Candidatures créables et modifiables
- [ ] Tâches RH créables et modifiables

---

## 🎉 C'est Prêt !

Le module RH est maintenant intégré à votre application. Vous pouvez commencer à l'utiliser immédiatement après avoir exécuté le script SQL.

**Lien direct** : http://localhost:5173/rh/dashboard

