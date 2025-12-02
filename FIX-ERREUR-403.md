# 🔧 Résoudre l'Erreur 403 - Write Access Denied

## ❌ Problème

```
remote: Write access to repository not granted.
fatal: unable to access 'https://github.com/svbkhl/btp_smart_pro.git/': The requested URL returned error: 403
```

## 🔍 Causes Possibles

1. **Le token n'a pas les bonnes permissions**
2. **Le dépôt n'existe pas encore sur GitHub**
3. **Le token a expiré**
4. **Le dépôt est privé et le token n'a pas accès**

---

## ✅ SOLUTION 1 : Vérifier/Créer le Dépôt GitHub

### A. Vérifier si le dépôt existe

Allez sur : **https://github.com/svbkhl/btp_smart_pro**

- **Si le dépôt existe** → Passez à la Solution 2
- **Si le dépôt n'existe pas** → Créez-le (voir ci-dessous)

### B. Créer le dépôt (si nécessaire)

1. Allez sur : **https://github.com/new**
2. **Repository name** : `btp_smart_pro`
3. **Description** : "Application de gestion BTP avec IA"
4. **Visibilité** : Public ou Private
5. **⚠️ NE COCHEZ PAS** "Initialize with README"
6. **⚠️ NE COCHEZ PAS** "Add .gitignore"
7. **⚠️ NE COCHEZ PAS** "Choose a license"
8. Cliquez sur **"Create repository"**

---

## ✅ SOLUTION 2 : Créer un Nouveau Token avec les Bonnes Permissions

### A. Supprimer l'ancien token (optionnel)

1. Allez sur : **https://github.com/settings/tokens**
2. Trouvez votre token (remplacez `ghp_XXXXXXXXXXXXX` par votre token réel)
3. Cliquez sur **"Delete"** (optionnel, vous pouvez aussi en créer un nouveau)

### B. Créer un nouveau token

1. Allez sur : **https://github.com/settings/tokens**
2. Cliquez sur **"Generate new token (classic)"**
3. **Note** : `Vercel Deploy - Accès complet`
4. **Expiration** : 90 jours (ou No expiration)
5. **⚠️ IMPORTANT : Cochez TOUTES les cases dans "repo"** :
   - ☑️ `repo` (cela coche automatiquement toutes les sous-options)
   - ☑️ `repo:status`
   - ☑️ `repo_deployment`
   - ☑️ `public_repo`
   - ☑️ `repo:invite`
   - ☑️ `security_events`
6. Cliquez sur **"Generate token"**
7. **⚠️ COPIEZ LE TOKEN** (vous ne le reverrez plus !)

### C. Tester le nouveau token

```bash
# Remplacez NOUVEAU_TOKEN par le token que vous venez de copier
git push https://NOUVEAU_TOKEN@github.com/svbkhl/btp_smart_pro.git main
```

---

## ✅ SOLUTION 3 : Utiliser SSH au lieu de HTTPS (Alternative)

### A. Vérifier si vous avez une clé SSH

```bash
ls -la ~/.ssh/id_rsa.pub
```

### B. Si vous n'avez pas de clé SSH, créez-en une

```bash
ssh-keygen -t ed25519 -C "votre_email@example.com"
```

### C. Ajouter la clé SSH à GitHub

1. Copiez votre clé publique :
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```
2. Allez sur : **https://github.com/settings/keys**
3. Cliquez sur **"New SSH key"**
4. Collez la clé
5. Cliquez sur **"Add SSH key"**

### D. Changer le remote en SSH

```bash
git remote set-url origin git@github.com:svbkhl/btp_smart_pro.git
git push origin main
```

---

## ✅ SOLUTION 4 : Vérifier le Nom d'Utilisateur GitHub

Assurez-vous que le nom d'utilisateur dans l'URL est correct :

- ✅ Correct : `https://github.com/svbkhl/btp_smart_pro.git`
- ❌ Incorrect : `https://github.com/autre-username/btp_smart_pro.git`

Votre username GitHub est : **`svbkhl`**

---

## 🎯 Solution Recommandée (Ordre de Priorité)

1. **Vérifiez que le dépôt existe** sur GitHub
2. **Créez un nouveau token** avec toutes les permissions `repo`
3. **Testez avec le nouveau token**
4. Si ça ne marche toujours pas, **utilisez SSH**

---

## 📋 Checklist

- [ ] Le dépôt `svbkhl/btp_smart_pro` existe sur GitHub
- [ ] Le token a toutes les permissions `repo` cochées
- [ ] Le token n'a pas expiré
- [ ] Le nom d'utilisateur dans l'URL est correct (`svbkhl`)
- [ ] Le dépôt n'est pas privé OU le token a accès aux dépôts privés

---

## 🚀 Après Avoir Résolu

Une fois le push réussi, vous pourrez déployer sur Vercel !

