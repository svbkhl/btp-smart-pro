# 📊 Situation des Fonctions Google Calendar

## ✅ Fonctions Déployées (dans Supabase)

D'après votre dashboard Supabase, ces fonctions sont **déjà déployées** :

1. ✅ **google-calendar-oauth-entreprise-pkce** (déployée il y a 9 minutes)
2. ✅ **google-calendar-sync-entreprise** (déployée il y a 9 minutes)

## ❌ Fonction Non Déployée

La fonction **`google-calendar-oauth`** existe dans le code mais **n'a jamais été déployée**.

---

## 🔍 Analyse du Code Frontend

### ✅ Le Frontend Utilise

Le frontend utilise **uniquement** :
- `google-calendar-oauth-entreprise-pkce` (dans `useGoogleCalendar.ts`)
- `google-calendar-sync-entreprise` (pour la synchronisation)

### ❌ Le Frontend N'Utilise PAS

- `google-calendar-oauth` (n'est appelée nulle part)

---

## 🎯 Options

### Option 1 : Déployer `google-calendar-oauth` (Recommandé)

Même si elle n'est pas utilisée actuellement, vous pouvez la déployer au cas où :

```bash
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

**Avantages** :
- ✅ Toutes les fonctions sont disponibles
- ✅ Si vous avez besoin de cette fonction plus tard, elle sera prête

### Option 2 : Supprimer `google-calendar-oauth` (Si non utilisée)

Si vous êtes sûr de ne jamais l'utiliser, vous pouvez supprimer le dossier :

```bash
rm -rf supabase/functions/google-calendar-oauth
```

**Avantages** :
- ✅ Code plus propre
- ✅ Moins de confusion

---

## 🚀 Action Recommandée

### Pour Corriger l'Erreur CORS

L'erreur CORS que vous avez eue concernait probablement `google-calendar-oauth-entreprise-pkce` qui est **déjà déployée**.

**Vérifiez** :
1. Que `google-calendar-oauth-entreprise-pkce` est bien redéployée avec les corrections CORS
2. Que le frontend utilise bien `google-calendar-oauth-entreprise-pkce` (✅ c'est le cas)

### Redéployer les Fonctions Corrigées

```bash
# Redéployer la fonction principale (celle qui est utilisée)
supabase functions deploy google-calendar-oauth-entreprise-pkce --no-verify-jwt

# Redéployer la fonction de sync
supabase functions deploy google-calendar-sync-entreprise --no-verify-jwt

# Optionnel : déployer aussi google-calendar-oauth (si vous voulez)
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

---

## ✅ Résumé

| Fonction | Existe dans le code ? | Déployée ? | Utilisée par le frontend ? |
|----------|----------------------|------------|---------------------------|
| `google-calendar-oauth` | ✅ Oui | ❌ Non | ❌ Non |
| `google-calendar-oauth-entreprise-pkce` | ✅ Oui | ✅ Oui | ✅ Oui |
| `google-calendar-sync-entreprise` | ✅ Oui | ✅ Oui | ✅ Oui |

**Conclusion** : Vous n'avez pas besoin de `google-calendar-oauth` pour l'instant. L'erreur CORS concerne probablement `google-calendar-oauth-entreprise-pkce` qui doit être redéployée avec les corrections CORS.

