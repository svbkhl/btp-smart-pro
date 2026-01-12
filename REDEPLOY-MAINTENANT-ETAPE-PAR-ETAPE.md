# 🚀 Redéploiement Edge Function - Guide Étape par Étape

## ⚡ Méthode Rapide (2 minutes)

### Étape 1 : Ouvrir l'Edge Function

1. **Cliquez sur ce lien** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Dans la liste**, trouvez `google-calendar-oauth-entreprise-pkce`
3. **Cliquez sur** "Edit" (ou les 3 points → "Edit")

---

### Étape 2 : Préparer le Code

1. **Ouvrez** le fichier dans votre éditeur : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`
2. **Sélectionnez TOUT** le contenu :
   - `Cmd+A` (Mac) ou `Ctrl+A` (Windows/Linux)
3. **Copiez** :
   - `Cmd+C` (Mac) ou `Ctrl+C` (Windows/Linux)

---

### Étape 3 : Coller dans Supabase

1. **Retournez** dans l'éditeur Supabase (dans votre navigateur)
2. **Sélectionnez TOUT** le contenu existant :
   - `Cmd+A` (Mac) ou `Ctrl+A` (Windows/Linux)
3. **Supprimez** :
   - `Backspace` ou `Delete`
4. **Collez** le nouveau code :
   - `Cmd+V` (Mac) ou `Ctrl+V` (Windows/Linux)

---

### Étape 4 : Déployer

1. **Cliquez sur** le bouton "Deploy" (en haut à droite)
2. **Attendez** le message "Function deployed successfully" (quelques secondes)

---

### Étape 5 : Vérifier

1. **Testez** la connexion Google Calendar
2. **Vérifiez les logs** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
3. **Cherchez** les nouveaux logs avec `🔄 [exchange_code]` et `❌ [exchange_code]`

---

## ✅ C'est Fait !

Après le déploiement, les nouveaux logs vous montreront exactement quelle erreur Google retourne.

---

## 🐛 Si Vous Ne Trouvez Pas "Edit"

1. **Cliquez sur** le nom de la fonction `google-calendar-oauth-entreprise-pkce`
2. **Ou** cliquez sur les **3 points** à droite de la fonction
3. **Sélectionnez** "Edit" dans le menu

---

## 💡 Astuce

Si vous avez plusieurs onglets ouverts :
- **Onglet 1** : Dashboard Supabase avec l'éditeur
- **Onglet 2** : Votre éditeur de code avec le fichier `index.ts`

Cela facilite le copier-coller.
