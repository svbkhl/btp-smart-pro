# 📋 Comment Copier les Logs Supabase

## 🎯 Objectif

Récupérer les logs exacts de l'Edge Function pour diagnostiquer l'erreur 400.

---

## ✅ Étape 1 : Accéder aux Logs

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Cliquez sur** : **Edge Functions** (dans le menu de gauche)

3. **Cliquez sur** : **send-invitation**

4. **Cliquez sur l'onglet** : **Logs** (en haut)

---

## ✅ Étape 2 : Déclencher l'Invitation

1. **Ouvrez votre application** dans un autre onglet
2. **Allez dans** : Paramètres → Inviter un utilisateur
3. **Entrez un email de test** (ex: `test@example.com`)
4. **Cliquez sur** : "Envoyer l'invitation"

---

## ✅ Étape 3 : Copier les Logs

1. **Revenez dans** Supabase Dashboard → Edge Functions → send-invitation → Logs

2. **Vous devriez voir** des logs récents avec des emojis :
   - `📩 Raw body received:`
   - `📦 Parsed body:`
   - `📧 Processing invitation for email:`
   - `🔑 ENV:`
   - `✅ Supabase admin client created`
   - `🚀 Calling inviteUserByEmail for:`
   - `❌ Error inviting user:` (si erreur)
   - `✅ Invitation sent successfully to:` (si succès)

3. **Sélectionnez TOUS les logs** de l'appel récent (depuis `📩 Raw body` jusqu'à la fin)

4. **Copiez** (Cmd+C ou Ctrl+C)

5. **Collez-les ici** dans la conversation

---

## 📊 Exemple de ce que je veux voir

```
📩 Raw body received: {"email":"test@example.com"}
📦 Parsed body: {"email":"test@example.com"}
📧 Processing invitation for email: test@example.com
🔑 ENV: {
  "url": "https://renmjmqlmafqjzldmsgs.supabase.co",
  "keyLoaded": true,
  "keyLength": 200,
  "keyPrefix": "eyJhbGciOiJIUzI1NiIs...",
  "hasServiceRoleKey": true,
  "hasSupabaseServiceRoleKey": false
}
✅ Supabase admin client created
🚀 Calling inviteUserByEmail for: test@example.com
❌ Error inviting user: {
  "message": "User already registered",
  "status": 400,
  "name": "AuthApiError"
}
```

---

## 🎯 Points Importants à Vérifier

### 1. Le log `🔑 ENV:`

**Si vous voyez** :
```json
{
  "keyLoaded": false,
  "keyLength": 0
}
```
→ La clé n'est pas configurée

**Si vous voyez** :
```json
{
  "keyLoaded": true,
  "keyLength": 200+
}
```
→ La clé est chargée ✅

---

### 2. Le log `📩 Raw body received:`

**Si vous voyez** :
```
📩 Raw body received: {}
```
→ Le body est vide → Problème frontend

**Si vous voyez** :
```
📩 Raw body received: {"email":"test@example.com"}
```
→ Le body est correct ✅

---

### 3. Le log `❌ Error inviting user:`

**Si vous voyez** :
```
❌ Error inviting user: {
  "message": "User already registered"
}
```
→ L'email est déjà utilisé

**Si vous voyez** :
```
❌ Error inviting user: {
  "message": "Invalid email address"
}
```
→ Format d'email invalide

**Si vous voyez** :
```
❌ Missing environment variables: {
  "hasUrl": false,
  "hasKey": false
}
```
→ Variables d'environnement manquantes

---

## 🚨 Si vous ne voyez AUCUN log

1. **Vérifiez** que vous êtes dans le bon projet Supabase
2. **Vérifiez** que la function `send-invitation` est bien déployée
3. **Attendez** quelques secondes après avoir testé l'invitation
4. **Rafraîchissez** la page des logs (F5)

---

## 📞 Une fois les logs copiés

**Collez-les ici** dans la conversation, et je pourrai :
- ✅ Identifier la cause exacte de l'erreur 400
- ✅ Vous donner la solution précise
- ✅ Corriger le code si nécessaire

---

## 💡 Astuce

Si les logs sont trop longs, copiez au minimum :
- Le log `🔑 ENV:`
- Le log `❌ Error inviting user:` (s'il existe)
- Le dernier log d'erreur visible

Ces 3 éléments suffisent généralement pour diagnostiquer le problème !






