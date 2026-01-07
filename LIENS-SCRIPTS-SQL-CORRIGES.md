# 🔗 Liens vers les scripts SQL corrigés

## ✅ Scripts corrigés (références `company_id` qualifiées)

### 📄 Script 1 : Google Calendar niveau entreprise
**Fichier :** [`supabase/migrations/20260106000001_google_calendar_entreprise_level.sql`](supabase/migrations/20260106000001_google_calendar_entreprise_level.sql)

**Corrections appliquées :**
- ✅ Toutes les références `company_id` dans les policies RLS sont maintenant qualifiées avec `google_calendar_connections.company_id`
- ✅ Toutes les références `owner_user_id` sont qualifiées avec `google_calendar_connections.owner_user_id`

### 📄 Script 3 : Préparation architecture webhooks
**Fichier :** [`supabase/migrations/20260106000003_prepare_google_webhooks.sql`](supabase/migrations/20260106000003_prepare_google_webhooks.sql)

**Corrections appliquées :**
- ✅ Toutes les références `company_id` dans les policies RLS sont maintenant qualifiées avec `google_calendar_webhooks.company_id`

---

## 🚀 Instructions d'exécution

1. **Ouvrir Supabase SQL Editor**
2. **Copier-coller le contenu du Script 1** et exécuter
3. **Copier-coller le contenu du Script 3** et exécuter

Les scripts sont maintenant corrigés et ne devraient plus générer l'erreur "column reference 'company_id' is ambiguous".

---

## 📝 Note technique

L'erreur venait du fait que PostgreSQL ne pouvait pas déterminer si `company_id` faisait référence à :
- La colonne de la table principale (`google_calendar_connections` ou `google_calendar_webhooks`)
- La colonne de la table dans la sous-requête EXISTS (`company_users`)

En qualifiant explicitement toutes les références avec le nom de la table, l'ambiguïté est résolue.

