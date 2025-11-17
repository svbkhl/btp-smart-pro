# 🚀 Déploiement Rapide - Lien de Présentation

## ⚡ Méthode la Plus Rapide (5 minutes)

### Option 1 : Vercel (Recommandé)

1. **Allez sur** : https://vercel.com/new
2. **Connectez votre compte GitHub/GitLab** (ou créez-en un)
3. **Importez ce projet**
4. **Ajoutez les variables d'environnement** :
   - `VITE_SUPABASE_URL` = votre URL Supabase
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = votre clé publique
5. **Cliquez sur "Deploy"**
6. **Votre lien sera** : `https://votre-projet.vercel.app`

### Option 2 : Netlify Drop (Sans Git)

1. **Construisez l'application** :
   ```bash
   npm run build
   ```
2. **Allez sur** : https://app.netlify.com/drop
3. **Glissez-déposez** le dossier `dist` qui vient d'être créé
4. **Votre lien sera** : `https://random-name.netlify.app`

⚠️ **Note** : Avec Netlify Drop, vous devrez reconfigurer les variables d'environnement via l'interface.

---

## 🎯 Liens à Partager avec le Client

### Page de Présentation (Landing)
```
https://votre-projet.vercel.app/
```
- Présente l'application
- Met en avant les fonctionnalités
- Design moderne avec animations

### Page de Démo Interactive
```
https://votre-projet.vercel.app/demo
```
- ✅ **Pas besoin d'authentification**
- ✅ **Données fictives complètes**
- ✅ **Toutes les fonctionnalités visibles**
- ✅ **En lecture seule (sécurisé)**

---

## 📧 Message Type pour le Client

```
Bonjour,

Je vous partage le lien de présentation de notre solution de gestion BTP :

🌐 Page de présentation : [LIEN]
🎮 Démo interactive : [LIEN]/demo

La démo vous permet de découvrir toutes les fonctionnalités sans créer de compte.

Cordialement,
```

---

## 🔧 Si vous avez déjà Vercel CLI installé

```bash
# Se connecter
vercel login

# Déployer
vercel

# Pour la production
vercel --prod
```

---

## ✅ Checklist

- [ ] Application déployée
- [ ] Variables d'environnement configurées
- [ ] Page `/demo` accessible
- [ ] Design responsive vérifié
- [ ] Lien testé sur mobile et desktop

---

**Temps total** : 5-10 minutes

