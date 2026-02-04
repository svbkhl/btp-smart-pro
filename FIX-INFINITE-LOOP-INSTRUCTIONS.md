# Fix Boucle Infinie - Instructions de Test

## 🔧 Ce qui a été corrigé

J'ai converti `useAuth` d'un hook simple en un **AuthContext** unique partagé par toute l'application. Cela empêche la création de multiples instances qui causaient la boucle infinie.

## 📝 Fichiers modifiés

1. ✅ **Créé** : `src/contexts/AuthContext.tsx` - Provider unique pour l'auth
2. ✅ **Modifié** : `src/main.tsx` - Ajout de l'AuthProvider
3. ✅ **Modifié** : `src/App.tsx` - Import du Context
4. ✅ **Modifié** : `src/components/ProtectedRoute.tsx` - Import du Context  
5. ✅ **Modifié** : `src/hooks/useAuth.tsx` - Ré-export pour compatibilité

## 🧪 Comment tester (À SUIVRE EXACTEMENT)

### Étape 1 : Fermer le navigateur complètement
- Sur Mac : `Cmd+Q`
- Sur Windows : Fermer toutes les fenêtres du navigateur

### Étape 2 : Ouvrir un nouvel onglet
- Aller sur `http://localhost:4000`
- **NE PAS** aller sur `http://127.0.0.1:4000`

### Étape 3 : Ouvrir la Console AVANT de naviguer
- Appuyer sur `F12` ou `Cmd+Option+I`
- Aller sur l'onglet "Console"
- Cliquer sur le bouton "Clear console" (icône 🚫)

### Étape 4 : Recharger la page
- `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Windows)

### Étape 5 : Vérifier les logs
Vous devriez voir **EN HAUT** de la console :
```
🔵 [AuthProvider] MOUNT - Single instance for entire app
```

✅ **Si vous voyez ce log** : Le fix est chargé !
❌ **Si vous ne voyez PAS ce log** : Le code n'a pas été chargé correctement

### Étape 6 : Aller sur Paramètres
- Cliquer sur "Paramètres" dans le menu de gauche
- **RESTER sur l'onglet "Entreprise"**
- **NE PAS cliquer** sur "Intégrations" ou "Google Calendar"

### Étape 7 : Compter les requêtes
- Attendre 10 secondes
- Compter combien de fois `🌐 [Supabase Auth Request]` apparaît

**Résultat attendu :**
- ✅ **2-5 requêtes en 10 secondes** = Problème résolu !
- ❌ **30+ requêtes en 10 secondes** = Problème persiste

## 🐛 Si le problème persiste

### Symptôme 1 : Pas de log `🔵 [AuthProvider] MOUNT`

**Cause probable :** Cache navigateur ou Vite

**Solution :**
```bash
# 1. Arrêter le serveur
lsof -ti:4000 | xargs kill -9

# 2. Vider les caches
rm -rf node_modules/.vite .vite dist

# 3. Redémarrer
npm run dev
```

Puis fermer le navigateur complètement et recommencer.

### Symptôme 2 : Toujours 30+ requêtes

**Cause probable :** Le fix n'a pas résolu le problème complet

**Prochaines étapes :**
1. Vérifier que le log `🔵 [AuthProvider] MOUNT` n'apparaît QU'UNE SEULE FOIS
2. Copier les 50 premières lignes de la console
3. Partager les logs pour analyse plus approfondie

## 📊 Informations à collecter si problème persiste

Si après avoir suivi TOUTES les étapes ci-dessus le problème persiste, collectez :

1. **Première ligne de la console** - Commence par "[vite] connecting..."
2. **Présence du log AuthProvider** - Oui/Non
3. **Nombre de requêtes** - Compter les `🌐 [Supabase Auth Request]` en 10 secondes
4. **Erreurs rouges** - S'il y en a, copier le message complet
5. **Capture d'écran** - De la console complète si possible

## 🎯 Résultat attendu final

Une fois le fix appliqué correctement :
- ✅ Le log `🔵 [AuthProvider] MOUNT` apparaît UNE SEULE FOIS au démarrage
- ✅ Moins de 5 requêtes `getUser()` par minute
- ✅ La page Paramètres se charge normalement (pas de spinner infini)
- ✅ Pas de démontage/remontage répété de composants

## 💡 Pourquoi ce fix fonctionne

**Avant :** Chaque composant qui utilisait `useAuth()` créait sa propre instance avec son propre listener d'événements auth. Résultat : 10+ listeners qui s'appelaient mutuellement en boucle.

**Après :** Un seul `AuthProvider` au niveau racine de l'app. Tous les composants partagent la même instance. Résultat : 1 seul listener, pas de boucle.

---

**Date :** 2026-02-04  
**Status :** En attente de validation utilisateur
