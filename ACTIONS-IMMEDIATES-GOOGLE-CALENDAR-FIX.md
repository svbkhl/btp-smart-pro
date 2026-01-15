# 🚀 Actions immédiates : Correction Google Calendar

## ⚡ Actions à faire MAINTENANT (5 minutes)

### 1️⃣ Redéployer l'Edge Function (2 min)

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy send-invitation
```

### 2️⃣ Exécuter le script SQL (2 min)

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier-coller le contenu de : `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql`
3. Cliquer sur **Run**

### 3️⃣ Corriger les utilisateurs existants (1 min - optionnel)

1. Dans **Supabase Dashboard** → **SQL Editor**
2. Copier-coller le contenu de : `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql`
3. Cliquer sur **Run**

---

## ✅ Ce qui a été corrigé

### Code
- ✅ `supabase/functions/send-invitation/index.ts` - Utilise maintenant `role_id`
- ✅ `src/components/GoogleCalendarConnection.tsx` - Affiche le statut même sans permissions

### SQL
- ✅ `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql` - Corrige la fonction SQL
- ✅ `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql` - Corrige les utilisateurs existants

### Documentation
- ✅ `DEPLOY-FIX-GOOGLE-CALENDAR-PERMISSIONS.md` - Guide déploiement
- ✅ `RESUME-CORRECTION-GOOGLE-CALENDAR-PERMISSIONS.md` - Résumé complet
- ✅ `CHECKLIST-DEPLOIEMENT-GOOGLE-CALENDAR.md` - Checklist détaillée

---

## 🎯 Résultat

Après ces 3 actions :
- ✅ Le patron invité avec rôle "owner" peut configurer Google Calendar
- ✅ Tous les utilisateurs voient le statut Google Calendar
- ✅ Les permissions sont correctement gérées

---

## 📚 Documentation complète

Pour plus de détails, consultez :
- `CHECKLIST-DEPLOIEMENT-GOOGLE-CALENDAR.md` - Checklist complète
- `RESUME-CORRECTION-GOOGLE-CALENDAR-PERMISSIONS.md` - Résumé technique
