# 🚀 Redéploiement des Edge Functions Google Calendar

## 📋 Fonctions à Redéployer

1. **google-calendar-oauth-entreprise-pkce** - OAuth avec PKCE
2. **google-calendar-sync-entreprise** - Synchronisation des événements

---

## 🎯 Méthode 1 : Via Supabase Dashboard (Recommandé)

### Étape 1 : Accéder aux Edge Functions

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions**

### Étape 2 : Redéployer chaque fonction

#### Fonction 1 : google-calendar-oauth-entreprise-pkce

1. Trouvez la fonction `google-calendar-oauth-entreprise-pkce` dans la liste
2. Cliquez sur les **3 points** (menu) à droite
3. Cliquez sur **"Redeploy"** ou **"Deploy"**
4. Attendez que le déploiement se termine (✅ vert)

#### Fonction 2 : google-calendar-sync-entreprise

1. Trouvez la fonction `google-calendar-sync-entreprise` dans la liste
2. Cliquez sur les **3 points** (menu) à droite
3. Cliquez sur **"Redeploy"** ou **"Deploy"**
4. Attendez que le déploiement se termine (✅ vert)

---

## 💻 Méthode 2 : Via Supabase CLI

### Étape 1 : Se connecter à Supabase

```bash
supabase login
```

Suivez les instructions pour vous connecter avec votre compte Supabase.

### Étape 2 : Lier le projet (si pas déjà fait)

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase link --project-ref renmjmqlmafqjzldmsgs
```

### Étape 3 : Redéployer les fonctions

#### Redéployer google-calendar-oauth-entreprise-pkce

```bash
supabase functions deploy google-calendar-oauth-entreprise-pkce --no-verify-jwt
```

#### Redéployer google-calendar-sync-entreprise

```bash
supabase functions deploy google-calendar-sync-entreprise --no-verify-jwt
```

### Étape 4 : Vérifier le déploiement

```bash
supabase functions list
```

Vous devriez voir les deux fonctions listées.

---

## 🎯 Méthode 3 : Script Automatique

J'ai créé un script pour automatiser le redéploiement :

### Exécuter le script

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
./redeply-google-calendar-functions.sh
```

**Prérequis** :
- Supabase CLI installé : `npm install -g supabase`
- Connecté : `supabase login`
- Projet lié : `supabase link --project-ref renmjmqlmafqjzldmsgs`

---

## ✅ Vérification du Redéploiement

### Vérifier dans le Dashboard

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions**
2. Vérifiez que les deux fonctions sont **actives** (statut vert)
3. Vérifiez la **dernière mise à jour** (doit être récente)

### Vérifier les logs

1. Cliquez sur une fonction
2. Onglet **"Logs"**
3. Vérifiez qu'il n'y a pas d'erreurs récentes

---

## 🔍 En Cas d'Erreur

### Erreur "Function not found"

- Vérifiez que les dossiers existent dans `supabase/functions/`
- Vérifiez l'orthographe exacte des noms de fonctions

### Erreur "Access token not provided"

```bash
supabase login
```

### Erreur "Project not linked"

```bash
supabase link --project-ref renmjmqlmafqjzldmsgs
```

### Erreur de build

- Vérifiez les logs dans le Dashboard
- Vérifiez que toutes les dépendances sont correctes dans les fonctions

---

## 📝 Checklist de Redéploiement

- [ ] Se connecter à Supabase CLI (`supabase login`) OU utiliser le Dashboard
- [ ] Lier le projet (`supabase link`) si via CLI
- [ ] Redéployer `google-calendar-oauth-entreprise-pkce`
- [ ] Redéployer `google-calendar-sync-entreprise`
- [ ] Vérifier que les fonctions sont actives dans le Dashboard
- [ ] Vérifier les logs pour détecter d'éventuelles erreurs
- [ ] Tester la connexion Google Calendar dans l'app

---

## 🧪 Test Après Redéploiement

1. Allez dans votre application
2. **Paramètres** → **Intégrations** → **Google Calendar**
3. Cliquez sur **"Connecter Google Calendar"**
4. Vous devriez être redirigé vers Google OAuth
5. Autorisez l'accès
6. Vous serez redirigé vers l'app avec la connexion établie

Si ça fonctionne, le redéploiement est réussi ! ✅

---

## 🚀 Prochaines Étapes

Après le redéploiement réussi :

1. ✅ Vérifier que les secrets Supabase sont configurés
2. ✅ Vérifier que les scripts SQL ont été exécutés
3. ✅ Tester la connexion Google Calendar
4. ✅ Tester la synchronisation d'un événement

