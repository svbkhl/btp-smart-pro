# 🐛 Debug: Erreur 400 sur google-calendar-oauth-entreprise-pkce

## 🔍 Problème

L'Edge Function retourne une erreur 400 lors de l'échange du code OAuth.

## ✅ Vérifications à faire

### 1. Vérifier les logs Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Sélectionnez** `google-calendar-oauth-entreprise-pkce`
3. **Cherchez** les logs récents avec l'erreur 400
4. **Vérifiez** les messages de log qui commencent par :
   - `🔍 [Request] Action:`
   - `🔍 [exchange_code] Body complet:`
   - `✅ [Role check] User has permission:`
   - `❌ [exchange_code]` (pour les erreurs)

### 2. Vérifier votre connexion Google Calendar

Exécutez le script SQL : `VERIFIER-CONNEXION-GOOGLE-CALENDAR.sql`

Ce script va :
- Vérifier si une connexion existe
- Afficher l'état de la connexion (activée/désactivée)
- Vérifier si le token a expiré

### 3. Vérifier votre rôle

Exécutez ce script SQL :

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

### 4. Vérifier les paramètres envoyés

Dans la console du navigateur, vous devriez voir :
```
🔍 [useExchangeGoogleCode] Paramètres d'échange:
  - code: present
  - code_verifier: missing (ou present)
  - state: present
  - company_id: [UUID]
```

Si `company_id` est `missing`, c'est le problème.

---

## 🔧 Causes possibles de l'erreur 400

### 1. Rôle insuffisant
**Erreur dans les logs** : `"Only company owners or administrators can manage Google Calendar connection"`
**Solution** : Exécutez `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`

### 2. Company ID manquant
**Erreur dans les logs** : `"Company ID manquant"`
**Solution** : Vérifiez que `currentCompanyId` est disponible dans `useAuth()`

### 3. Code invalide ou expiré
**Erreur dans les logs** : `"Failed to exchange code for tokens"`
**Solution** : Le code OAuth a peut-être expiré. Relancez la connexion depuis le début.

### 4. State invalide
**Erreur dans les logs** : `"Invalid state: user_id mismatch"`
**Solution** : Le state ne correspond pas. Relancez la connexion.

### 5. Token Google expiré
**Erreur dans les logs** : `"Failed to exchange code for tokens"` avec détails Google
**Solution** : Vérifiez que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont corrects dans Supabase Secrets

---

## 📋 Checklist de debugging

- [ ] Logs Supabase vérifiés
- [ ] Rôle vérifié (owner ou admin)
- [ ] Company ID présent dans les logs
- [ ] Code présent dans les logs
- [ ] State présent dans les logs
- [ ] Connexion Google Calendar vérifiée via SQL
- [ ] Secrets Supabase vérifiés (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

---

## 🚀 Actions à prendre

1. **Vérifiez les logs Supabase** pour voir l'erreur exacte
2. **Exécutez** `VERIFIER-CONNEXION-GOOGLE-CALENDAR.sql` pour voir l'état de la connexion
3. **Si le rôle n'est pas owner/admin**, exécutez `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`
4. **Si la connexion existe mais est désactivée**, reconnectez-vous
5. **Si le token a expiré**, reconnectez-vous

---

## 💡 Après correction

Une fois le problème résolu, vous devriez voir dans l'interface :
- ✅ Badge "Connecté" vert
- ✅ Message "Google Calendar connecté avec succès"
- ✅ Informations du compte Google
- ✅ Boutons "Déconnecter" et "Ouvrir Google Calendar"
