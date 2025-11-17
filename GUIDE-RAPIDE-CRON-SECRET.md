# 🚀 Guide Rapide : Configurer CRON_SECRET

## 🎯 En 3 Étapes Simples

---

## 📍 Étape 1 : Ouvrir Supabase Dashboard

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Connectez-vous** si nécessaire

---

## 📍 Étape 2 : Aller dans Settings → Edge Functions → Secrets

1. **Dans le menu de gauche**, cliquez sur **Settings** (⚙️)
2. **Dans le sous-menu**, cliquez sur **Edge Functions**
3. **Dans le sous-menu**, cliquez sur **Secrets** (ou "Environment Variables")

**Chemin exact** :
```
Settings (⚙️)
  └── Edge Functions
      └── Secrets
```

---

## 📍 Étape 3 : Ajouter le Secret CRON_SECRET

1. **Cliquez sur** : **"Add new secret"** (ou "Add secret")
2. **Remplissez** :
   - **Name** : `CRON_SECRET`
   - **Value** : `mon-secret-12345` (ou n'importe quelle chaîne que vous voulez)
3. **Cliquez sur** : **"Save"** (ou "Add")

**✅ Résultat** : Le secret est configuré et apparaît dans la liste (avec la valeur masquée `***`)

---

## ✅ Vérification

### Vérifier que le Secret est Configuré

1. **Allez dans** : Settings → Edge Functions → Secrets
2. **Vérifiez** que vous voyez :
   - **Name** : `CRON_SECRET`
   - **Value** : `***` (masqué pour la sécurité)

---

## 🔧 Utilisation

Le `CRON_SECRET` est utilisé pour sécuriser les appels aux Edge Functions depuis les cron jobs. Les Edge Functions vérifient ce secret avant d'exécuter le code.

---

## 🆘 Si vous ne trouvez pas "Secrets"

### Option 1 : Chercher "Environment Variables"

- Dans certains projets Supabase, les secrets s'appellent "Environment Variables"
- Cherchez "Environment Variables" au lieu de "Secrets"

### Option 2 : Vérifier les Permissions

- Vous devez être **propriétaire** ou **admin** du projet Supabase
- Si vous n'avez pas accès, demandez au propriétaire du projet

---

## 📚 Ressources

- **Guide complet** : `CONFIGURER-CRON-SECRET.md`
- **Guide des étapes** : `PROCHAINES-ÉTAPES.md`
- **Dashboard Supabase** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

---

## ✅ Résumé Visuel

```
Supabase Dashboard
    ↓
Settings (⚙️)
    ↓
Edge Functions
    ↓
Secrets
    ↓
Add new secret
    ↓
Name: CRON_SECRET
Value: mon-secret-12345
    ↓
Save
```

---

## 💡 Astuce

Vous pouvez choisir n'importe quelle valeur pour `CRON_SECRET`, mais choisissez quelque chose de sécurisé :
- ✅ `ma-super-cle-secrete-2024`
- ✅ `cron-secret-btp-app-12345`
- ❌ `secret` (trop simple)
- ❌ `12345` (trop simple)

**C'est tout !** 🚀

