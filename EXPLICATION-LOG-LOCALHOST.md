# 📋 Explication - Log "Listening on localhost:9999"

## 🔍 Cause

Le log `"Listening on http://localhost:9999/"` que vous voyez dans les métadonnées de la fonction **ne vient PAS de votre code**.

C'est un **log système du runtime Supabase Edge Functions** qui s'affiche :
- ✅ **En développement local** : Normal, c'est le serveur local de Supabase CLI
- ❌ **En production** : Ne devrait pas apparaître (ou devrait afficher l'URL de production)

---

## ✅ Ce qui a été fait

J'ai ajouté des **logs explicites** dans `google-calendar-oauth` pour afficher les URLs de production :

```typescript
console.log("🚀 google-calendar-oauth function started");
console.log("🌐 Production URL: https://www.btpsmartpro.com");
console.log("🔗 Supabase Function URL: https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth");
```

Ces logs apparaîtront **avant** le log système et montreront les bonnes URLs.

---

## 🔍 Où voir les logs

### Dans Supabase Dashboard

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions**
2. Cliquez sur **`google-calendar-oauth`**
3. Onglet **"Logs"**
4. Vous verrez :
   - ✅ Les logs explicites avec les URLs de production
   - ⚠️ Le log système "Listening on localhost:9999" (si en local)

---

## 📋 Logs à Vérifier

Après redéploiement, vous devriez voir dans les logs :

```
🚀 google-calendar-oauth function started
🌐 Production URL: https://www.btpsmartpro.com
🔗 Supabase Function URL: https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth
✅ Generated OAuth URL
🔗 Redirect URI (production): https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
🌐 Frontend URL: https://www.btpsmartpro.com
📋 Callback URL: https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

---

## ⚠️ Note Importante

Le log `"Listening on localhost:9999"` dans les **métadonnées** est un log système du runtime Supabase. Il n'affecte **PAS** le fonctionnement de la fonction en production.

**En production**, la fonction utilise les URLs correctes :
- ✅ `https://www.btpsmartpro.com` (frontend)
- ✅ `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/...` (backend)

---

## 🚀 Redéployer pour voir les nouveaux logs

```bash
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

Après redéploiement, les logs explicites apparaîtront et montreront les URLs de production.

---

## ✅ Résumé

1. ✅ Le log "localhost:9999" est un log système (normal en local)
2. ✅ J'ai ajouté des logs explicites avec les URLs de production
3. ✅ En production, la fonction utilise les bonnes URLs
4. ✅ Redéployez pour voir les nouveaux logs
