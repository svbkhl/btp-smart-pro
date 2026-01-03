# 🔑 Configuration SERVICE_ROLE_KEY - Guide Complet

## ⚠️ Erreur 401 Unauthorized

Si vous avez une erreur **401 Unauthorized**, c'est que l'Edge Function ne trouve pas la clé `SERVICE_ROLE_KEY`.

---

## ✅ Étape 1 : Trouver votre SERVICE_ROLE_KEY

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Allez dans** : **Settings** (⚙️ en bas à gauche) → **API**

3. **Section** : **Project API keys**

4. **Trouvez** : La clé **`service_role`** (⚠️ PAS `anon` public)

   - Elle commence généralement par : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...`
   - C'est une longue chaîne (environ 200+ caractères)
   - **Description** : "full access, secret"

5. **Copiez** cette clé complète (⚠️ Attention : pas d'espace, pas de retour à la ligne)

---

## ✅ Étape 2 : Configurer dans Edge Functions

1. **Dans le Dashboard** : **Edge Functions** → **send-invitation** → **Settings**

2. **Onglet** : **Environment variables** (ou **Secrets**)

3. **Ajoutez/Modifiez** ces variables :

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | `https://renmjmqlmafqjzldmsgs.supabase.co` |
   | `SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...` (votre clé complète) |

4. **⚠️ IMPORTANT** :
   - Pas d'espace avant/après la clé
   - Pas de retour à la ligne
   - Copiez-collez la clé complète
   - Le nom doit être exactement : `SERVICE_ROLE_KEY` (en majuscules)

5. **Cliquez sur** : **Save**

---

## ✅ Étape 3 : Redéployer la Function

Après avoir ajouté les variables, **redéployez** la function :

1. **Dashboard** → **Edge Functions** → **send-invitation**
2. **Cliquez sur** : **Redeploy** (ou utilisez le CLI)

Ou via CLI :
```bash
supabase functions deploy send-invitation --project-ref renmjmqlmafqjzldmsgs
```

---

## ✅ Étape 4 : Vérifier les Logs

1. **Dashboard** → **Edge Functions** → **send-invitation** → **Logs**

2. **Cherchez** le log : `🔑 ENV:`

3. **Vérifiez** que vous voyez :
   ```json
   {
     "url": "https://renmjmqlmafqjzldmsgs.supabase.co",
     "keyLoaded": true,
     "keyLength": 200+,
     "keyPrefix": "eyJhbGciOiJIUzI1NiIs..."
   }
   ```

4. **Si vous voyez** :
   ```json
   {
     "keyLoaded": false,
     "keyLength": 0,
     "keyPrefix": "MISSING"
   }
   ```
   
   → **Le problème** : La clé n'est pas configurée correctement
   
   → **Solution** : Re-vérifiez l'étape 2

---

## 🚨 Erreurs Courantes

### Erreur : "keyLoaded: false"

**Cause** : La variable `SERVICE_ROLE_KEY` n'est pas définie ou mal nommée.

**Solution** :
- Vérifiez que le nom est exactement `SERVICE_ROLE_KEY` (majuscules)
- Vérifiez qu'il n'y a pas d'espace dans le nom
- Redéployez après avoir ajouté la variable

### Erreur : "keyLength: 0"

**Cause** : La valeur de la clé est vide.

**Solution** :
- Copiez à nouveau la clé depuis Settings → API
- Vérifiez qu'il n'y a pas d'espace avant/après
- Vérifiez que vous avez copié la clé complète

### Erreur : "401 Unauthorized" même avec keyLoaded: true

**Cause** : La clé n'est pas la bonne (peut-être la clé `anon` au lieu de `service_role`).

**Solution** :
- Vérifiez que vous avez bien copié la clé **`service_role`** (pas `anon`)
- Dans Settings → API, cherchez la ligne avec "full access, secret"

---

## 📋 Checklist de Vérification

- [ ] J'ai trouvé la clé `service_role` dans Settings → API
- [ ] J'ai copié la clé complète (200+ caractères)
- [ ] J'ai ajouté `SERVICE_ROLE_KEY` dans Edge Functions → Settings → Environment variables
- [ ] J'ai ajouté `SUPABASE_URL` dans Edge Functions → Settings → Environment variables
- [ ] J'ai cliqué sur **Save**
- [ ] J'ai redéployé la function
- [ ] Les logs montrent `keyLoaded: true`

---

## 🎯 Résultat Attendu

Une fois configuré correctement :

- ✅ Plus d'erreur 401
- ✅ Les logs montrent `keyLoaded: true`
- ✅ L'invitation est envoyée avec succès
- ✅ Toast de succès affiché dans l'application

---

## 📞 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs** dans Supabase Dashboard
2. **Partagez** le log `🔑 ENV:` pour diagnostic
3. **Vérifiez** que vous n'avez pas plusieurs projets Supabase ouverts







