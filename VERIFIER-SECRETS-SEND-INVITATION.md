# ✅ Vérification des Secrets pour send-invitation

## 🎯 Étape 2 : Vérifier SERVICE_ROLE_KEY dans Supabase

### 📍 Accès au Dashboard

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Allez dans** : **Settings** (⚙️ en bas à gauche) → **Edge Functions** → **Secrets**

### ✅ Secrets Requis

Vérifiez que ces secrets sont configurés :

#### 1. **SUPABASE_URL** (généralement déjà présent)
- **Nom** : `SUPABASE_URL`
- **Valeur** : `https://renmjmqlmafqjzldmsgs.supabase.co`
- **Status** : ✅ Doit être présent

#### 2. **SERVICE_ROLE_KEY** (CRITIQUE - À VÉRIFIER)
- **Nom** : `SERVICE_ROLE_KEY`
- **Valeur** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (votre clé service_role)
- **Status** : ⚠️ **À VÉRIFIER**

**Comment trouver votre SERVICE_ROLE_KEY** :
1. Dans le Dashboard → **Settings** → **API**
2. Section **Project API keys**
3. Copiez la clé **`service_role`** (⚠️ PAS `anon` ou `service_role` secret)
4. C'est une longue chaîne qui commence par `eyJ...`

### 🔧 Si SERVICE_ROLE_KEY n'existe pas

1. **Cliquez sur** : **"Add new secret"**
2. **Name** : `SERVICE_ROLE_KEY`
3. **Value** : Collez votre clé service_role (depuis Settings → API)
4. **Cliquez sur** : **"Save"**

### 🔄 Alternative : SUPABASE_SERVICE_ROLE_KEY

Si vous avez déjà configuré `SUPABASE_SERVICE_ROLE_KEY`, c'est OK aussi !
La fonction essaie d'abord `SERVICE_ROLE_KEY`, puis `SUPABASE_SERVICE_ROLE_KEY` en fallback.

---

## ✅ Checklist de Vérification

- [ ] `SUPABASE_URL` est configuré
- [ ] `SERVICE_ROLE_KEY` OU `SUPABASE_SERVICE_ROLE_KEY` est configuré
- [ ] La valeur de la clé commence par `eyJ...`
- [ ] La clé n'est pas la clé `anon` (doit être `service_role`)

---

## 🧪 Test Rapide

Après avoir configuré les secrets, testez l'invitation :

1. **Ouvrez l'application**
2. **Allez dans** : Paramètres → Gestion des Entreprises
3. **Cliquez sur** : "Inviter un utilisateur"
4. **Entrez un email** : `test@example.com`
5. **Cliquez sur** : "Envoyer l'invitation"

**Résultat attendu** :
- ✅ Toast de succès : "Invitation envoyée avec succès"
- ❌ Si erreur 400/500 : Vérifiez les logs dans Supabase Dashboard → Edge Functions → Logs

---

## 📊 Vérifier les Logs

Si ça ne fonctionne toujours pas :

1. **Dashboard** → **Edge Functions** → **send-invitation** → **Logs**
2. **Cherchez** les erreurs récentes
3. **Vérifiez** les messages comme :
   - `❌ Missing environment variables`
   - `❌ Error inviting user`

---

## 🎉 Une fois configuré

- ✅ Plus d'erreur 400
- ✅ Plus de "Forbidden admin"
- ✅ Invitations envoyées avec succès
- ✅ Toasts affichés correctement






