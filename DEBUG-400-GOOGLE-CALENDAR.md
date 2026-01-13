# 🐛 Debug: Erreur 400 sur google-calendar-oauth-entreprise-pkce

## 🔍 Problème

L'Edge Function `google-calendar-oauth-entreprise-pkce` retourne une erreur 400 lors de l'échange du code OAuth.

## ✅ Corrections apportées

### 1. Vérification du rôle (ligne 112-130)
- ✅ **Avant** : Vérifiait uniquement `owner`
- ✅ **Après** : Vérifie `owner` OU `admin`
- ✅ Ajout de logs détaillés pour le debugging

### 2. Parsing du body (ligne 173-190)
- ✅ Gestion d'erreur améliorée lors du parsing JSON
- ✅ Logs du body complet pour debugging

### 3. Récupération de l'action (ligne 128-140)
- ✅ L'action peut maintenant être dans l'URL (`?action=exchange_code`) OU dans le body
- ✅ Logs de la méthode, URL et action

---

## 🔧 Vérifications à faire

### 1. Vérifier les logs Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Sélectionnez** `google-calendar-oauth-entreprise-pkce`
3. **Lancez une connexion** Google Calendar
4. **Vérifiez les logs** pour voir :
   - `🔍 [Request] Action:` - doit être `exchange_code`
   - `🔍 [exchange_code] Body complet:` - doit montrer tous les paramètres
   - `✅ [Role check] User has permission:` - doit être `owner` ou `admin`
   - `🔍 [exchange_code] Paramètres reçus:` - doit montrer code, state, company_id

### 2. Vérifier votre rôle

Exécutez ce script SQL pour vérifier votre rôle :

```sql
SELECT 
  cu.user_id,
  cu.company_id,
  r.slug AS role_slug,
  r.name AS role_name
FROM public.company_users cu
JOIN public.roles r ON r.id = cu.role_id
WHERE cu.user_id = auth.uid();
```

**Résultat attendu** : `role_slug` doit être `'owner'` ou `'admin'`

Si ce n'est pas le cas, exécutez : `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`

### 3. Vérifier les paramètres envoyés

Dans la console du navigateur (F12), vous devriez voir :
```
🔍 [useExchangeGoogleCode] Paramètres d'échange:
  - code: present
  - code_verifier: present (ou missing)
  - state: present
  - company_id: [UUID]
```

---

## 🚀 Redéployer l'Edge Function

Après les corrections, **redéployez l'Edge Function** :

### Option 1 : Via Dashboard Supabase (recommandé)

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth-entreprise-pkce`
3. **Cliquez sur** "Edit"
4. **Ouvrez le fichier** : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`
5. **Sélectionnez TOUT** le contenu (Cmd+A)
6. **Copiez** (Cmd+C)
7. **Collez dans l'éditeur Supabase** (Cmd+V)
8. **Cliquez sur** "Deploy"

### Option 2 : Via CLI

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy google-calendar-oauth-entreprise-pkce
```

---

## 📋 Checklist de debugging

- [ ] Edge Function redéployée avec les corrections
- [ ] Votre rôle est `owner` ou `admin` (vérifié via SQL)
- [ ] Les logs Supabase montrent les paramètres reçus
- [ ] Le `company_id` est présent dans les logs
- [ ] Le `code` est présent dans les logs
- [ ] Le `state` est présent dans les logs
- [ ] La vérification du rôle passe (`✅ [Role check] User has permission`)

---

## 🔍 Erreurs courantes

### Erreur : "User not associated with a company"
**Cause** : L'utilisateur n'a pas d'entrée dans `company_users`
**Solution** : Exécutez `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`

### Erreur : "Only company owners or administrators can manage..."
**Cause** : Le rôle n'est pas `owner` ou `admin`
**Solution** : Exécutez `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`

### Erreur : "Company ID manquant"
**Cause** : Le `company_id` n'est pas fourni dans le body ou le state
**Solution** : Vérifiez que `currentCompanyId` est disponible dans `useAuth()`

### Erreur : "code is required"
**Cause** : Le paramètre `code` n'est pas dans le body
**Solution** : Vérifiez que `googleCalendarCode` est présent dans l'URL après la redirection Google

---

## 📝 Après le redéploiement

1. **Testez la connexion** Google Calendar
2. **Vérifiez les logs** Supabase pour voir les nouveaux messages
3. **L'erreur 400 devrait disparaître** si tous les paramètres sont corrects
