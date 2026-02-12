# Accès First Payout sans abonnement — Déploiement

Les employés de l'entreprise **"First Payout"** (ou dont le nom contient "first payout") ont accès à l'app sans passer par la page abonnement.

## Pour que ça prenne effet

### 1. Build et déploiement frontend

Si tu testes sur **localhost** : redémarre le serveur dev (`npm run dev` ou `vite`). Les changements sont déjà pris en compte.

Si tu testes sur **production** (btpsmartpro.com, Vercel, etc.) :

```bash
# Build
npm run build

# Puis push pour déclencher le déploiement (si Vercel branch auto-deploy)
git add .
git commit -m "feat: accès First Payout sans abonnement"
git push origin main
```

### 2. Vérifier le nom de l'entreprise en base

Dans Supabase → Table `companies`, vérifie que le nom contient bien `first payout` (insensible à la casse).

Exemples qui fonctionnent :
- `First Payout`
- `first payout`
- `First Payout SARL`
- `FIRST PAYOUT`

### 3. Vider le cache navigateur

Après déploiement, forcer un rechargement sans cache (Ctrl+Shift+R ou Cmd+Shift+R) ou tester en navigation privée.
