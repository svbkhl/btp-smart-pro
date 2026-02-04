# Guide Setup : 3 Calendriers Google (Planning, Agenda, Événements)

## 🎯 Objectif
Configurer 3 calendriers Google séparés pour synchroniser :
- **Planning** : Affectations des employés aux projets
- **Agenda** : Événements généraux de l'entreprise
- **Événements** : Réunions, deadlines, rappels

---

## ÉTAPE 1 : Exécuter le script SQL sur Supabase

### 1.1 Accéder au SQL Editor

1. Allez sur : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. Vous êtes maintenant dans l'éditeur SQL

### 1.2 Copier le script

1. Ouvrez le fichier : `supabase/migrations/20260204000001_multiple_google_calendars.sql`
2. Copiez **TOUT le contenu** du fichier (Cmd+A puis Cmd+C)

### 1.3 Exécuter le script

1. Collez le script dans l'éditeur SQL Supabase (Cmd+V)
2. Cliquez sur le bouton **"RUN"** (en bas à droite)
3. Attendez l'exécution
4. Vérifiez les messages de succès :
   ```
   ✅ Colonne calendar_type ajoutée
   ✅ Colonne calendar_name ajoutée
   ✅ Contrainte UNIQUE modifiée pour supporter 3 calendriers
   ✅ RLS policies mises à jour
   ✅ Fonctions helper créées
   ```

5. Si AUCUNE erreur → Passez à l'étape 2
6. Si erreur → Copiez l'erreur et demandez de l'aide

---

## ÉTAPE 2 : Tester la nouvelle interface

### 2.1 Actualiser l'application

1. Allez sur votre application : http://localhost:4000
2. Actualisez avec **hard refresh** : Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)

### 2.2 Accéder aux calendriers Google

1. Connectez-vous si nécessaire
2. Allez dans **Paramètres** → **Google Calendar**
3. Vous devriez maintenant voir **3 cartes** :
   - 📅 **Planning** (bleu) - Affectations et plannings des employés
   - 📋 **Agenda** (violet) - Événements généraux de l'entreprise
   - 📆 **Événements** (orange) - Réunions, deadlines et rappels

### 2.3 Connecter chaque calendrier

**Pour chaque calendrier :**

1. Cliquez sur **"Connecter [Nom du calendrier]"**
2. Vous êtes redirigé vers Google OAuth
3. Autorisez l'accès
4. Vous revenez sur l'application
5. Le calendrier affiche "✅ Connecté"
6. Recommencez pour les 2 autres calendriers

---

## ÉTAPE 3 : Vérifier dans Google Calendar

1. Ouvrez Google Calendar : https://calendar.google.com
2. Dans la liste des calendriers à gauche, vous devriez voir **3 nouveaux calendriers** :
   - 📅 **Planning – SK Agency**
   - 📋 **Agenda – SK Agency**
   - 📆 **Événements – SK Agency**

3. Chaque calendrier aura une couleur différente

---

## RÉSULTAT ATTENDU

✅ 3 calendriers Google connectés  
✅ Chaque type de données synchronisé vers son calendrier  
✅ Organisation claire et professionnelle  
✅ Peut afficher/masquer chaque calendrier indépendamment  

---

## SUPPORT

Si vous rencontrez un problème :
1. Vérifiez que le script SQL s'est exécuté sans erreur
2. Vérifiez que vous avez actualisé l'application (hard refresh)
3. Vérifiez la console du navigateur pour des erreurs

---

**Créé le :** 2026-02-04  
**Version :** 1.0
