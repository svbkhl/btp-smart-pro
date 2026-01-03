# 🚨 URGENT : Voir les Logs Supabase

## ⚠️ Erreur 400 Persistante

Pour identifier la cause exacte, j'ai **BESOIN** des logs de l'Edge Function.

---

## ✅ Comment Voir les Logs

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Cliquez sur** : **Edge Functions** (menu de gauche)

3. **Cliquez sur** : **send-invitation**

4. **Cliquez sur l'onglet** : **Logs** (en haut)

5. **Testez l'invitation** depuis l'application (avec l'email `sabbg.du73100@gmail.com`)

6. **Revenez dans les logs** et cherchez les logs récents

---

## 📊 Ce que je dois voir

Copiez-collez ici **TOUS les logs** qui apparaissent après votre test, notamment :

- `📩 Raw body received:`
- `📦 Parsed body:`
- `📧 Processing invitation for email:`
- `🔑 ENV:`
- `❌ Error inviting user:` (si erreur)
- `❌ Missing or invalid email:` (si erreur)
- `❌ Error parsing JSON body:` (si erreur)
- `❌ Internal Server Error:` (si erreur)

---

## 🎯 Exemple de ce que je cherche

```
📩 Raw body received: {"email":"sabbg.du73100@gmail.com"}
📦 Parsed body: {"email":"sabbg.du73100@gmail.com"}
📧 Processing invitation for email: sabbg.du73100@gmail.com
🔑 ENV: { url: "...", keyLoaded: true, ... }
✅ Supabase admin client created
🚀 Calling inviteUserByEmail for: sabbg.du73100@gmail.com
❌ Error inviting user: { message: "...", status: ... }
```

OU

```
📩 Raw body received: ...
❌ Error parsing JSON body: ...
```

---

## 💡 Astuce

Si les logs sont trop nombreux :
1. **Filtrez** par "error" ou "❌"
2. **Cherchez** les logs les plus récents (en haut)
3. **Copiez** au minimum les 5-10 dernières lignes avec des emojis

---

## 📞 Une fois les logs copiés

**Collez-les ici** dans la conversation, et je pourrai :
- ✅ Identifier la cause exacte du 400
- ✅ Vous donner la solution précise
- ✅ Corriger le code si nécessaire

**Sans ces logs, impossible de savoir pourquoi l'Edge Function retourne 400 !**







