# 🔧 INSTRUCTIONS FINALES DE DEBUG

## ❗ IMPORTANT

Le problème persiste malgré toutes les corrections. Voici les étapes **OBLIGATOIRES** pour identifier la cause exacte :

---

## 📋 ÉTAPE 1 : Exécuter le test SQL final

1. Ouvrez Supabase Dashboard > SQL Editor
2. Exécutez : `supabase/TEST-RLS-AVEC-JWT.sql`
3. Notez les résultats :
   - Combien d'utilisateurs ?
   - Combien d'entreprises ?
   - Distribution des clients par entreprise

---

## 📋 ÉTAPE 2 : Vérifier les logs de la console

### A. Nettoyage complet

```javascript
// Dans la console du navigateur (F12)
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('supabase-auth-token');
location.reload();
```

### B. Test avec Entreprise A

1. Connectez-vous avec un utilisateur de l'Entreprise A
2. Ouvrez la console (F12) et effacez les logs
3. Allez sur `/clients`
4. **COPIEZ TOUS LES LOGS** qui contiennent :
   - `🔑 [getCurrentCompanyId]`
   - `🔍 [useClients] BEFORE QUERY`
   - `📊 [useClients] AFTER QUERY`

5. **QUESTIONS À RÉPONDRE** :
   - Quel est le `currentCompanyId` affiché ?
   - Combien de clients sont retournés ?
   - Est-ce que TOUS les clients ont le même `company_id` ?
   - Voyez-vous un message `❌ [useClients] RLS FAILURE` ?

### C. Test avec Entreprise B

1. Déconnectez-vous
2. Exécutez à nouveau :
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```
3. Connectez-vous avec un utilisateur de l'Entreprise B
4. Répétez les mêmes étapes que pour l'Entreprise A

### D. Comparez les résultats

**QUESTIONS CRITIQUES** :
1. Le `currentCompanyId` est-il **DIFFÉRENT** entre A et B ?
   - ✅ OUI → RLS devrait fonctionner
   - ❌ NON → C'est le problème principal !

2. Les clients retournés sont-ils **DIFFÉRENTS** entre A et B ?
   - ✅ OUI → Isolation fonctionne
   - ❌ NON → Isolation ne fonctionne pas

3. Dans les logs `[useClients] AFTER QUERY`, tous les clients ont-ils le **MÊME** `company_id` que `currentCompanyId` ?
   - ✅ OUI → RLS fonctionne
   - ❌ NON → RLS ne filtre pas correctement

---

## 📋 ÉTAPE 3 : Fournir les informations

**PARTAGEZ CES INFORMATIONS** :

1. **Résultats SQL** (de ÉTAPE 1)
   - Nombre d'utilisateurs par entreprise
   - Distribution des clients

2. **Logs de la console** (de ÉTAPE 2)
   - Pour Entreprise A
   - Pour Entreprise B

3. **Réponses aux questions**
   - Les `currentCompanyId` sont-ils différents ?
   - Les clients sont-ils différents ?
   - Tous les clients matchent-ils le `currentCompanyId` ?

---

## 🎯 DIAGNOSTIC SELON LES RÉSULTATS

### CAS 1 : `currentCompanyId` identique pour A et B

**Problème** : La fonction `getCurrentCompanyId()` retourne toujours la même entreprise

**Solution** :
- Vérifiez que vous testez avec des **utilisateurs DIFFÉRENTS**
- Ou utilisez le `CompanySelector` si l'utilisateur appartient à plusieurs entreprises

### CAS 2 : `currentCompanyId` différent mais clients identiques

**Problème** : RLS ne filtre pas correctement

**Solution** :
- Vérifiez les policies RLS dans Supabase Dashboard
- Ré-exécutez `supabase/ACTIVER-RLS-FORCE-ABSOLU.sql`

### CAS 3 : Clients retournés avec des `company_id` différents

**Problème** : Le filtre frontend `.eq("company_id", currentCompanyId)` ne fonctionne pas

**Solution** :
- Vérifiez que l'application utilise bien le code mis à jour
- Rechargez complètement l'application (Ctrl+Shift+R)

---

## ⚠️ SI RIEN NE FONCTIONNE

Si après toutes ces étapes le problème persiste, il faudra :

1. Partager les **logs complets** de la console
2. Partager les **résultats SQL**
3. Faire un **dump de la table clients** :

```sql
SELECT id, name, company_id, user_id, created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 20;
```

---

**SUIVEZ CES ÉTAPES DANS L'ORDRE ET PARTAGEZ LES RÉSULTATS !** 🚀
