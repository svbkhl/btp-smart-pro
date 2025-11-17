# 🔐 Push avec Token GitHub

## ⚡ Méthode Rapide

### Option 1 : Utiliser le script (Recommandé)

```bash
./push-with-token.sh
```

Le script vous demandera votre token, puis poussera automatiquement.

### Option 2 : Commande directe

**Remplacez `VOTRE_TOKEN` par votre token GitHub** :

```bash
git push https://VOTRE_TOKEN@github.com/svbkhl/btp_smart_pro.git feature/dashboard-improvements
```

**Exemple** :
```bash
git push https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/svbkhl/btp_smart_pro.git feature/dashboard-improvements
```

### Option 3 : Configurer Git pour utiliser le token

```bash
# Configurer le credential helper
git config --global credential.helper store

# Pousser (Git vous demandera username et password)
# Username : svbkhl
# Password : votre token
git push -u origin feature/dashboard-improvements
```

## 📋 Format du Token

Votre token GitHub ressemble à :
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ✅ Après le Push

1. **Vérifiez sur GitHub** : https://github.com/svbkhl/btp_smart_pro
2. **Vercel redéploiera automatiquement** en 2-3 minutes
3. **Votre site sera mis à jour** avec toutes les dernières modifications

## 🎯 Commandes Complètes

**Si vous voulez pousser vers main** :

```bash
# Basculer sur main
git checkout main

# Fusionner
git merge feature/dashboard-improvements

# Pousser avec token
git push https://VOTRE_TOKEN@github.com/svbkhl/btp_smart_pro.git main
```

---

**Le plus simple : Exécutez `./push-with-token.sh` et collez votre token !** 🚀

