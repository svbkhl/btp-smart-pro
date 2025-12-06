# 📦 Instructions Git - Nouveau Dépôt

## ✅ Commit créé avec succès !

Tous tes fichiers ont été commités localement.

## 🚀 Option 1 : Créer un NOUVEAU dépôt GitHub

### Étape 1 : Créer le dépôt sur GitHub
1. Va sur https://github.com/new
2. Nom du dépôt : `btp-smart-pro` (ou un autre nom)
3. **Ne coche PAS** "Initialize with README"
4. Clique sur "Create repository"

### Étape 2 : Connecter ton dépôt local au nouveau dépôt
```bash
# Supprimer l'ancien remote
git remote remove origin

# Ajouter le nouveau remote (remplace USERNAME par ton nom d'utilisateur GitHub)
git remote add origin https://github.com/USERNAME/btp-smart-pro.git

# Push vers le nouveau dépôt
git push -u origin main
```

## 🔄 Option 2 : Push vers le dépôt existant

Si tu veux garder le dépôt existant `https://github.com/svbkhl/btp_smart_pro.git` :

```bash
# Push vers le dépôt existant
git push -u origin main
```

## ⚠️ Si tu as des erreurs d'authentification

GitHub a supprimé les mots de passe. Tu dois utiliser un **Personal Access Token** :

1. Va sur https://github.com/settings/tokens
2. Clique sur "Generate new token (classic)"
3. Donne-lui un nom : "BTP Smart Pro"
4. Coche `repo` (toutes les permissions)
5. Clique sur "Generate token"
6. **Copie le token** (tu ne pourras plus le voir après)

Ensuite, quand Git te demande ton mot de passe, utilise le **token** à la place.

## 📝 Résumé du commit

**451 fichiers modifiés** avec :
- ✅ Système multi-entreprises complet
- ✅ Système d'invitations
- ✅ Système de demandes de contact
- ✅ Widgets fonctionnels
- ✅ Architecture paiements multi-providers
- ✅ Script SQL complet (`INSTALL-COMPLETE-SYSTEM.sql`)

## 🎯 Prochaine étape

Après avoir push, exécute le script SQL `supabase/INSTALL-COMPLETE-SYSTEM.sql` dans Supabase SQL Editor pour créer toutes les tables !







