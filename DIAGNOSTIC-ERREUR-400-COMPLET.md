# 🔍 Diagnostic Complet : Erreur 400 Google Calendar OAuth

## 📊 État Actuel

D'après les logs frontend :
- ✅ `code`: present
- ✅ `state`: present  
- ✅ `company_id`: c3a33fdd-c556-43bb-be06-13680f544062
- ⚠️ `code_verifier`: missing (normal si PKCE n'a pas été utilisé)
- ❌ **Erreur 400** de l'Edge Function

---

## 🔍 Étape 1 : Vérifier les Logs Supabase

### 1. Accéder aux Logs

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Sélectionnez** `google-calendar-oauth-entreprise-pkce` dans le filtre
3. **Cherchez** les logs les plus récents (dernières 5 minutes)

### 2. Ce qu'il faut chercher

Cherchez les messages qui commencent par :
- `🔍 [Request] Action:` - Doit être `exchange_code`
- `🔍 [exchange_code] Body raw:` - Le body brut reçu
- `🔍 [exchange_code] Body parsé:` - Les paramètres parsés
- `✅ [Role check] User has permission:` - Doit être `owner` ou `admin`
- `❌ [exchange_code]` - Les erreurs

### 3. Copier les logs

Copiez-collez ici les logs qui contiennent `❌` ou `ERROR` pour que je puisse voir l'erreur exacte.

---

## 🔍 Étape 2 : Vérifier les Secrets Supabase

### 1. Accéder aux Secrets

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. **Section** "Secrets"
3. **Vérifiez** que ces secrets existent :

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### 2. Vérifier GOOGLE_REDIRECT_URI

Le `GOOGLE_REDIRECT_URI` doit être exactement :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

**⚠️ Important** : Il doit pointer vers `google-calendar-callback`, pas `google-calendar-oauth-entreprise-pkce` !

---

## 🔍 Étape 3 : Vérifier votre Rôle

Exécutez ce script SQL dans SQL Editor :

```sql
SELECT 
  cu.user_id,
  cu.company_id,
  r.slug AS role_slug,
  r.name AS role_name
FROM public.company_users cu
JOIN public.roles r ON r.id = cu.role_id
WHERE cu.user_id = (SELECT id FROM auth.users WHERE email = 'sabri.khalfallah6@gmail.com');
```

**Résultat attendu** : `role_slug` doit être `'owner'` ou `'admin'`

Si ce n'est pas le cas, exécutez : `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`

---

## 🔍 Étape 4 : Vérifier la Connexion Google Calendar

Exécutez : `VERIFIER-CONNEXION-GOOGLE-CALENDAR.sql`

Cela vous dira si une connexion existe déjà et son état.

---

## 🔍 Étape 5 : Vérifier l'Edge Function

### 1. Vérifier que l'Edge Function est déployée

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Vérifiez** que `google-calendar-oauth-entreprise-pkce` existe
3. **Vérifiez** la date de dernière mise à jour

### 2. Vérifier le code

Si vous avez accès au code dans le Dashboard, vérifiez qu'il contient les dernières corrections (gestion d'erreurs améliorée).

---

## 🐛 Erreurs Courantes et Solutions

### Erreur : "Only company owners or administrators can manage..."
**Cause** : Rôle insuffisant  
**Solution** : Exécutez `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`

### Erreur : "Company ID manquant"
**Cause** : `company_id` non fourni ou invalide  
**Solution** : Vérifiez que `currentCompanyId` est disponible dans `useAuth()`

### Erreur : "Invalid request body"
**Cause** : Body mal formé  
**Solution** : Vérifiez les logs `🔍 [exchange_code] Body raw:` pour voir le body reçu

### Erreur : "Failed to exchange code for tokens"
**Cause** : Erreur Google API  
**Solution** : Vérifiez les secrets `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`

### Erreur : "Invalid state: user_id mismatch"
**Cause** : Le state ne correspond pas à l'utilisateur  
**Solution** : Relancez la connexion depuis le début

---

## 📋 Checklist de Diagnostic

- [ ] Logs Supabase vérifiés (chercher les `❌`)
- [ ] Secrets Supabase vérifiés (tous présents)
- [ ] `GOOGLE_REDIRECT_URI` correct (pointe vers `google-calendar-callback`)
- [ ] Rôle vérifié (owner ou admin)
- [ ] Edge Function redéployée récemment
- [ ] Connexion Google Calendar vérifiée via SQL

---

## 🚀 Prochaines Étapes

1. **Vérifiez les logs Supabase** et copiez les erreurs ici
2. **Vérifiez les secrets** Supabase
3. **Vérifiez votre rôle** via SQL
4. **Partagez les résultats** pour que je puisse vous aider à résoudre le problème

---

## 💡 Information Importante

Les logs frontend montrent que tous les paramètres sont présents. Le problème vient donc de l'Edge Function elle-même. Les logs Supabase nous diront exactement quelle erreur est retournée.
