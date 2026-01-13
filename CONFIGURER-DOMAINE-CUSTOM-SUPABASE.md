# 🌐 Configurer un Domaine Personnalisé pour Supabase Edge Functions

## 🎯 Objectif

Remplacer `renmjmqlmafqjzldmsgs.supabase.co` par `btpsmartpro.com` dans les URLs des Edge Functions.

**Exemple** :
- ❌ Avant : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
- ✅ Après : `https://api.btpsmartpro.com/functions/v1/google-calendar-callback` (ou `https://functions.btpsmartpro.com/v1/google-calendar-callback`)

---

## ⚠️ Options Disponibles

### Option 1 : Custom Domain Supabase (Recommandé mais Payant)

Supabase permet de configurer un domaine personnalisé pour les Edge Functions, mais cela nécessite un plan payant.

**Limitations** :
- Nécessite un plan Supabase Pro ou supérieur
- Configuration DNS requise
- Coût mensuel supplémentaire

**Étapes** :
1. Allez sur : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/custom-domains
2. Configurez un sous-domaine (ex: `api.btpsmartpro.com` ou `functions.btpsmartpro.com`)
3. Configurez les enregistrements DNS dans votre registrar
4. Mettez à jour `GOOGLE_REDIRECT_URI` avec la nouvelle URL

---

### Option 2 : Proxy via Vercel (Gratuit et Simple)

Utiliser Vercel pour créer un proxy qui redirige `api.btpsmartpro.com` vers `renmjmqlmafqjzldmsgs.supabase.co`.

**Avantages** :
- ✅ Gratuit
- ✅ Pas besoin de plan Supabase payant
- ✅ Configuration simple

**Étapes** :

#### 1. Créer un fichier `vercel.json` (ou modifier l'existant)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "functions": {
    "api/functions/:path*": {
      "rewrites": [
        {
          "source": "/api/functions/:path*",
          "destination": "https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/:path*"
        }
      ]
    }
  }
}
```

#### 2. Créer une Edge Function Vercel (Alternative)

Créer un fichier `api/functions/[...path].ts` dans votre projet :

```typescript
// api/functions/[...path].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  
  // Proxy vers Supabase Edge Functions
  const supabaseUrl = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/${pathString}`;
  
  try {
    const response = await fetch(supabaseUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        'host': 'renmjmqlmafqjzldmsgs.supabase.co',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });
    
    const data = await response.text();
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', details: error });
  }
}
```

**Problème** : Cette approche peut être complexe et ne fonctionne pas toujours bien avec OAuth.

---

### Option 3 : Utiliser le Domaine Supabase (Recommandé pour l'instant)

**Pourquoi** :
- ✅ Fonctionne immédiatement
- ✅ Pas de configuration supplémentaire
- ✅ Stable et fiable
- ✅ Google OAuth accepte les domaines `.supabase.co`

**L'URI de redirection reste** :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

**Mais après le callback**, l'utilisateur est redirigé vers :
```
https://www.btpsmartpro.com/settings?tab=integrations
```

C'est déjà le cas dans votre code ! L'utilisateur ne voit `renmjmqlmafqjzldmsgs.supabase.co` que brièvement pendant le callback OAuth.

---

## 🎯 Solution Recommandée : Garder Supabase mais Améliorer l'UX

### Ce qui se passe actuellement :

1. **Utilisateur clique** "Connecter Google Calendar" sur `btpsmartpro.com`
2. **Redirection vers Google** (utilise `renmjmqlmafqjzldmsgs.supabase.co` en arrière-plan)
3. **Utilisateur autorise** sur Google
4. **Google redirige vers** `renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
5. **Edge Function redirige vers** `btpsmartpro.com/settings?tab=integrations` ✅

**L'utilisateur ne voit `renmjmqlmafqjzldmsgs.supabase.co` que pendant le callback OAuth (quelques secondes).**

---

## 🔧 Si vous voulez vraiment utiliser `btpsmartpro.com`

### Option A : Custom Domain Supabase (Payant)

1. **Upgradez votre plan Supabase** vers Pro ou supérieur
2. **Configurez un sous-domaine** :
   - `api.btpsmartpro.com` → Supabase Edge Functions
   - Ou `functions.btpsmartpro.com` → Supabase Edge Functions
3. **Mettez à jour `GOOGLE_REDIRECT_URI`** :
   ```
   https://api.btpsmartpro.com/functions/v1/google-calendar-callback
   ```
4. **Mettez à jour Google Cloud Console** avec la nouvelle URI

**Coût** : ~$25/mois (plan Supabase Pro minimum)

---

### Option B : Proxy Nginx/Vercel (Complexe)

Créer un reverse proxy, mais cela peut causer des problèmes avec OAuth.

---

## ✅ Recommandation Finale

**Pour l'instant, gardez `renmjmqlmafqjzldmsgs.supabase.co`** car :
- ✅ Ça fonctionne parfaitement
- ✅ L'utilisateur ne voit cette URL que brièvement
- ✅ Après le callback, il est sur `btpsmartpro.com`
- ✅ Pas de coût supplémentaire
- ✅ Configuration simple

**Si vous voulez vraiment un domaine personnalisé plus tard** :
- Upgradez vers Supabase Pro
- Configurez `api.btpsmartpro.com` comme custom domain
- Mettez à jour les secrets et Google Cloud Console

---

## 📝 Résumé

**Actuellement** :
- URI OAuth : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
- Redirection finale : `https://www.btpsmartpro.com/settings?tab=integrations` ✅

**Si vous voulez changer** :
- Option 1 : Custom Domain Supabase (payant, ~$25/mois)
- Option 2 : Proxy Vercel (gratuit mais complexe, peut causer des problèmes OAuth)

**Recommandation** : Garder la configuration actuelle, elle fonctionne bien ! 🎯
