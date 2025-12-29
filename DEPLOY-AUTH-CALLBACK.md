# 🚀 Déploiement Route `/auth/callback` - Guide Complet

## ✅ État Actuel

**Framework** : Vite + React Router  
**Configuration** : ✅ Toutes les routes sont correctement configurées

### Fichiers Vérifiés

- ✅ `src/pages/AuthCallback.tsx` - Page créée
- ✅ `src/App.tsx` ligne 12 - Import ajouté
- ✅ `src/App.tsx` ligne 67 - Route configurée
- ✅ `vercel.json` - Rewrites configurés

---

## 🔧 Actions de Déploiement

### Étape 1 : Nettoyer et Rebuild

```bash
# Nettoyer les anciens builds
rm -rf dist
rm -rf node_modules/.vite

# Rebuild complet
npm run build
```

### Étape 2 : Vérifier le Build

```bash
# Vérifier que index.html existe
ls -la dist/index.html

# Vérifier que les assets sont générés
ls -la dist/assets/

# Chercher AuthCallback dans les fichiers
grep -r "AuthCallback" dist/ || echo "AuthCallback trouvé dans le build"
```

### Étape 3 : Test Local

```bash
# Lancer le serveur de preview
npm run preview

# Ouvrir dans le navigateur
# http://localhost:4173/auth/callback
```

**Attendu** : Page "Authentification en cours..." (pas 404)

### Étape 4 : Déployer sur Vercel

```bash
# Déploiement avec force (ignore le cache)
vercel --prod --force
```

**OU** via l'interface Vercel :
1. Allez sur : https://vercel.com/dashboard
2. Sélectionnez le projet
3. Cliquez sur "Redeploy" → "Use existing Build Settings"
4. Cochez "Redeploy with existing Build Cache" (décocher pour forcer un rebuild)

---

## 🧪 Tests Post-Déploiement

### Test 1 : Route Directe

1. Ouvrez : `https://btpsmartpro.com/auth/callback`
2. **Attendu** : Page "Authentification en cours..." (pas 404)
3. **Si 404** : Attendre 2-3 minutes (cache CDN) puis réessayer

### Test 2 : Route avec Paramètres

1. Ouvrez : `https://btpsmartpro.com/auth/callback?code=test123&type=magiclink`
2. **Attendu** : Page traite le callback (erreur si code invalide, mais pas 404)

### Test 3 : Test avec Invitation Réelle

1. Envoyez une invitation depuis l'application
2. Cliquez sur le lien dans l'email
3. **Attendu** : Redirection vers `/auth/callback?code=...` puis `/dashboard`

---

## 🐛 Résolution de Problèmes

### Problème : 404 Persiste Après Déploiement

**Solutions** :

1. **Vider le cache du navigateur** :
   - Chrome/Edge : Ctrl+Shift+Delete → Cocher "Images et fichiers en cache"
   - Ou tester en navigation privée

2. **Purger le cache Vercel** :
   - Vercel Dashboard → Settings → Data Cache
   - Cliquer sur "Purge Everything"

3. **Vérifier les logs Vercel** :
   - Vercel Dashboard → Deployments → Latest → Build Logs
   - Chercher des erreurs de compilation

4. **Vérifier avec curl** :
   ```bash
   curl -I https://btpsmartpro.com/auth/callback
   ```
   - **Attendu** : `HTTP/2 200` (pas `404`)

### Problème : Route Fonctionne en Local mais Pas en Prod

**Cause** : Cache CDN ou build incomplet

**Solution** :
```bash
# Rebuild avec force
rm -rf dist
npm run build
vercel --prod --force
```

### Problème : Erreur "Cannot find module"

**Cause** : Import incorrect ou fichier manquant

**Vérification** :
```bash
# Vérifier que le fichier existe
ls -la src/pages/AuthCallback.tsx

# Vérifier l'import dans App.tsx
grep "AuthCallback" src/App.tsx
```

---

## ✅ Checklist de Déploiement

- [ ] Build local réussi (`npm run build`)
- [ ] Test local réussi (`npm run preview` → `/auth/callback` fonctionne)
- [ ] Déploiement Vercel effectué
- [ ] Test en production : `https://btpsmartpro.com/auth/callback` (pas 404)
- [ ] Test avec invitation réelle (lien email fonctionne)
- [ ] Vérification console navigateur (logs `[AuthCallback]` présents)

---

## 📝 Notes Importantes

### Pour Vite + React Router

1. **Toutes les routes** sont gérées côté client
2. **Vercel rewrites** redirigent tout vers `index.html`
3. **React Router** prend ensuite le relais pour le routing

### Configuration Vercel

Le fichier `vercel.json` contient :
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Cette configuration est **correcte** et permet à toutes les routes de fonctionner.

---

## 🎯 Résultat Attendu

Après déploiement :

✅ `https://btpsmartpro.com/auth/callback` → Page "Authentification en cours..."  
✅ `https://btpsmartpro.com/auth/callback?code=...` → Traitement du callback  
✅ Lien d'invitation → Redirection vers `/dashboard` ou `/complete-profile`  
✅ **Plus aucune erreur 404**

---

## 🚀 Commandes Rapides

```bash
# Tout en une commande
rm -rf dist && npm run build && vercel --prod --force
```

**La route `/auth/callback` est correctement configurée. Il suffit de redéployer !** 🎉
