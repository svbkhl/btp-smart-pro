# 🔧 Comment Configurer PUBLIC_URL dans Supabase

## 📋 Étapes Détaillées

### Étape 1 : Trouver ton URL Vercel

Tu as deux options :

**Option A : URL Vercel par défaut**
- Va sur https://vercel.com
- Connecte-toi
- Va dans ton projet "BTP SMART PRO"
- Tu verras l'URL : `https://btp-smart-pro-xxxxx.vercel.app`
- **Copie cette URL** (c'est celle que tu vas utiliser)

**Option B : Domaine personnalisé**
- Si tu as déjà configuré ton domaine (amen.fr)
- Utilise : `https://ton-domaine.com` ou `https://www.ton-domaine.com`

---

### Étape 2 : Aller dans Supabase

1. **Ouvre** : https://supabase.com/dashboard
2. **Sélectionne ton projet** : `renmjmqlmafqjzldmsgs`
3. **Clique sur** : **Settings** (⚙️ en bas à gauche dans le menu)
4. **Clique sur** : **Edge Functions** (dans le menu de gauche)
5. **Clique sur** : **Secrets** (onglet en haut de la page)

---

### Étape 3 : Ajouter le Secret PUBLIC_URL

1. **Clique sur** : **"Add new secret"** (bouton en haut à droite)
2. **Dans le champ "Name"** : Tape exactement `PUBLIC_URL`
   - ⚠️ **IMPORTANT** : Pas d'espaces, pas de tirets, tout en majuscules
3. **Dans le champ "Value"** : Colle ton URL Vercel
   - Exemple : `https://btp-smart-pro-xyz123.vercel.app`
   - Ou : `https://ton-domaine.com`
   - ⚠️ **IMPORTANT** : Commence par `https://` et ne termine PAS par `/`
4. **Clique sur** : **"Save"** ou **"Add secret"**

---

### Étape 4 : Vérifier

1. Tu devrais voir `PUBLIC_URL` dans la liste des secrets
2. Vérifie que la valeur est correcte (clique dessus pour voir)

---

## ✅ Exemple Visuel

```
┌─────────────────────────────────────┐
│  Supabase Dashboard                 │
│                                     │
│  Settings → Edge Functions → Secrets│
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Add new secret                │  │
│  └───────────────────────────────┘  │
│                                     │
│  Name:  PUBLIC_URL                   │
│  Value: https://ton-app.vercel.app  │
│                                     │
│  [Save]                              │
└─────────────────────────────────────┘
```

---

## 🚨 Erreurs à Éviter

❌ **Ne PAS mettre** :
- `PUBLIC-URL` (avec tiret)
- `public_url` (en minuscules)
- `PUBLIC URL` (avec espace)
- `https://ton-app.vercel.app/` (avec slash à la fin)

✅ **Mettre** :
- `PUBLIC_URL` (tout en majuscules, underscore)
- `https://ton-app.vercel.app` (sans slash à la fin)

---

## 🎯 Si tu ne connais pas ton URL Vercel

1. Va sur https://vercel.com
2. Connecte-toi
3. Va dans **Dashboard**
4. Clique sur ton projet "BTP SMART PRO"
5. En haut de la page, tu verras l'URL de déploiement
6. **Copie cette URL** (elle ressemble à `https://btp-smart-pro-xxxxx.vercel.app`)

---

## ✅ Une fois Configuré

Teste que ça fonctionne :

1. Connecte-toi en admin dans l'app
2. Va dans "Paramètres" → "Gestion des Entreprises"
3. Crée une entreprise
4. Clique sur "Inviter Dirigeant"
5. Entre un email
6. L'invitation devrait être créée et l'email envoyé (si RESEND_API_KEY est configuré)

---

**🎉 C'est tout ! Une fois `PUBLIC_URL` configuré, les liens d'invitation fonctionneront correctement.**














