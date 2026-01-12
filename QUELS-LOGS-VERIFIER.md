# 🔍 Quels Logs Vérifier pour l'Erreur 400

## 📍 Où Aller

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions

2. **Dans le filtre en haut**, sélectionnez : `google-calendar-oauth-entreprise-pkce`

3. **Regardez les logs les plus récents** (dernières 5-10 minutes)

---

## 🔍 Ce Qu'il Faut Chercher

### 1. Logs de Démarrage de la Requête

Cherchez ces messages qui doivent apparaître en premier :

```
🔍 [Request] Action: exchange_code
🔍 [Request] Method: POST
🔍 [Request] URL: https://...
```

**✅ Si vous voyez ça** : La requête arrive bien à l'Edge Function

**❌ Si vous ne voyez pas ça** : La requête n'arrive pas ou l'action n'est pas détectée

---

### 2. Logs du Body Reçu

Cherchez :

```
🔍 [exchange_code] Body raw: {"action":"exchange_code","code":"...","state":"...","company_id":"..."}
```

**✅ Si vous voyez ça** : Le body est bien reçu

**❌ Si vous voyez** `❌ [exchange_code] Erreur lors du parsing du body:` : Le body est mal formé

---

### 3. Logs des Paramètres Parsés

Cherchez :

```
🔍 [exchange_code] Body parsé: {hasCode: true, hasCodeVerifier: false, hasState: true, hasCompanyId: true, companyId: "c3a33fdd-..."}
🔍 [exchange_code] Paramètres reçus:
  - code: present
  - code_verifier: missing
  - state: present
  - company_id (body): c3a33fdd-c556-43bb-be06-13680f544062
  - company_id (session): c3a33fdd-c556-43bb-be06-13680f544062
```

**✅ Si vous voyez ça** : Les paramètres sont bien parsés

**❌ Si `company_id` est `not provided` ou `not available`** : C'est le problème !

---

### 4. Logs de Vérification du Rôle

Cherchez :

```
✅ [Role check] User has permission: owner
```

OU

```
✅ [Role check] User has permission: admin
```

**✅ Si vous voyez ça** : Votre rôle est correct

**❌ Si vous voyez** `❌ [Role check] User role is not owner or admin:` : Votre rôle n'est pas suffisant

---

### 5. Logs d'Erreur (LES PLUS IMPORTANTS)

Cherchez tous les messages qui commencent par `❌` :

```
❌ [exchange_code] Code manquant
❌ [exchange_code] Company ID manquant
❌ [exchange_code] Invalid state format
❌ [exchange_code] Google token exchange error: ...
❌ [ERROR] Unhandled error: ...
```

**⚠️ Ces messages vous diront EXACTEMENT quelle est l'erreur !**

---

### 6. Logs de l'Échange Google

Si l'erreur vient de Google, cherchez :

```
❌ [exchange_code] Google token exchange error: {...}
❌ [exchange_code] Status: 400
```

Ces logs contiendront l'erreur exacte retournée par Google.

---

## 📋 Checklist de Vérification

Copiez-collez ici les logs que vous trouvez pour chaque section :

- [ ] **Logs de démarrage** : `🔍 [Request] Action:`
- [ ] **Body reçu** : `🔍 [exchange_code] Body raw:`
- [ ] **Paramètres parsés** : `🔍 [exchange_code] Body parsé:`
- [ ] **Vérification rôle** : `✅ [Role check]` ou `❌ [Role check]`
- [ ] **Erreurs** : Tous les `❌ [exchange_code]` ou `❌ [ERROR]`

---

## 🎯 Ce Qu'il Faut Me Partager

**Copiez-collez ici** :
1. Tous les logs qui contiennent `❌`
2. Les logs `🔍 [exchange_code] Body parsé:`
3. Les logs `✅ [Role check]` ou `❌ [Role check]`
4. Les logs `❌ [exchange_code] Google token exchange error:` (si présents)

---

## 💡 Astuce

Dans les logs Supabase, vous pouvez :
- **Filtrer par niveau** : Cliquez sur "Error" pour voir seulement les erreurs
- **Rechercher** : Utilisez Ctrl+F (Cmd+F) pour chercher `❌` ou `ERROR`
- **Trier par date** : Les logs les plus récents sont en haut

---

## 🔧 Si Vous Ne Voyez Aucun Log

Si vous ne voyez aucun log pour `google-calendar-oauth-entreprise-pkce` :

1. **Vérifiez que l'Edge Function est bien déployée** :
   - https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
   - Vérifiez que `google-calendar-oauth-entreprise-pkce` existe

2. **Vérifiez que vous testez bien la connexion** :
   - Allez dans Paramètres > Intégrations
   - Cliquez sur "Connecter Google Calendar"
   - Autorisez sur Google
   - Attendez la redirection

3. **Attendez quelques secondes** après la requête pour que les logs apparaissent
