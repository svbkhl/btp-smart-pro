# 🌐 Solution : Utiliser btpsmartpro.com au lieu de renmjmqlmafqjzldmsgs.supabase.co

## 🎯 Votre Demande

Vous voulez que l'URI de redirection OAuth utilise `btpsmartpro.com` au lieu de `renmjmqlmafqjzldmsgs.supabase.co`.

**Actuellement** :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

**Souhaité** :
```
https://api.btpsmartpro.com/functions/v1/google-calendar-callback
```
(ou un autre sous-domaine de btpsmartpro.com)

---

## ⚠️ Contrainte Importante

**Supabase Custom Domain nécessite un plan payant** :
- ❌ Plan Gratuit : Pas de domaine personnalisé
- ✅ Plan Pro : $25/mois (minimum)
- ✅ Plan Team : $599/mois

**Source** : https://supabase.com/pricing

---

## ✅ Solutions Disponibles

### Solution 1 : Utiliser un Proxy Vercel (Gratuit) ⭐ Recommandé

Créer un proxy Vercel qui redirige `api.btpsmartpro.com` vers `renmjmqlmafqjzldmsgs.supabase.co`.

#### Étape 1 : Créer un fichier API dans Vercel

Créez un fichier `api/functions/[...path].ts` dans votre projet :

```typescript
// api/functions/[...path].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  
  // URL Supabase Edge Function
  const supabaseUrl = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/${pathString}`;
  
  console.log(`🔄 Proxying ${req.method} ${req.url} → ${supabaseUrl}`);
  
  try {
    // Copier les headers (sauf host)
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach((key) => {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
        const value = req.headers[key];
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
          headers[key] = value[0];
        }
      }
    });
    
    // Faire la requête vers Supabase
    const response = await fetch(supabaseUrl, {
      method: req.method,
      headers: {
        ...headers,
        'host': 'renmjmqlmafqjzldmsgs.supabase.co',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });
    
    // Copier les headers de la réponse
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });
    
    // Envoyer le statut et le body
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error: any) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      details: error.message,
      url: supabaseUrl 
    });
  }
}
```

#### Étape 2 : Configurer le domaine dans Vercel

1. **Allez sur** : https://vercel.com/dashboard
2. **Sélectionnez votre projet** `btpsmartpro`
3. **Settings** → **Domains**
4. **Ajoutez un domaine** : `api.btpsmartpro.com`
5. **Configurez le DNS** dans votre registrar :
   - Type : `CNAME`
   - Name : `api`
   - Value : `cname.vercel-dns.com` (ou la valeur fournie par Vercel)

#### Étape 3 : Mettre à jour les Secrets

1. **Supabase Secrets** :
   - `GOOGLE_REDIRECT_URI` = `https://api.btpsmartpro.com/functions/v1/google-calendar-callback`

2. **Google Cloud Console** :
   - Authorized redirect URIs = `https://api.btpsmartpro.com/functions/v1/google-calendar-callback`

#### Étape 4 : Déployer

```bash
git add api/functions/[...path].ts
git commit -m "feat: ajout proxy Vercel pour Edge Functions Supabase"
git push origin main
```

**Vercel déploiera automatiquement** 🚀

---

### Solution 2 : Upgrade Supabase Pro (Payant)

Si vous voulez une solution native Supabase :

1. **Upgradez** vers Supabase Pro ($25/mois)
2. **Configurez** un custom domain dans Supabase Dashboard
3. **Mettez à jour** `GOOGLE_REDIRECT_URI` avec le nouveau domaine

**Avantages** :
- ✅ Solution native
- ✅ Pas de proxy intermédiaire
- ✅ Meilleures performances

**Inconvénients** :
- ❌ Coût mensuel ($25/mois minimum)

---

### Solution 3 : Garder la Configuration Actuelle (Gratuit)

**Pourquoi c'est OK** :
- ✅ L'utilisateur ne voit `renmjmqlmafqjzldmsgs.supabase.co` que brièvement pendant le callback OAuth
- ✅ Après autorisation, il est redirigé vers `btpsmartpro.com`
- ✅ Pas de coût supplémentaire
- ✅ Configuration simple et stable

**Le flux actuel** :
1. Utilisateur sur `btpsmartpro.com` → Clique "Connecter Google Calendar"
2. Redirection vers Google (utilise `renmjmqlmafqjzldmsgs.supabase.co` en arrière-plan)
3. Utilisateur autorise sur Google
4. Google redirige vers `renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback` (quelques secondes)
5. Edge Function redirige vers `btpsmartpro.com/settings?tab=integrations` ✅

---

## 🎯 Recommandation

**Pour l'instant** : **Solution 1 (Proxy Vercel)** car :
- ✅ Gratuit
- ✅ Utilise votre domaine `btpsmartpro.com`
- ✅ Pas besoin d'upgrade Supabase
- ✅ Configuration relativement simple

**Plus tard** : Si vous avez le budget, **Solution 2 (Supabase Pro)** pour une solution plus native.

---

## 📝 Fichiers à Créer/Modifier

### 1. Créer `api/functions/[...path].ts`

```typescript
// api/functions/[...path].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  
  const supabaseUrl = `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/${pathString}`;
  
  try {
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach((key) => {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
        const value = req.headers[key];
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
          headers[key] = value[0];
        }
      }
    });
    
    const response = await fetch(supabaseUrl, {
      method: req.method,
      headers: {
        ...headers,
        'host': 'renmjmqlmafqjzldmsgs.supabase.co',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });
    
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });
    
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Proxy error', 
      details: error.message 
    });
  }
}
```

### 2. Mettre à jour les Secrets

**Supabase** :
- `GOOGLE_REDIRECT_URI` = `https://api.btpsmartpro.com/functions/v1/google-calendar-callback`

**Google Cloud Console** :
- Authorized redirect URIs = `https://api.btpsmartpro.com/functions/v1/google-calendar-callback`

---

## ✅ Checklist

- [ ] Créer `api/functions/[...path].ts`
- [ ] Configurer `api.btpsmartpro.com` dans Vercel
- [ ] Configurer le DNS (CNAME)
- [ ] Mettre à jour `GOOGLE_REDIRECT_URI` dans Supabase
- [ ] Mettre à jour Google Cloud Console
- [ ] Déployer sur Vercel
- [ ] Tester la connexion Google Calendar

---

**Voulez-vous que je crée le fichier `api/functions/[...path].ts` maintenant ?** 🚀
