# 🚀 Redéployer le Frontend - Guide Rapide

## ✅ Commit créé

Le commit avec les corrections PKCE a été créé localement. Il faut maintenant le pousser vers GitHub pour déclencher le déploiement automatique sur Vercel.

---

## 📋 Option 1 : Push Git (Recommandé)

### 1. Pousser vers GitHub

Dans votre terminal, exécutez :

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
git push origin main
```

Si vous êtes demandé pour l'authentification :
- Utilisez un **Personal Access Token** GitHub (pas votre mot de passe)
- Ou configurez SSH pour GitHub

### 2. Vérifier le déploiement Vercel

1. **Allez sur** : https://vercel.com/dashboard
2. **Trouvez** votre projet `BTP SMART PRO`
3. **Vérifiez** que le déploiement démarre automatiquement
4. **Attendez** la fin du déploiement (2-5 minutes)

---

## 📋 Option 2 : Déploiement manuel Vercel

### 1. Via Vercel Dashboard

1. **Allez sur** : https://vercel.com/dashboard
2. **Trouvez** votre projet
3. **Cliquez** sur "Deployments"
4. **Cliquez** sur "Redeploy" sur le dernier déploiement
5. **Sélectionnez** "Use existing Build Cache" (optionnel)
6. **Cliquez** sur "Redeploy"

### 2. Via Vercel CLI

Si vous avez Vercel CLI installé :

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
vercel --prod
```

---

## ✅ Vérification après déploiement

1. **Ouvrez** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Vérifiez** que la page se charge correctement
3. **Testez** la connexion Google Calendar
4. **Vérifiez** les logs console pour voir les messages PKCE :
   ```
   🔐 [useGetGoogleAuthUrl] PKCE généré:
     - code_verifier: ...
     - code_challenge: ...
   ```

---

## 🔍 Si le déploiement échoue

1. **Vérifiez** les logs Vercel pour voir l'erreur
2. **Vérifiez** que toutes les variables d'environnement sont configurées
3. **Vérifiez** que le build passe localement :
   ```bash
   npm run build
   ```

---

## 📝 Notes

- Le déploiement Vercel est généralement automatique après un push Git
- Si vous avez des problèmes d'authentification Git, utilisez l'option 2 (déploiement manuel)
- Le frontend doit être redéployé en même temps que l'Edge Function pour que le flow PKCE fonctionne
