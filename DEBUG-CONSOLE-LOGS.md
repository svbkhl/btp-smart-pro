# 🐛 DEBUG - Instructions pour récupérer les logs

## ⚠️ IMPORTANT

L'instrumentation a été mise à jour pour afficher les logs directement dans la **console du navigateur**.

---

## 📋 ÉTAPES

### 1. Ouvrir la console du navigateur

1. Appuyez sur **F12** ou **Cmd+Option+I** (Mac)
2. Allez dans l'onglet **"Console"**
3. Effacez les logs existants (clic droit > Clear console)

### 2. Effectuer le test

1. **Nettoyez le cache** :
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

2. **Connectez-vous avec Entreprise A**

3. **Allez sur `/clients`**

4. **Cherchez les logs** dans la console qui commencent par :
   - 🔑 `[getCurrentCompanyId]`
   - 🔍 `[useClients] BEFORE QUERY`
   - 📊 `[useClients] AFTER QUERY`

5. **Notez le `currentCompanyId`** affiché

6. **Déconnectez-vous et nettoyez** :
```javascript
localStorage.clear();
sessionStorage.clear();
```

7. **Connectez-vous avec Entreprise B**

8. **Allez sur `/clients`**

9. **Notez à nouveau le `currentCompanyId`**

### 3. Analyser les logs

**Questions à répondre :**

1. **Quel est le `currentCompanyId` pour l'Entreprise A ?** ________________

2. **Quel est le `currentCompanyId` pour l'Entreprise B ?** ________________

3. **Sont-ils différents ?**
   - [ ] Oui, ils sont différents (BIEN)
   - [ ] Non, ils sont identiques (PROBLÈME)

4. **Dans les logs `[useClients] AFTER QUERY`, voyez-vous des clients avec un `company_id` différent du `currentCompanyId` ?**
   - [ ] Non, tous les clients ont le même `company_id` que `currentCompanyId` (BIEN)
   - [ ] Oui, certains clients ont un `company_id` différent (PROBLÈME)

5. **Voyez-vous un message `❌ [useClients] RLS FAILURE` dans la console ?**
   - [ ] Non (BIEN - RLS fonctionne)
   - [ ] Oui (PROBLÈME - RLS ne filtre pas correctement)

### 4. Copier les logs

**Copiez TOUS les logs** qui contiennent :
- `[getCurrentCompanyId]`
- `[useClients]`

Et collez-les ici ou dans votre réponse.

---

## 📊 EXEMPLE DE LOGS ATTENDUS

```
🔑 [getCurrentCompanyId] CALLED { userId: "abc123..." }
✅ [getCurrentCompanyId] SUCCESS { userId: "abc123...", companyId: "company-uuid-A" }
🔍 [useClients] BEFORE QUERY { 
  userId: "abc123...",
  userEmail: "user-a@example.com",
  currentCompanyId: "company-uuid-A",
  ...
}
📊 [useClients] AFTER QUERY {
  userId: "abc123...",
  userEmail: "user-a@example.com",
  currentCompanyId: "company-uuid-A",
  clientsCount: 2,
  clients: [
    { id: "...", name: "Client A1", company_id: "company-uuid-A" },
    { id: "...", name: "Client A2", company_id: "company-uuid-A" }
  ],
  allMatchCompanyId: true,
  rlsWorking: true
}
```

---

**Suivez ces étapes et partagez les résultats !**
