# 🔗 Connecter GitHub à Vercel - Guide Complet

## ✅ État Actuel

- ✅ Projet connecté à GitHub : `https://github.com/svbkhl/btp_smart_pro.git`
- ✅ Code prêt à être déployé

## 🚀 Étapes pour Connecter à Vercel

### Option 1 : Nouveau Projet Vercel (Recommandé)

1. **Allez sur** : https://vercel.com/new
2. **Cliquez sur "Import Git Repository"**
3. **Connectez votre compte GitHub** (si pas déjà fait)
4. **Sélectionnez le dépôt** : `svbkhl/btp_smart_pro`
5. **Vercel détectera automatiquement** :
   - Framework : Vite ✅
   - Build Command : `npm run build` ✅
   - Output Directory : `dist` ✅
6. **Ajoutez les variables d'environnement** :
   - `VITE_SUPABASE_URL` = `https://renmjmqlmafqjzldmsgs.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbWFmcWp6bGRtc2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTA0OTksImV4cCI6MjA3ODE4NjQ5OX0.aJoeIcBb9FiSL2n90vfGevlQQJApym8AVlMktSYOwss`
7. **Cliquez sur "Deploy"**
8. **Attendez 2-3 minutes**
9. **Votre site sera en ligne !** 🎉

### Option 2 : Mettre à Jour un Projet Vercel Existant

1. **Allez sur** : https://vercel.com/dashboard
2. **Sélectionnez votre projet existant**
3. **Allez dans Settings → Git**
4. **Cliquez sur "Disconnect"** (si un autre dépôt est connecté)
5. **Cliquez sur "Connect Git Repository"**
6. **Sélectionnez** : `svbkhl/btp_smart_pro`
7. **Sélectionnez la branche** : `main` (ou celle que vous voulez)
8. **Vérifiez les variables d'environnement** dans Settings → Environment Variables
9. **Allez dans Deployments**
10. **Cliquez sur "Redeploy"** pour forcer un nouveau déploiement

### Option 3 : Via Vercel CLI (Si installé)

```bash
# Installer Vercel CLI (si pas déjà fait)
npm i -g vercel

# Se connecter
vercel login

# Lier le projet
vercel link

# Déployer
vercel --prod
```

## 📋 Variables d'Environnement à Ajouter dans Vercel

**Dans Vercel Dashboard → Settings → Environment Variables**, ajoutez :

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://renmjmqlmafqjzldmsgs.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbWFmcWp6bGRtc2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTA0OTksImV4cCI6MjA3ODE4NjQ5OX0.aJoeIcBb9FiSL2n90vfGevlQQJApym8AVlMktSYOwss` |

**Important** : Cochez les 3 environnements :
- ✅ Production
- ✅ Preview
- ✅ Development

## ✅ Vérification

Après le déploiement :

1. **Votre site sera accessible** : `https://votre-projet.vercel.app`
2. **Page de présentation** : `https://votre-projet.vercel.app/`
3. **Démo interactive** : `https://votre-projet.vercel.app/demo`

## 🔄 Mises à Jour Automatiques

Une fois connecté, **chaque `git push` vers `main` déclenchera automatiquement un nouveau déploiement** sur Vercel ! 🚀

---

**Le plus simple : Allez sur https://vercel.com/new et importez `svbkhl/btp_smart_pro`** ✨

