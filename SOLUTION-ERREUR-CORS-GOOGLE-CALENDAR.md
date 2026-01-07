# 🔧 Solution Erreur CORS - google-calendar-oauth

## 🔍 Diagnostic

L'erreur montre que le frontend essaie d'appeler `google-calendar-oauth` qui **n'existe pas** dans Supabase.

**Problème** : Le code en production (Vercel) n'est pas à jour et utilise encore l'ancien nom de fonction.

---

## ✅ Solutions

### Solution 1 : Redéployer le Frontend (OBLIGATOIRE)

Le code source utilise bien `google-calendar-oauth-entreprise-pkce`, mais le build en production est ancien.

**Action** :
1. **Commit et push** les changements (si pas déjà fait)
2. **Redéployer sur Vercel** :
   - Allez sur Vercel Dashboard
   - Cliquez sur "Redeploy" pour votre projet
   - OU faites un commit vide pour déclencher un nouveau build

### Solution 2 : Déployer la Fonction `google-calendar-oauth` (Temporaire)

En attendant le redéploiement du frontend, vous pouvez déployer `google-calendar-oauth` pour que ça fonctionne :

```bash
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

**Note** : Cette fonction existe dans le code et a été corrigée pour CORS.

---

## 🎯 Action Immédiate Recommandée

### Option A : Redéployer le Frontend (Meilleure solution)

1. **Vérifiez que tous les changements sont commités** :
   ```bash
   git status
   git add .
   git commit -m "Fix: Use google-calendar-oauth-entreprise-pkce"
   git push
   ```

2. **Vercel redéploiera automatiquement** OU allez sur Vercel Dashboard → Redeploy

### Option B : Déployer `google-calendar-oauth` (Solution temporaire)

```bash
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

Cela permettra au code en production de fonctionner en attendant le redéploiement du frontend.

---

## ✅ Corrections Appliquées dans le Code

### 1. Import manquant corrigé

Dans `GoogleCalendarConnection.tsx`, j'ai ajouté les imports manquants :
```typescript
import { 
  useCanConnectGoogleCalendar,
  useCanManageGoogleCalendarSettings 
} from "@/hooks/useGoogleCalendarRoles";
```

### 2. Fonction `google-calendar-oauth` corrigée

La fonction `google-calendar-oauth` a été corrigée avec :
- ✅ Headers CORS complets
- ✅ OPTIONS avec status 200
- ✅ Toutes les réponses incluent corsHeaders

---

## 🚀 Prochaines Étapes

1. **Déployer `google-calendar-oauth`** (solution temporaire) :
   ```bash
   supabase functions deploy google-calendar-oauth --no-verify-jwt
   ```

2. **Redéployer le frontend sur Vercel** (solution définitive)

3. **Tester** la connexion Google Calendar

---

## 📝 Résumé

| Élément | Status | Action |
|---------|--------|--------|
| Code source | ✅ Utilise `google-calendar-oauth-entreprise-pkce` | - |
| Code en production | ❌ Utilise `google-calendar-oauth` | Redéployer |
| Fonction `google-calendar-oauth` | ✅ Corrigée CORS | Déployer |
| Fonction `google-calendar-oauth-entreprise-pkce` | ✅ Déployée | Redéployer avec CORS |

**Action immédiate** : Déployer `google-calendar-oauth` pour que ça fonctionne maintenant, puis redéployer le frontend pour utiliser la bonne fonction.

