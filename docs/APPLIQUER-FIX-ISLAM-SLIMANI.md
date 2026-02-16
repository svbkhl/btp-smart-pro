# Appliquer le correctif Islam Slimani

## Résumé des corrections

- **Nom** : "Islam Slimani" au lieu de "Henry" dans toute l'app
- **Sidebar** : menu employé (sans Employés, IA, stats)
- **Dashboard** : vue employé avec "Bonjour Islam" et accès rapide

## Étapes à exécuter dans Supabase

### 1. RPC get_current_user_display_name (si pas encore appliquée)

Dans **SQL Editor**, exécuter le contenu de :
`supabase/migrations/20260215000001_get_current_user_display_name.sql`

### 2. Mise à jour nom + rôle employé

Dans **SQL Editor**, exécuter le contenu de :
`docs/FIX-ISLAM-SLIMANI-NAME-AND-ROLE.sql`

Ce script :
- Met à jour auth.users et employees avec prenom="Islam", nom="Slimani"
- Définit le rôle employé dans company_users (pour khalfallahs.ndrc et khalfallah.sndrc)

### 3. Vérifier

Se connecter avec **khalfallahs.ndrc@gmail.com** ou **khalfallah.sndrc@gmail.com** :
- Le nom affiché doit être "Islam Slimani" (TopBar, Dashboard)
- La sidebar doit afficher : Tableau de bord, Mes chantiers, Mon planning, Calendrier, Messagerie, Facturation, Clients
- Le dashboard doit afficher "Bonjour Islam" et les cartes d'accès rapide (sans CA, stats, bouton Nouveau chantier)
