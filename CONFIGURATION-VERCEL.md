# 🚀 Configuration Vercel - BTP Smart Pro

## ⚠️ IMPORTANT : Avant de déployer

1. **Exécute d'abord le script SQL** `supabase/FIX-RLS-CREATE-COMPANIES.sql` dans Supabase SQL Editor pour corriger le problème du bouton "Créer"

## 📋 Configuration Vercel

### 1. **Framework Preset**
✅ **Vite** (déjà sélectionné - c'est correct)

### 2. **Root Directory**
✅ **`./`** (déjà configuré - c'est correct)

### 3. **Build and Output Settings** (Clique pour développer)

Clique sur "Build and Output Settings" et configure :

- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Install Command** : `npm install`

### 4. **Environment Variables** (TRÈS IMPORTANT - Clique pour développer)

Clique sur "Environment Variables" et ajoute **TOUTES** ces variables :

#### Variables Supabase (obligatoires)
```
NEXT_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ton-anon-key
```

#### Variables Supabase Edge Functions (si tu utilises les fonctions)
```
SUPABASE_SERVICE_ROLE_KEY=ton-service-role-key
```

#### Variables Email (si tu utilises l'envoi d'emails)
```
RESEND_API_KEY=ton-resend-api-key
ADMIN_EMAIL=ton-email-admin@example.com
```

#### Variables Stripe (si tu utilises Stripe)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Variables OAuth (si tu utilises OAuth)
```
GITHUB_CLIENT_ID=ton-github-client-id
GITHUB_CLIENT_SECRET=ton-github-client-secret
GOOGLE_CLIENT_ID=ton-google-client-id
GOOGLE_CLIENT_SECRET=ton-google-client-secret
```

#### Variables Production
```
PUBLIC_URL=https://ton-domaine.vercel.app
PRODUCTION_URL=https://ton-domaine.vercel.app
NEXT_PUBLIC_URL=https://ton-domaine.vercel.app
```

#### Variables Optionnelles
```
NEXT_PUBLIC_DEMO_MODE=false
NODE_ENV=production
```

### 5. **Où trouver les valeurs ?**

#### Supabase
1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet
3. Va dans **Settings** → **API**
4. Copie :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ garde-le secret !)

#### Resend (Email)
1. Va sur https://resend.com/api-keys
2. Crée une clé API
3. Copie-la dans `RESEND_API_KEY`

#### Stripe
1. Va sur https://dashboard.stripe.com/apikeys
2. Copie :
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`
3. Pour le webhook secret :
   - Va dans **Developers** → **Webhooks**
   - Crée un webhook pointant vers `https://ton-domaine.vercel.app/api/webhooks/stripe`
   - Copie le **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 6. **Après avoir ajouté les variables**

1. Clique sur **"Deploy"**
2. Attends que le déploiement se termine
3. Vercel te donnera une URL : `https://btp-smart-pro-xxx.vercel.app`

### 7. **Configuration des Webhooks Supabase**

Une fois déployé, configure les webhooks Supabase pour pointer vers ton domaine Vercel :

1. Va dans Supabase Dashboard → **Database** → **Webhooks**
2. Configure les webhooks pour pointer vers :
   - `https://ton-domaine.vercel.app/api/webhooks/...`

### 8. **Configuration du domaine personnalisé (optionnel)**

1. Va dans Vercel Dashboard → **Settings** → **Domains**
2. Ajoute ton domaine personnalisé
3. Suis les instructions DNS

## ✅ Checklist avant de déployer

- [ ] Script SQL `FIX-RLS-CREATE-COMPANIES.sql` exécuté
- [ ] Toutes les variables d'environnement ajoutées dans Vercel
- [ ] `PUBLIC_URL` et `PRODUCTION_URL` pointent vers le bon domaine
- [ ] Les clés API sont en mode **production** (pas de test)
- [ ] Les webhooks Supabase sont configurés

## 🎯 Après le déploiement

1. Teste la création d'entreprise (le bouton "Créer" devrait fonctionner)
2. Teste l'invitation d'un utilisateur
3. Teste le formulaire de contact
4. Vérifie que les emails s'envoient correctement

---

**💡 Astuce** : Tu peux d'abord déployer avec les variables minimales (juste Supabase), puis ajouter les autres progressivement.







