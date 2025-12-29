# 🌐 Configurer btpsmartpro.com sur Vercel - Guide Simple

## ✅ ÉTAPE 1 : Ajouter le Domaine dans Vercel

1. **Va sur** : https://vercel.com/dashboard
2. **Clique sur ton projet**
3. **Va dans** : **Settings** → **Domains**
4. **Clique sur** : **"Add"** ou **"Add Domain"**
5. **Entre** : `btpsmartpro.com`
6. **Clique sur** : **"Add"**

---

## ✅ ÉTAPE 2 : Copier les Instructions DNS

Vercel va te montrer quelque chose comme :

```
Configuration DNS requise :

Type: CNAME
Nom: @
Valeur: cname.vercel-dns.com

OU

Type: A
Nom: @
Valeur: 76.76.21.21
```

**⚠️ COPIE EXACTEMENT** ce que Vercel te donne (chaque projet a des valeurs différentes)

---

## ✅ ÉTAPE 3 : Configurer dans ton Registrar

### Si tu utilises amen.fr :

1. **Connecte-toi** à amen.fr
2. **Va dans** : **Gestion de domaine** → **btpsmartpro.com**
3. **Trouve** : **"Zone DNS"** ou **"DNS"** ou **"Enregistrements DNS"**
4. **Ajoute l'enregistrement** :

**Pour btpsmartpro.com :**
- **Type** : `CNAME` (ou `A` selon ce que Vercel te donne)
- **Nom** : `@` (ou laisse vide)
- **Valeur** : Ce que Vercel te donne (ex: `cname.vercel-dns.com`)
- **TTL** : `3600` (ou par défaut)

**Pour www.btpsmartpro.com (optionnel) :**
- **Type** : `CNAME`
- **Nom** : `www`
- **Valeur** : Ce que Vercel te donne
- **TTL** : `3600`

5. **Sauvegarde**
6. **Attends 10-30 minutes**

---

## ✅ ÉTAPE 4 : Vérifier dans Vercel

1. **Retourne dans** Vercel → Ton Projet → Settings → Domains
2. **Tu devrais voir** :
   - ✅ `btpsmartpro.com` avec le statut **"Valid Configuration"**
   - ⏳ Ou **"Pending"** (en attente de propagation DNS)

3. **Si c'est "Pending"** :
   - Attends encore 10-20 minutes
   - Rafraîchis la page
   - Ça devrait passer à "Valid" automatiquement

---

## ✅ ÉTAPE 5 : Mettre à Jour PUBLIC_URL dans Supabase

Une fois que le domaine fonctionne :

1. **Va dans** : Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. **Trouve** `PUBLIC_URL` (ou crée-le)
3. **Mets la valeur** : `https://btpsmartpro.com`
4. **Sauvegarde**

---

## 🆘 Si ça ne Marche Pas

### Option A : Vérifier les DNS

1. **Va sur** : https://dnschecker.org
2. **Entre** : `btpsmartpro.com`
3. **Vérifie** que les DNS sont propagés partout dans le monde

### Option B : Changer les Nameservers (Plus Simple)

1. **Dans Vercel**, va dans Settings → Domains → btpsmartpro.com
2. **Vercel te donnera** des nameservers comme :
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
3. **Dans amen.fr** (ou ton registrar), trouve **"Nameservers"** ou **"Serveurs de noms"**
4. **Remplace** les nameservers actuels par ceux de Vercel
5. **Attends 24-48 heures** (plus long mais Vercel gère tout automatiquement)

---

## 📋 Checklist

- [ ] Domaine ajouté dans Vercel : `btpsmartpro.com`
- [ ] Instructions DNS copiées depuis Vercel
- [ ] Enregistrements DNS ajoutés dans ton registrar
- [ ] Attendu 10-30 minutes pour la propagation
- [ ] Domaine vérifié dans Vercel (statut "Valid")
- [ ] `PUBLIC_URL` mis à jour dans Supabase : `https://btpsmartpro.com`
- [ ] Site accessible sur `https://btpsmartpro.com`

---

## 🎯 Résumé Ultra-Rapide

1. **Vercel** → Settings → Domains → Add → `btpsmartpro.com`
2. **Copie** les DNS de Vercel
3. **amen.fr** (ou ton registrar) → Zone DNS → Ajoute les enregistrements
4. **Attends** 10-30 minutes
5. **Vérifie** dans Vercel
6. **C'est fait !** 🎉

**Dis-moi où tu bloques !** 🚀














