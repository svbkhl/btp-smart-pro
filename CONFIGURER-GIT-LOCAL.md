# ⚙️ Configuration Git Locale

## ✅ Configuration Appliquée

Git a été configuré **localement** pour ce repository uniquement :

- **Email** : `sabri.khalfallah6@gmail.com`
- **Nom** : `Sabri Khalfallah`

---

## 📋 Commandes Exécutées

```bash
git config user.email "sabri.khalfallah6@gmail.com"
git config user.name "Sabri Khalfallah"
```

**Note** : Ces commandes configurent Git **uniquement pour ce repository** (pas globalement).

---

## 🔄 Pour Configurer Git Globalement (Optionnel)

Si vous voulez configurer Git pour **tous vos projets**, exécutez dans votre terminal :

```bash
git config --global user.email "sabri.khalfallah6@gmail.com"
git config --global user.name "Sabri Khalfallah"
```

---

## ✅ Vérification

Pour vérifier la configuration :

```bash
git config --local --list | grep user
```

Vous devriez voir :
```
user.email=sabri.khalfallah6@gmail.com
user.name=Sabri Khalfallah
```

---

**Git est maintenant configuré pour ce repository !** ✅
