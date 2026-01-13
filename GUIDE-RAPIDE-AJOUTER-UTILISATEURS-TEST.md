# ⚡ Guide Rapide : Ajouter des Utilisateurs de Test Google OAuth

## 🎯 Objectif

Ajouter des utilisateurs de test pour que votre application Google Calendar fonctionne immédiatement.

**Temps estimé** : 2 minutes

---

## 📋 Étapes Détaillées (Copier-Coller)

### Étape 1 : Ouvrir la Page OAuth Consent Screen

**Lien direct** : https://console.cloud.google.com/apis/credentials/consent

1. **Cliquez sur le lien ci-dessus** (ouvre dans un nouvel onglet)
2. **Connectez-vous** avec votre compte Google si nécessaire
3. **Sélectionnez votre projet** Google Cloud (celui qui contient vos credentials OAuth)

---

### Étape 2 : Trouver la Section "Test users"

1. **Faites défiler** la page vers le bas
2. **Cherchez la section** "Test users" (utilisateurs de test)
3. **Vous verrez** :
   - Une liste des utilisateurs de test actuels (peut être vide)
   - Un bouton **"ADD USERS"** ou **"Add Users"**

---

### Étape 3 : Ajouter des Utilisateurs

1. **Cliquez sur** "ADD USERS" ou "Add Users"
2. **Une fenêtre popup s'ouvre** avec un champ de saisie
3. **Ajoutez les emails** un par un ou séparés par des virgules :
   ```
   sabri.khalfallah6@gmail.com
   ```
   
   **Ou plusieurs emails** :
   ```
   sabri.khalfallah6@gmail.com, utilisateur1@gmail.com, utilisateur2@gmail.com
   ```

4. **Cliquez sur** "ADD" ou "Save"

---

### Étape 4 : Vérifier

1. **Vérifiez** que les emails apparaissent dans la liste "Test users"
2. **Sauvegardez** si nécessaire (bouton "SAVE" en bas de la page)

---

### Étape 5 : Tester

1. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Cliquez sur** "Connecter Google Calendar"
3. **Connectez-vous** avec un email que vous avez ajouté
4. **Résultat attendu** : ✅ Connexion réussie (plus d'erreur "developer hasn't given you access")

---

## ✅ Checklist

- [ ] Ouvert : https://console.cloud.google.com/apis/credentials/consent
- [ ] Sélectionné le bon projet Google Cloud
- [ ] Trouvé la section "Test users"
- [ ] Cliqué sur "ADD USERS"
- [ ] Ajouté `sabri.khalfallah6@gmail.com`
- [ ] Ajouté d'autres emails si nécessaire
- [ ] Sauvegardé
- [ ] Testé la connexion Google Calendar

---

## 🎯 Emails à Ajouter (Exemples)

Ajoutez au minimum :
- ✅ `sabri.khalfallah6@gmail.com` (votre email)

Ajoutez aussi (si vous avez des utilisateurs) :
- ✅ Les emails de vos clients/utilisateurs qui doivent se connecter
- ✅ Les emails de test pour votre équipe

**Limite** : Maximum 100 utilisateurs de test

---

## 🚨 Si Vous Ne Voyez Pas "Test users"

**Causes possibles** :
1. L'application est déjà en mode "Production" (pas besoin d'utilisateurs de test)
2. Vous n'êtes pas sur le bon projet Google Cloud
3. L'écran de consentement n'est pas encore configuré

**Solutions** :
1. Vérifiez que vous êtes sur le bon projet (en haut de la page)
2. Vérifiez le "Publishing status" (doit être "Testing")
3. Si c'est "In production", vous n'avez pas besoin d'utilisateurs de test

---

## 📝 Notes

- **Les utilisateurs de test** peuvent se connecter immédiatement
- **Les autres utilisateurs** verront toujours l'erreur jusqu'à publication
- **Pour la production**, vous devrez publier l'application (voir autre guide)

---

**Suivez ces étapes et ça fonctionnera en 2 minutes !** 🚀
