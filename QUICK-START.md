# ⚡ Quick Start - Installation Rapide

## 🚀 Installation en 5 Minutes

### 1. Ouvrir Supabase Dashboard

1. Allez sur https://supabase.com
2. Connectez-vous
3. Sélectionnez votre projet

### 2. Appliquer les Scripts SQL (dans l'ordre)

#### Script 1 : Migration de Base
- Ouvrez `supabase/APPLY-MIGRATION.sql`
- Copiez TOUT (`Cmd+A`, `Cmd+C`)
- Dans Supabase > SQL Editor > New query
- Collez (`Cmd+V`) et Run

#### Script 2 : Validation
- Ouvrez `supabase/ADD-VALIDATION.sql`
- Copiez TOUT
- New query > Collez > Run

#### Script 3 : Calendrier
- Ouvrez `supabase/CREATE-CALENDAR-SYSTEM.sql`
- Copiez TOUT
- New query > Collez > Run

#### Script 4 : Emails
- Ouvrez `supabase/CREATE-EMAIL-SYSTEM.sql`
- Copiez TOUT
- New query > Collez > Run

#### Script 5 : Storage
1. **Créer le bucket** :
   - Storage > New bucket
   - Name: `images`
   - Public: ✅ Activé
   - Create bucket

2. **Appliquer les politiques** :
   - Ouvrez `supabase/CONFIGURE-STORAGE.sql`
   - Copiez TOUT
   - New query > Collez > Run

### 3. Tester

1. **Calendrier** : Créez un événement
2. **Projet** : Créez un projet
3. **Image** : Uploadez une image
4. **Notifications** : Vérifiez les notifications

---

## ✅ C'est Fait !

**Votre SaaS est maintenant 100% fonctionnel !** 🎉

---

## 📚 Guides Détaillés

- `GUIDE-INSTALLATION-COMPLETE.md` - Guide complet
- `APPLIQUER-CALENDRIER.md` - Guide calendrier
- `APPLIQUER-SYSTEME-EMAILS.md` - Guide emails
- `APPLIQUER-STORAGE-COMPLET.md` - Guide storage

---

**Besoin d'aide ? Consultez les guides détaillés !** 📖

