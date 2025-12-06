# 🌐 Configurer le Domaine Personnalisé (btpsmartpro.com) sur Vercel

## ✅ ÉTAPE 1 : Vérifier que le Projet est Déployé sur Vercel

1. **Va sur** : https://vercel.com/dashboard
2. **Vérifie** que ton projet est déployé et fonctionne
3. **Note l'URL Vercel** : `https://ton-projet.vercel.app`

---

## ✅ ÉTAPE 2 : Ajouter le Domaine dans Vercel

1. **Dans Vercel Dashboard**, clique sur ton projet
2. **Va dans** : **Settings** → **Domains**
3. **Clique sur** : **"Add"** ou **"Add Domain"**
4. **Entre** : `btpsmartpro.com`
5. **Clique sur** : **"Add"**

---

## ✅ ÉTAPE 3 : Vercel te Donne les Instructions DNS

Vercel va te montrer **2 options** :

### Option A : Configuration CNAME (Recommandé)

Vercel te donnera quelque chose comme :
- **Type** : `CNAME`
- **Nom** : `@` ou `www`
- **Valeur** : `cname.vercel-dns.com` (ou similaire)

### Option B : Configuration A Record

Vercel te donnera quelque chose comme :
- **Type** : `A`
- **Nom** : `@`
- **Valeur** : `76.76.21.21` (ou une autre IP)

---

## ✅ ÉTAPE 4 : Configurer DNS dans ton Registrar

### Méthode 1 : Via le Panneau de Contrôle de ton Registrar

1. **Connecte-toi** à ton compte (amen.fr, OVH, GoDaddy, etc.)
2. **Va dans** : **Gestion de domaine** → **btpsmartpro.com**
3. **Trouve** : **"Zone DNS"** ou **"DNS"** ou **"Enregistrements DNS"**
4. **Ajoute les enregistrements** que Vercel te donne :

#### Pour le domaine principal (btpsmartpro.com) :

**Si Vercel te donne un CNAME :**
- **Type** : `CNAME`
- **Nom** : `@` (ou laisse vide)
- **Valeur** : `cname.vercel-dns.com` (ou ce que Vercel te donne)
- **TTL** : `3600` (ou par défaut)

**Si Vercel te donne un A Record :**
- **Type** : `A`
- **Nom** : `@` (ou laisse vide)
- **Valeur** : L'IP que Vercel te donne (ex: `76.76.21.21`)
- **TTL** : `3600` (ou par défaut)

#### Pour www.btpsmartpro.com (optionnel) :

- **Type** : `CNAME`
- **Nom** : `www`
- **Valeur** : `cname.vercel-dns.com` (ou ce que Vercel te donne)
- **TTL** : `3600`

5. **Sauvegarde** les modifications
6. **Attends 5-10 minutes** pour la propagation DNS

---

## ✅ ÉTAPE 5 : Vérifier dans Vercel

1. **Retourne dans** Vercel → Ton Projet → Settings → Domains
2. **Tu devrais voir** :
   - ✅ `amen.fr` avec un statut "Valid Configuration"
   - ⏳ Ou "Pending" (en attente de propagation DNS)

3. **Si c'est "Pending"** :
   - Attends 5-30 minutes
   - Rafraîchis la page
   - Ça devrait passer à "Valid" automatiquement

---

## ✅ ÉTAPE 6 : Mettre à Jour PUBLIC_URL dans Supabase

Une fois que le domaine fonctionne :

1. **Va dans** : Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. **Trouve** `PUBLIC_URL` (ou crée-le)
3. **Mets la valeur** : `https://btpsmartpro.com`
4. **Sauvegarde**

---

## 🆘 Problèmes Courants

### Erreur : "Domain not found" ou "Invalid domain"

**Solution** :
- Vérifie que tu as bien acheté le domaine `btpsmartpro.com`
- Vérifie que tu es connecté au bon compte (amen.fr, OVH, etc.)
- Assure-toi que le domaine n'est pas déjà configuré ailleurs

### Erreur : "DNS configuration incorrect"

**Solution** :
- Vérifie que les enregistrements DNS sont exactement comme Vercel les donne
- Vérifie qu'il n'y a pas d'autres enregistrements qui entrent en conflit
- Attends 10-30 minutes pour la propagation DNS

### Le domaine ne fonctionne toujours pas après 30 minutes

**Solution** :
1. **Vérifie les DNS** : Utilise https://dnschecker.org pour voir si les DNS sont propagés
2. **Vérifie dans Vercel** : Settings → Domains → Vérifie les erreurs
3. **Contacte le support de ton registrar** (amen.fr, OVH, etc.) si les DNS ne se propagent pas

---

## 📋 Checklist

- [ ] Projet déployé sur Vercel
- [ ] Domaine ajouté dans Vercel (Settings → Domains)
- [ ] Instructions DNS copiées depuis Vercel
- [ ] Enregistrements DNS ajoutés dans ton registrar
- [ ] Attendu 10-30 minutes pour la propagation
- [ ] Domaine vérifié dans Vercel (statut "Valid")
- [ ] `PUBLIC_URL` mis à jour dans Supabase
- [ ] Site accessible sur `https://btpsmartpro.com`

---

## 💡 Astuce

**Si tu as des difficultés avec les DNS dans ton registrar**, tu peux aussi :

1. **Changer les nameservers** de btpsmartpro.com vers Vercel
2. **Vercel te donnera** des nameservers comme :
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
3. **Dans ton registrar** (amen.fr, OVH, etc.), trouve la section **"Nameservers"** ou **"Serveurs de noms"**
4. **Remplace** les nameservers actuels par ceux de Vercel
5. **Attends 24-48 heures** pour la propagation complète

**Cette méthode est plus simple** car Vercel gère tout automatiquement, mais ça prend plus de temps.

---

## 🎯 Résumé Rapide

1. **Vercel** → Settings → Domains → Add → `btpsmartpro.com`
2. **Copie** les instructions DNS de Vercel
3. **Ton registrar** (amen.fr, OVH, etc.) → Zone DNS → Ajoute les enregistrements
4. **Attends** 10-30 minutes
5. **Vérifie** dans Vercel que c'est "Valid"
6. **C'est fait !** 🎉

**Dis-moi où tu bloques et je t'aide !** 🚀

