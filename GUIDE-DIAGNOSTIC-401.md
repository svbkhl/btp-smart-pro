# 🔍 Guide de Diagnostic - Erreur 401

## 🎯 Objectif

Trouver la cause exacte de l'erreur 401 en vérifiant les logs Supabase.

---

## ✅ Étape 1 : Vérifier les logs Supabase

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Allez dans** : **Edge Functions** → **send-invitation** → **Logs**

3. **Testez l'invitation** depuis l'application

4. **Cherchez** dans les logs récents le log : `🔑 ENV:`

---

## 📊 Interprétation des logs

### ✅ Si vous voyez :

```json
{
  "url": "https://renmjmqlmafqjzldmsgs.supabase.co",
  "keyLoaded": true,
  "keyLength": 200+,
  "keyPrefix": "eyJhbGciOiJIUzI1NiIs...",
  "hasServiceRoleKey": true,
  "hasSupabaseServiceRoleKey": false
}
```

→ **La clé est chargée** → Le problème vient d'ailleurs (peut-être l'authentification JWT)

---

### ❌ Si vous voyez :

```json
{
  "url": "https://renmjmqlmafqjzldmsgs.supabase.co",
  "keyLoaded": false,
  "keyLength": 0,
  "keyPrefix": "MISSING",
  "hasServiceRoleKey": false,
  "hasSupabaseServiceRoleKey": false
}
```

→ **PROBLÈME** : La clé n'est pas configurée

**Solution** :
1. Allez dans **Edge Functions** → **send-invitation** → **Settings** → **Environment variables**
2. Ajoutez **les deux** :
   - `SERVICE_ROLE_KEY` = votre clé service_role
   - `SUPABASE_SERVICE_ROLE_KEY` = la même clé (pour compatibilité)
3. **Redéployez** la function

---

### ⚠️ Si vous voyez :

```json
{
  "url": "MISSING",
  "keyLoaded": false
}
```

→ **PROBLÈME** : `SUPABASE_URL` n'est pas configuré

**Solution** :
1. Ajoutez `SUPABASE_URL` = `https://renmjmqlmafqjzldmsgs.supabase.co`
2. Redéployez

---

## ✅ Étape 2 : Vérifier la configuration dans Supabase Dashboard

### Dans Edge Functions → send-invitation → Settings → Environment variables

Vous devez avoir **EXACTEMENT** :

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://renmjmqlmafqjzldmsgs.supabase.co` |
| `SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...` (votre clé complète) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...` (la même clé) |

**⚠️ IMPORTANT** :
- Pas d'espace avant/après les valeurs
- Pas de retour à la ligne
- Les noms doivent être exactement en majuscules
- La clé doit être la clé **`service_role`** (pas `anon`)

---

## ✅ Étape 3 : Vérifier verify_jwt

Le fichier `supabase/config.toml` a été mis à jour avec :

```toml
[functions.send-invitation]
verify_jwt = false
```

Cela rend la function accessible sans authentification JWT requise.

**Note** : Cette configuration est pour le développement local. En production, Supabase utilise les settings du Dashboard.

---

## ✅ Étape 4 : Redéployer

Après avoir ajouté/modifié les variables d'environnement :

1. **Redéployez** la function :
   ```bash
   supabase functions deploy send-invitation --project-ref renmjmqlmafqjzldmsgs
   ```

2. **OU** via le Dashboard :
   - **Edge Functions** → **send-invitation** → **Redeploy**

---

## 📋 Checklist Complète

- [ ] J'ai vérifié les logs Supabase → Cherché `🔑 ENV:`
- [ ] J'ai ajouté `SUPABASE_URL` dans Environment variables
- [ ] J'ai ajouté `SERVICE_ROLE_KEY` dans Environment variables
- [ ] J'ai ajouté `SUPABASE_SERVICE_ROLE_KEY` dans Environment variables (même valeur)
- [ ] Les valeurs n'ont pas d'espace avant/après
- [ ] J'ai utilisé la clé `service_role` (pas `anon`)
- [ ] J'ai redéployé la function
- [ ] Les logs montrent `keyLoaded: true`

---

## 🎯 Résultat Attendu

Après avoir tout configuré :

1. **Les logs montrent** :
   ```json
   {
     "keyLoaded": true,
     "keyLength": 200+
   }
   ```

2. **L'invitation fonctionne** :
   - Plus d'erreur 401
   - Toast de succès affiché
   - Invitation envoyée

---

## 📞 Si ça ne fonctionne toujours pas

**Partagez-moi** :
1. Le log `🔑 ENV:` complet depuis Supabase
2. Une capture d'écran de vos Environment variables (masquez la clé)
3. Le message d'erreur exact

Et je pourrai vous donner la solution exacte ! 🔧






