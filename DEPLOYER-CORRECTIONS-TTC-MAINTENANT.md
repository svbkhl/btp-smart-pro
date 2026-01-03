# 🚀 DÉPLOYER LES CORRECTIONS TTC MAINTENANT

## 🎯 Objectif
Déployer les 3 commits qui corrigent l'erreur `totalTTC is not defined` sur le site en production.

---

## 📦 Commits à déployer

✅ `fix: Simplifier placeholder et message Montant TTC`
✅ `fix: Corriger variable totalTTC -> total_ttc dans simpleQuoteService`
✅ `fix: Corriger génération PDF - MODE TTC FIRST`

---

## 🔧 ÉTAPE 1 : PUSH VERS GITHUB

### Option A - Via Terminal (RECOMMANDÉ)

**1. Ouvre un terminal**

**2. Copie-colle cette commande :**

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
git push origin main
```

**3. Si demande de credentials :**
- **Username** : ton username GitHub
- **Password** : ton **Personal Access Token** (pas le mot de passe)

> 💡 Si tu n'as pas de token, va sur : https://github.com/settings/tokens

---

### Option B - Via VS Code

**1. Ouvre VS Code dans le projet**

**2. Clique sur l'icône "Source Control"** (3ème icône à gauche, ressemble à une branche)

**3. Clique sur les 3 points `...`** en haut à droite

**4. Clique sur "Push"**

---

### Option C - Via GitHub Desktop

**1. Ouvre GitHub Desktop**

**2. Sélectionne le repo "BTP SMART PRO"**

**3. Clique sur "Push origin"** (bouton bleu en haut)

---

## ⏱️ ÉTAPE 2 : VÉRIFIER LE DÉPLOIEMENT VERCEL

### 1️⃣ Vérifie que le push a réussi

Va sur : https://github.com/TON-USERNAME/TON-REPO/commits/main

Tu devrais voir les 3 nouveaux commits.

---

### 2️⃣ Vérifie le déploiement Vercel

**Option 1 - Via Dashboard Vercel :**
1. Va sur : https://vercel.com/dashboard
2. Clique sur ton projet **BTP SMART PRO**
3. Tu devrais voir un déploiement "Building" ou "Ready"
4. Attends que le statut soit **"Ready"** (2-3 minutes)

**Option 2 - Via CLI Vercel :**
```bash
npx vercel --prod
```

---

### 3️⃣ Teste le site

**Une fois le déploiement "Ready" :**

1. **Va sur** : https://www.btpsmartpro.com

2. **IMPORTANT - Vide le cache du navigateur :**
   - **Chrome/Edge** : `Cmd + Shift + R` (Mac) ou `Ctrl + Shift + R` (Windows)
   - **Safari** : `Cmd + Option + R`
   - **Firefox** : `Cmd + Shift + R`

3. **Ouvre la console (F12)**

4. **Va dans l'onglet "Network"**

5. **Génère un devis avec 2000€**

6. **Vérifie dans la console :**
   - Le fichier JS doit s'appeler `SimpleQuoteForm-XXXXXXX.js` (avec un nouveau hash)
   - **PAS** `SimpleQuoteForm-qqStZeJJ.js` (l'ancien)

7. **Si tu vois toujours `qqStZeJJ` :**
   - Ferme **TOUS** les onglets du site
   - Vide le cache navigateur (voir ci-dessus)
   - Réouvre le site

---

## ✅ Résultat attendu

- ✅ Pas d'erreur `totalTTC is not defined`
- ✅ Le devis se génère avec succès
- ✅ Le montant affiché : **2000€ TTC** (pas 2400€)
- ✅ Le PDF téléchargé affiche : **Total à payer (TTC) : 2 000,00 €** en gros
- ✅ Puis "dont TVA" et "Total HT" en petit

---

## 🆘 Si ça ne fonctionne toujours pas

### Problème 1 : Le push ne fonctionne pas

**Erreur : `fatal: could not read Username`**

**Solution :**
```bash
# Configure Git avec SSH au lieu de HTTPS
git remote set-url origin git@github.com:USERNAME/REPO.git
git push origin main
```

---

### Problème 2 : Vercel ne déploie pas automatiquement

**Solution - Déploiement manuel :**

1. **Va sur** : https://vercel.com/dashboard
2. **Sélectionne ton projet**
3. **Clique sur "Deployments"**
4. **Clique sur "Redeploy" sur le dernier déploiement**
5. **Coche "Use existing Build Cache"**
6. **Clique sur "Redeploy"**

---

### Problème 3 : Le cache persiste

**Solution - Purge complète du cache :**

**Chrome/Edge :**
1. Ouvre DevTools (F12)
2. Va dans "Application" → "Storage"
3. Clique sur "Clear site data"
4. Ferme tous les onglets
5. Rouvre le site

**Safari :**
1. Safari → Préférences → Avancées
2. Coche "Afficher le menu Développement"
3. Développement → Vider les caches
4. Ferme tous les onglets
5. Rouvre le site

---

## 📝 Commandes de diagnostic

Si besoin, utilise ces commandes pour diagnostiquer :

```bash
# Vérifier l'état Git local
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
git status

# Vérifier les commits en avance
git log --oneline -3

# Vérifier le remote
git remote -v

# Forcer le push
git push origin main --force
```

---

## 🎯 Une fois que ça marche

**Envoie-moi :**
1. Une capture d'écran du devis généré (montant affiché)
2. Le nom du fichier JS dans la console (ex: `SimpleQuoteForm-ABC123.js`)
3. Une capture du PDF téléchargé (section totaux)

---

**Bonne chance ! 🚀**

