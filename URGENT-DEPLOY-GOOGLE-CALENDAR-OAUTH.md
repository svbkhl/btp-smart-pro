# 🚨 URGENT : Déployer google-calendar-oauth

## 🔍 Problème

La fonction `google-calendar-oauth` **n'est pas déployée** dans Supabase, mais le frontend en production essaie de l'appeler.

**Résultat** : Erreur CORS car la fonction n'existe pas ou ne répond pas correctement au preflight.

---

## ✅ Solution : Déployer la Fonction

### Via Dashboard (Recommandé - Plus Rapide)

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions**
2. Cliquez sur **"Deploy a new function"** (en haut à droite)
3. Sélectionnez **"Deploy from local directory"** ou **"Upload"**
4. Naviguez vers : `supabase/functions/google-calendar-oauth`
5. Cliquez sur **"Deploy"**

### Via CLI

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

---

## ✅ Vérification

Après le déploiement :

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions**
2. Vérifiez que **`google-calendar-oauth`** apparaît dans la liste
3. Testez la connexion Google Calendar dans l'app
4. Vérifiez les logs de la fonction (devrait maintenant avoir des entrées)

---

## 📝 Pourquoi ça ne marche pas ?

Le frontend en production (Vercel) utilise encore l'ancien code qui appelle `google-calendar-oauth`.

**Deux solutions** :
1. **Déployer `google-calendar-oauth`** (solution immédiate) ✅
2. **Redéployer le frontend** pour utiliser `google-calendar-oauth-entreprise-pkce` (solution définitive)

---

## 🚀 Action Immédiate

**Déployez `google-calendar-oauth` MAINTENANT** :

```bash
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

OU via le Dashboard Supabase (plus simple).

Une fois déployée, la fonction sera appelée et vous verrez des logs.
