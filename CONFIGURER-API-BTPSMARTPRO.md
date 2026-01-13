# 🚀 Configuration : Utiliser api.btpsmartpro.com pour les Edge Functions

## ✅ Fichier Créé

Le fichier `api/functions/[...path].ts` a été créé. Ce fichier crée un proxy Vercel qui redirige toutes les requêtes vers `api.btpsmartpro.com/functions/*` vers `renmjmqlmafqjzldmsgs.supabase.co/functions/v1/*`.

---

## 📋 Étapes de Configuration

### Étape 1 : Configurer le Domaine dans Vercel

1. **Allez sur** : https://vercel.com/dashboard
2. **Sélectionnez votre projet** `btpsmartpro`
3. **Settings** → **Domains**
4. **Cliquez sur** "Add" ou "Add Domain"
5. **Entrez** : `api.btpsmartpro.com`
6. **Cliquez sur** "Add"

### Étape 2 : Configurer le DNS

Dans votre registrar (où vous avez acheté `btpsmartpro.com`) :

1. **Allez dans** la gestion DNS de votre domaine
2. **Ajoutez un enregistrement CNAME** :
   - **Type** : `CNAME`
   - **Name/Host** : `api`
   - **Value/Target** : `cname.vercel-dns.com` (ou la valeur fournie par Vercel)
   - **TTL** : `3600` (ou valeur par défaut)

**Note** : Vercel vous donnera la valeur exacte à utiliser après avoir ajouté le domaine.

### Étape 3 : Attendre la Propagation DNS

- ⏱️ **Attendez 5-30 minutes** pour que le DNS se propage
- ✅ **Vérifiez** : `api.btpsmartpro.com` doit pointer vers Vercel

### Étape 4 : Mettre à Jour les Secrets Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/secrets
2. **Trouvez** `GOOGLE_REDIRECT_URI`
3. **Modifiez la valeur** :
   ```
   https://api.btpsmartpro.com/functions/v1/google-calendar-callback
   ```
4. **Sauvegardez**

### Étape 5 : Mettre à Jour Google Cloud Console

1. **Allez sur** : https://console.cloud.google.com/apis/credentials
2. **Cliquez sur votre OAuth 2.0 Client ID**
3. **Dans "Authorized redirect URIs"** :
   - **Supprimez** l'ancienne URI (si elle existe)
   - **Ajoutez** : `https://api.btpsmartpro.com/functions/v1/google-calendar-callback`
4. **Sauvegardez**

### Étape 6 : Déployer sur Vercel

```bash
git add api/functions/[...path].ts
git commit -m "feat: ajout proxy Vercel pour utiliser api.btpsmartpro.com"
git push origin main
```

**Vercel déploiera automatiquement** 🚀

---

## ✅ Vérification

### 1. Tester le Proxy

Une fois déployé, testez :
```
https://api.btpsmartpro.com/functions/v1/google-calendar-oauth
```

**Résultat attendu** : Devrait retourner une réponse JSON (même si c'est une erreur, c'est que le proxy fonctionne).

### 2. Tester la Connexion Google Calendar

1. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Cliquez sur** "Connecter Google Calendar"
3. **Vérifiez** :
   - ✅ Redirection vers Google
   - ✅ Pas d'erreur `redirect_uri_mismatch`
   - ✅ Après autorisation, retour vers `btpsmartpro.com`

---

## 🎯 Résultat Final

**Avant** :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

**Après** :
```
https://api.btpsmartpro.com/functions/v1/google-calendar-callback
```

**L'utilisateur verra maintenant `api.btpsmartpro.com` au lieu de `renmjmqlmafqjzldmsgs.supabase.co` !** ✅

---

## 🚨 Troubleshooting

### Problème 1 : "Domain not found" dans Vercel

**Solution** : Vérifiez que le DNS est bien configuré et attendu 5-30 minutes.

### Problème 2 : "502 Bad Gateway"

**Solution** : Vérifiez que le fichier `api/functions/[...path].ts` est bien déployé sur Vercel.

### Problème 3 : "redirect_uri_mismatch"

**Solution** : Vérifiez que `GOOGLE_REDIRECT_URI` dans Supabase et Google Cloud Console utilisent bien `api.btpsmartpro.com`.

---

## 📝 Checklist

- [ ] Fichier `api/functions/[...path].ts` créé
- [ ] Domaine `api.btpsmartpro.com` ajouté dans Vercel
- [ ] DNS configuré (CNAME)
- [ ] DNS propagé (attendu 5-30 min)
- [ ] `GOOGLE_REDIRECT_URI` mis à jour dans Supabase
- [ ] Google Cloud Console mis à jour
- [ ] Code déployé sur Vercel
- [ ] Test de connexion Google Calendar réussi

---

**Une fois toutes ces étapes complétées, vous utiliserez `api.btpsmartpro.com` au lieu de `renmjmqlmafqjzldmsgs.supabase.co` !** 🎉
