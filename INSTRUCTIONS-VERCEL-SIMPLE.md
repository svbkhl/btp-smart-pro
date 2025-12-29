# 🚀 Instructions Vercel - Simple et Rapide

## 📋 Variables à Ajouter (5 variables minimum)

### Sur la page Vercel, clique sur **"Environment Variables"**

Ajoute ces 5 variables **UNE PAR UNE** :

---

### ✅ Variable 1
**Nom** : `VITE_SUPABASE_URL`  
**Valeur** : `https://renmjmqlmafqjzldmsgs.supabase.co`  
**Environnements** : Coche Production, Preview, Development

---

### ✅ Variable 2
**Nom** : `VITE_SUPABASE_PUBLISHABLE_KEY`  
**Valeur** : (Va sur Supabase Dashboard → Settings → API → Copie la clé "anon public")  
**Environnements** : Coche Production, Preview, Development

**Où trouver la valeur** :
1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet
3. Settings → API
4. Sous "Project API keys", trouve "anon" → "public"
5. Copie la clé (elle commence par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

---

### ✅ Variable 3
**Nom** : `PUBLIC_URL`  
**Valeur** : `https://btp-smart-pro-temp.vercel.app`  
**Environnements** : Coche Production, Preview, Development

**⚠️ Note** : C'est une URL temporaire. Après le déploiement, tu la mettras à jour avec la vraie URL que Vercel te donnera.

---

### ✅ Variable 4
**Nom** : `PRODUCTION_URL`  
**Valeur** : `https://btp-smart-pro-temp.vercel.app`  
**Environnements** : Coche Production, Preview, Development

**⚠️ Note** : Même URL temporaire. Tu la mettras à jour après le déploiement.

---

### ✅ Variable 5
**Nom** : `VITE_PUBLIC_URL`  
**Valeur** : `https://btp-smart-pro-temp.vercel.app`  
**Environnements** : Coche Production, Preview, Development

**⚠️ Note** : Même URL temporaire. Tu la mettras à jour après le déploiement.

---

## 🎯 Comment Ajouter Chaque Variable

1. Clique sur **"Add"** ou le bouton **"+"**
2. Dans **"Name"** : Copie le nom exact (ex: `VITE_SUPABASE_URL`)
   - ⚠️ Pas d'espaces, pas de tirets, pas de signe =
3. Dans **"Value"** : Colle la valeur
   - ⚠️ Pas de guillemets autour
4. Coche les 3 environnements : **Production**, **Preview**, **Development**
5. Clique sur **"Save"**
6. Répète pour chaque variable

---

## ✅ Après Avoir Ajouté les 5 Variables

1. Clique sur **"Deploy"**
2. Attends que le déploiement se termine
3. Vercel te donnera une URL (ex: `https://btp-smart-pro-abc123.vercel.app`)

---

## 🔄 Mise à Jour des URLs Après le Déploiement

1. **Copie l'URL** que Vercel te donne
2. Va dans **Vercel Dashboard** → Ton projet → **Settings** → **Environment Variables**
3. **Modifie** ces 3 variables avec la vraie URL :
   - `PUBLIC_URL` → Mets la vraie URL
   - `PRODUCTION_URL` → Mets la vraie URL
   - `VITE_PUBLIC_URL` → Mets la vraie URL
4. Vercel redéploie automatiquement 🎉

---

## 📝 Checklist

- [ ] Variable 1 : `VITE_SUPABASE_URL` ajoutée
- [ ] Variable 2 : `VITE_SUPABASE_PUBLISHABLE_KEY` ajoutée (avec la vraie clé depuis Supabase)
- [ ] Variable 3 : `PUBLIC_URL` ajoutée (URL temporaire OK)
- [ ] Variable 4 : `PRODUCTION_URL` ajoutée (URL temporaire OK)
- [ ] Variable 5 : `VITE_PUBLIC_URL` ajoutée (URL temporaire OK)
- [ ] Toutes les variables ont les 3 environnements cochés
- [ ] Clique sur "Deploy"

---

## ⚠️ Erreurs à Éviter

❌ **Ne mets PAS** :
- Des tirets dans le nom : `VITE-SUPABASE-URL` ❌
- Des espaces : `VITE SUPABASE URL` ❌
- Le signe = dans le nom : `VITE_SUPABASE_URL=` ❌
- Des guillemets autour de la valeur : `"https://..."` ❌

✅ **Mets EXACTEMENT** :
- Le nom tel quel : `VITE_SUPABASE_URL` ✅
- La valeur sans guillemets : `https://renmjmqlmafqjzldmsgs.supabase.co` ✅

---

**🎯 C'est tout ! Une fois les 5 variables ajoutées, clique sur "Deploy" !**














