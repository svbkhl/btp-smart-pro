# 🌍 Variables d'Environnement Vercel - Configuration

## ✅ Recommandation : Cocher les 3 Environnements

Quand vous ajoutez des variables d'environnement dans Vercel, **cochez les 3 options** :

- ✅ **Production** : Pour votre site en production (votre-projet.vercel.app)
- ✅ **Preview** : Pour les déploiements de prévisualisation (branches, PR)
- ✅ **Development** : Pour les déploiements de développement

## 📋 Pourquoi Cocher les 3 ?

1. **Production** : Votre site principal accessible publiquement
2. **Preview** : Chaque pull request ou branche crée un déploiement de prévisualisation
3. **Development** : Pour tester avant de mettre en production

**En cochant les 3, vos variables seront disponibles partout !** ✨

## 🎯 Configuration Recommandée

Pour chaque variable (`VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`) :

```
☑️ Production
☑️ Preview  
☑️ Development
```

## ⚠️ Si vous ne cochez que Production

- ✅ Votre site principal fonctionnera
- ❌ Les déploiements de prévisualisation ne fonctionneront pas
- ❌ Les tests sur d'autres branches ne fonctionneront pas

## ✅ Résumé

**Cochez les 3 environnements pour chaque variable !** C'est la configuration la plus sûre et la plus pratique.

