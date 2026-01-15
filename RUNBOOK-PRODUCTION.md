# 🚀 RUNBOOK Production - BTP Smart Pro

## 📋 Checklist Avant Déploiement

### ✅ Variables d'Environnement

#### Frontend (`.env` ou Vercel)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Edge Functions (Supabase Dashboard → Settings → Edge Functions → Secrets)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ⚠️ SECRET - jamais côté client
SUPABASE_ANON_KEY=your-anon-key
APP_URL=https://your-domain.com
RESEND_API_KEY=your-resend-key  # Optionnel pour emails
RESEND_FROM_EMAIL=noreply@your-domain.com
```

### ✅ Migrations SQL

1. **Exécuter dans l'ordre** :
   ```sql
   -- 1. Core tables
   supabase/migrations/20241105120000_create_core_tables.sql
   
   -- 2. RBAC system
   supabase/migrations/20260105000001_create_rbac_system.sql
   
   -- 3. Company invites system
   supabase/migrations/20260114000001_company_invites_system_pro.sql
   ```

2. **Vérifier RLS activées** :
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND rowsecurity = true;
   ```

### ✅ Edge Functions Déployées

```bash
# Déployer toutes les Edge Functions
supabase functions deploy create-company-invite
supabase functions deploy verify-invite
supabase functions deploy accept-invite
supabase functions deploy generate-quote
# ... (voir liste complète dans supabase/functions/)
```

---

## 🔍 Debug Supabase/RLS

### Problème : Erreur 401/403 sur requête

1. **Vérifier l'authentification** :
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User:', user?.id);
   ```

2. **Vérifier les policies RLS** :
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'clients' 
   AND schemaname = 'public';
   ```

3. **Tester avec service_role** (temporaire, pour debug) :
   ```typescript
   const adminClient = createClient(
     supabaseUrl,
     serviceRoleKey  // ⚠️ UNIQUEMENT pour debug
   );
   ```

### Problème : Données manquantes entre entreprises

1. **Vérifier `company_id`** :
   ```sql
   SELECT id, company_id, user_id FROM clients LIMIT 10;
   ```

2. **Vérifier `company_users`** :
   ```sql
   SELECT * FROM company_users WHERE user_id = 'user-uuid';
   ```

3. **Vérifier RLS multi-tenant** :
   ```sql
   -- Doit inclure vérification company_users
   SELECT * FROM pg_policies 
   WHERE tablename = 'clients' 
   AND policyname LIKE '%company%';
   ```

---

## 🐛 Debug Frontend

### Problème : Erreur "window is not defined"

**Cause** : Code SSR accède à `window`/`localStorage`  
**Fix** : Utiliser `isBrowser()` ou `safeLocalStorage` :
```typescript
import { isBrowser, safeLocalStorage } from '@/utils/isBrowser';

if (isBrowser()) {
  // Accès window OK
}

const value = safeLocalStorage.getItem('key');
```

### Problème : Crash sur `.single()` → "No rows returned"

**Cause** : Query retourne 0 résultats  
**Fix** : Utiliser `.maybeSingle()` :
```typescript
// ❌ AVANT
const { data } = await supabase.from('table').select('*').eq('id', id).single();

// ✅ APRÈS
const { data } = await supabase.from('table').select('*').eq('id', id).maybeSingle();
if (!data) {
  // Gérer "not found"
  return null;
}
```

---

## 🔒 Sécurité

### ✅ Checklist Sécurité

- [ ] Aucune clé `SUPABASE_SERVICE_ROLE_KEY` dans le frontend
- [ ] Tokens OAuth stockés en DB (pas localStorage)
- [ ] Edge Functions valident `company_id` + rôle
- [ ] RLS activées sur toutes les tables
- [ ] Pas de secrets dans les logs
- [ ] HTTPS uniquement en production

### ⚠️ Secrets à NE JAMAIS exposer

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- Tokens OAuth (Google, etc.)
- Clés Stripe secrètes

---

## 📊 Monitoring

### Logs Edge Functions

```typescript
// Structuré (recommandé)
console.log(JSON.stringify({
  level: 'info',
  function: 'generate-quote',
  userId: user.id,
  companyId: companyId,
  timestamp: new Date().toISOString(),
}));
```

### Métriques à surveiller

- Temps de réponse Edge Functions (< 2s)
- Taux d'erreur 4xx/5xx (< 1%)
- Utilisation Supabase (quotas)
- Erreurs RLS (401/403)

---

## 🚨 Procédures d'Urgence

### Rollback Migration

```sql
-- 1. Identifier la migration problématique
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;

-- 2. Rollback manuel (si nécessaire)
-- ATTENTION : Peut causer perte de données
DROP TABLE IF EXISTS table_name CASCADE;
```

### Désactiver RLS temporairement

```sql
-- ⚠️ UNIQUEMENT pour debug, JAMAIS en prod
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
```

### Purger données de test

```bash
# Via Edge Function
supabase functions invoke purge-demo
```

---

## 📝 Commandes Utiles

### Supabase CLI

```bash
# Status
supabase status

# Logs Edge Functions
supabase functions logs create-company-invite

# Déployer migration
supabase db push

# Reset local (⚠️ DESTRUCTIF)
supabase db reset
```

### Vercel

```bash
# Déployer
vercel --prod

# Logs
vercel logs --follow

# Variables d'env
vercel env ls
```

---

## ✅ Validation Post-Déploiement

1. **Test Auth** :
   - [ ] Inscription fonctionne
   - [ ] Connexion fonctionne
   - [ ] Invitation fonctionne

2. **Test RLS** :
   - [ ] User A ne voit pas les données de User B
   - [ ] Admin peut voir toutes les données de sa company
   - [ ] Member ne peut pas modifier les settings company

3. **Test Edge Functions** :
   - [ ] `create-company-invite` fonctionne
   - [ ] `generate-quote` fonctionne
   - [ ] Emails envoyés (si configuré)

4. **Test Performance** :
   - [ ] FCP < 3s
   - [ ] LCP < 4s
   - [ ] Pas d'erreurs console

---

## 📞 Support

### Logs à fournir en cas de bug

1. **Console navigateur** (F12 → Console)
2. **Network tab** (requêtes Supabase)
3. **Edge Functions logs** :
   ```bash
   supabase functions logs <function-name> --tail
   ```
4. **Supabase Dashboard** → Logs → API

### Informations à inclure

- URL de la page
- Actions effectuées
- User ID (si possible)
- Timestamp
- Erreur exacte (message + stack)

---

**Dernière mise à jour** : 2025-01-14
