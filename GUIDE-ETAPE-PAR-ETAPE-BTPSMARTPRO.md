# 🎯 Guide Étape par Étape - Configurer btpsmartpro.com

## 📸 ÉTAPE 1 : Ajouter le Domaine dans Vercel

### Ce que tu dois faire :

1. **Ouvre** : https://vercel.com/dashboard
2. **Clique** sur ton projet (celui qui est déployé)
3. **Dans le menu de gauche**, clique sur **"Settings"**
4. **Dans Settings**, clique sur **"Domains"** (dans le menu de gauche)
5. **Tu verras** un bouton **"Add"** ou **"Add Domain"** → Clique dessus
6. **Dans le champ**, entre : `btpsmartpro.com`
7. **Clique sur** **"Add"** ou **"Continue"**

### Ce que Vercel va te montrer :

Vercel va afficher quelque chose comme :

```
Configuration DNS requise pour btpsmartpro.com

Pour configurer votre domaine, ajoutez les enregistrements suivants :

Type: CNAME
Name: @
Value: cname.vercel-dns.com

OU

Type: A
Name: @
Value: 76.76.21.21
```

**⚠️ IMPORTANT** : Copie EXACTEMENT ce que Vercel te montre (chaque projet a des valeurs différentes)

---

## 📸 ÉTAPE 2 : Configurer dans amen.fr

### Ce que tu dois faire :

1. **Ouvre** : https://www.amen.fr (ou ton panneau de contrôle)
2. **Connecte-toi** avec tes identifiants
3. **Trouve** la section **"Mes domaines"** ou **"Gestion de domaine"**
4. **Clique sur** `btpsmartpro.com`
5. **Trouve** : **"Zone DNS"** ou **"DNS"** ou **"Enregistrements DNS"** ou **"Gestion DNS"**

### Si tu vois une liste d'enregistrements DNS :

1. **Clique sur** **"Ajouter"** ou **"Nouvel enregistrement"** ou **"Add Record"**
2. **Remplis les champs** avec ce que Vercel t'a donné :

**Exemple si Vercel te donne un CNAME :**
- **Type** : Sélectionne `CNAME` dans le menu déroulant
- **Nom** : Entre `@` (ou laisse vide, selon ce que ton registrar accepte)
- **Valeur** : Entre `cname.vercel-dns.com` (ou ce que Vercel t'a donné)
- **TTL** : Laisse par défaut (généralement 3600)

**Exemple si Vercel te donne un A Record :**
- **Type** : Sélectionne `A` dans le menu déroulant
- **Nom** : Entre `@` (ou laisse vide)
- **Valeur** : Entre l'IP que Vercel t'a donnée (ex: `76.76.21.21`)
- **TTL** : Laisse par défaut

3. **Clique sur** **"Sauvegarder"** ou **"Valider"** ou **"Save"**

### Si tu ne trouves pas "Zone DNS" :

Cherche ces termes dans le menu :
- **"DNS"**
- **"Enregistrements DNS"**
- **"Gestion DNS"**
- **"Configuration DNS"**
- **"Zone de nom"**

---

## 📸 ÉTAPE 3 : Attendre la Propagation

1. **Attends 10-30 minutes** (parfois jusqu'à 1 heure)
2. **Retourne dans Vercel** → Settings → Domains
3. **Vérifie** le statut de `btpsmartpro.com`

**Statuts possibles :**
- ✅ **"Valid Configuration"** → Ça marche ! 🎉
- ⏳ **"Pending"** → Attends encore un peu
- ❌ **"Invalid Configuration"** → Il y a une erreur, vérifie les DNS

---

## 📸 ÉTAPE 4 : Vérifier que ça Marche

1. **Ouvre** : https://btpsmartpro.com
2. **Tu devrais voir** ton site BTP Smart Pro
3. **Si ça ne marche pas**, attends encore 10-20 minutes

---

## 🆘 Si tu Bloques à une Étape

### "Je ne trouve pas où ajouter le domaine dans Vercel"

**Solution** :
1. Assure-toi d'être connecté à Vercel
2. Assure-toi d'avoir un projet déployé
3. Le menu "Settings" est dans le projet, pas dans le dashboard général

### "Je ne trouve pas la Zone DNS dans amen.fr"

**Solution** :
1. Cherche dans le menu de gauche après avoir cliqué sur ton domaine
2. Ça peut s'appeler : "DNS", "Zone DNS", "Enregistrements DNS", "Gestion DNS"
3. Si tu ne trouves vraiment pas, contacte le support amen.fr

### "Vercel dit 'Invalid Configuration'"

**Solution** :
1. Vérifie que tu as bien copié les valeurs de Vercel
2. Vérifie qu'il n'y a pas d'erreur de frappe
3. Vérifie que les DNS sont bien sauvegardés dans amen.fr
4. Attends 30 minutes et rafraîchis

---

## 💡 Alternative : Nameservers (Plus Simple)

Si tu as vraiment du mal avec les DNS, tu peux changer les nameservers :

1. **Dans Vercel** → Settings → Domains → btpsmartpro.com
2. **Vercel te donnera** des nameservers (ex: `ns1.vercel-dns.com` et `ns2.vercel-dns.com`)
3. **Dans amen.fr**, trouve **"Nameservers"** ou **"Serveurs de noms"**
4. **Remplace** les nameservers actuels par ceux de Vercel
5. **Sauvegarde**
6. **Attends 24-48 heures** (plus long mais Vercel gère tout)

---

## 📋 Checklist

- [ ] Domaine ajouté dans Vercel : `btpsmartpro.com`
- [ ] Instructions DNS copiées depuis Vercel
- [ ] Enregistrements DNS ajoutés dans amen.fr
- [ ] Attendu 10-30 minutes
- [ ] Statut "Valid Configuration" dans Vercel
- [ ] Site accessible sur `https://btpsmartpro.com`
- [ ] `PUBLIC_URL` mis à jour dans Supabase

---

**Dis-moi à quelle étape tu es et ce que tu vois, je t'aide à continuer !** 🚀















