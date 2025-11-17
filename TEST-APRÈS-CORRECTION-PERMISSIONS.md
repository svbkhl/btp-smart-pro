# ✅ Tests Après Correction des Permissions

## 🎯 Vérifications à Faire

### 1️⃣ Test des Notifications

#### Test 1 : Créer un Projet
1. **Allez dans "Projets"**
2. **Cliquez sur "Créer un projet"**
3. **Remplissez le formulaire** :
   - Nom du projet
   - Client (optionnel)
   - Statut
   - Budget (optionnel)
   - Dates (optionnel)
   - Description (optionnel)
4. **Cliquez sur "Créer"**

**Résultat attendu** :
- ✅ Le projet est créé
- ✅ Une notification "Nouveau projet créé" apparaît
- ✅ Le badge de notifications affiche "1" (ou +1)
- ✅ Vous pouvez cliquer sur l'icône 🔔 pour voir la notification

#### Test 2 : Créer un Client
1. **Allez dans "Clients"**
2. **Cliquez sur "Créer un client"**
3. **Remplissez le formulaire** :
   - Nom du client
   - Email (optionnel)
   - Téléphone (optionnel)
   - Adresse (optionnel)
4. **Cliquez sur "Créer"**

**Résultat attendu** :
- ✅ Le client est créé
- ✅ Une notification "Nouveau client ajouté" apparaît
- ✅ Le badge de notifications affiche "2" (ou +1)

#### Test 3 : Marquer une Notification comme Lue
1. **Cliquez sur l'icône 🔔 (notifications)**
2. **Cliquez sur le bouton "✓"** sur une notification
3. **Vérifiez** que la notification est marquée comme lue

**Résultat attendu** :
- ✅ La notification est marquée comme lue
- ✅ Le badge de notifications diminue
- ✅ La notification ne s'affiche plus en surbrillance

#### Test 4 : Marquer Toutes les Notifications comme Lues
1. **Cliquez sur l'icône 🔔 (notifications)**
2. **Cliquez sur "Tout marquer comme lu"**
3. **Vérifiez** que toutes les notifications sont marquées comme lues

**Résultat attendu** :
- ✅ Toutes les notifications sont marquées comme lues
- ✅ Le badge de notifications affiche "0"

---

### 2️⃣ Test de l'Upload d'Images

#### Test 1 : Upload d'Image pour un Projet
1. **Allez dans "Projets"**
2. **Créez un nouveau projet** ou **éditez un projet existant**
3. **Dans le formulaire, trouvez le champ "Image"**
4. **Cliquez sur "Choisir une image"** ou **glissez-déposez une image**
5. **Sélectionnez une image** (JPEG, PNG, WebP ou GIF, < 5MB)
6. **Attendez** que l'upload se termine

**Résultat attendu** :
- ✅ L'upload fonctionne sans erreur
- ✅ Une prévisualisation de l'image s'affiche
- ✅ Un message "Image uploadée !" apparaît
- ✅ L'image est sauvegardée avec le projet

#### Test 2 : Upload d'Image pour un Client
1. **Allez dans "Clients"**
2. **Créez un nouveau client** ou **éditez un client existant**
3. **Dans le formulaire, trouvez le champ "Photo de profil"**
4. **Cliquez sur "Choisir une image"**
5. **Sélectionnez une image** (JPEG, PNG, WebP ou GIF, < 5MB)
6. **Attendez** que l'upload se termine

**Résultat attendu** :
- ✅ L'upload fonctionne sans erreur
- ✅ Une prévisualisation de l'image s'affiche
- ✅ Un message "Image uploadée !" apparaît
- ✅ L'image est sauvegardée avec le client

#### Test 3 : Vérifier l'Affichage des Images
1. **Après l'upload, sauvegardez le projet/client**
2. **Rechargez la page** (F5)
3. **Vérifiez** que l'image s'affiche toujours

**Résultat attendu** :
- ✅ L'image s'affiche correctement
- ✅ L'image est accessible via l'URL publique
- ✅ L'image ne disparaît pas après rechargement

#### Test 4 : Vérifier dans Supabase Storage
1. **Allez dans Supabase Dashboard → Storage → images**
2. **Vérifiez** que la structure est :
   - `projects/{votre_user_id}/{nom_fichier}` pour les projets
   - `clients/{votre_user_id}/{nom_fichier}` pour les clients
3. **Vérifiez** que vous pouvez voir les images

**Résultat attendu** :
- ✅ Les images sont organisées par dossier (projects, clients)
- ✅ Chaque utilisateur a son propre sous-dossier
- ✅ Les images sont accessibles publiquement

---

### 3️⃣ Test des Notifications Automatiques

#### Test 1 : Notification lors de la Création d'un Projet
1. **Créez un nouveau projet**
2. **Vérifiez** qu'une notification "Nouveau projet créé" apparaît automatiquement

#### Test 2 : Notification lors du Changement de Statut
1. **Éditez un projet existant**
2. **Changez le statut** (par exemple : "planifié" → "en cours")
3. **Sauvegardez**
4. **Vérifiez** qu'une notification "Statut du projet mis à jour" apparaît

#### Test 3 : Notification pour un Projet en Retard
1. **Créez un projet** avec :
   - **Date de fin** : une date passée (par exemple : hier)
   - **Statut** : "planifié" ou "en cours" (pas "termine")
2. **Vérifiez** qu'une notification "Projet en retard" apparaît

---

## ✅ Checklist Complète

### Notifications
- [ ] Les notifications s'affichent dans l'application
- [ ] Le badge de notifications fonctionne
- [ ] Les notifications automatiques fonctionnent (création projet/client)
- [ ] Je peux marquer une notification comme lue
- [ ] Je peux marquer toutes les notifications comme lues
- [ ] Les notifications en temps réel fonctionnent (si deux onglets ouverts)

### Upload d'Images
- [ ] L'upload d'images fonctionne pour les projets
- [ ] L'upload d'images fonctionne pour les clients
- [ ] Les images s'affichent correctement
- [ ] Les images persistent après rechargement
- [ ] Les images sont accessibles via l'URL publique
- [ ] Les images sont organisées correctement dans Storage

### Fonctionnalités Générales
- [ ] Je peux créer un projet
- [ ] Je peux créer un client
- [ ] Je peux éditer un projet
- [ ] Je peux éditer un client
- [ ] Je peux supprimer un projet
- [ ] Je peux supprimer un client
- [ ] Le dashboard affiche les statistiques
- [ ] Les statistiques sont à jour

---

## 🆘 Si Quelque Chose ne Fonctionne Pas

### Les Notifications ne S'Affichent Pas

**Vérifiez** :
1. Les politiques RLS sont configurées (`FIX-PERMISSIONS-NOTIFICATIONS.sql`)
2. La table `notifications` existe
3. Vous êtes connecté dans l'application
4. Les triggers sont configurés (`CREATE-EMAIL-SYSTEM.sql`)

### L'Upload d'Images ne Fonctionne Pas

**Vérifiez** :
1. Le bucket `images` existe et est public
2. Les politiques RLS sont configurées (`FIX-STORAGE-PERMISSIONS-SIMPLE.sql`)
3. Vous êtes connecté dans l'application
4. L'image est < 5MB
5. L'image est au format JPEG, PNG, WebP ou GIF

### Les Images ne S'Affichent Pas

**Vérifiez** :
1. Le bucket est public
2. L'URL de l'image est correcte
3. L'image existe dans Storage
4. Les politiques RLS permettent la lecture (SELECT)

---

## 🎯 Prochaines Étapes

Après avoir testé toutes les fonctionnalités :

1. ✅ **Vérifiez** que tout fonctionne correctement
2. ✅ **Testez** toutes les fonctionnalités principales
3. ✅ **Vérifiez** qu'il n'y a pas d'erreurs dans la console (F12)
4. ✅ **Testez** avec différents types de fichiers et tailles

---

**Testez tout et dites-moi si quelque chose ne fonctionne pas !** 🚀

