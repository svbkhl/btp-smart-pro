# ⚡ Vérification Rapide - Checklist

## 🔴 Actions Critiques (À Faire en Premier)

### 1. Fichier .env ✅
- [ ] Ouvrir le fichier `.env`
- [ ] Vérifier que `VITE_SUPABASE_URL` = `https://renmjmqlmafqjzldmsgs.supabase.co`
- [ ] Vérifier que `VITE_SUPABASE_PROJECT_ID` = `renmjmqlmafqjzldmsgs`
- [ ] Si différent, remplacer par les valeurs de `ENV-CORRECT-VALUES.txt`
- [ ] Redémarrer le serveur : `npm run dev`

### 2. Supabase Storage ✅
- [ ] Aller dans Supabase Dashboard → Storage
- [ ] Vérifier que le bucket `images` existe
- [ ] Si n'existe pas, créer le bucket (voir `FINALISATION-ETAPES.md`)
- [ ] Appliquer `supabase/CONFIGURE-STORAGE.sql` dans SQL Editor
- [ ] Vérifier les politiques (4 politiques doivent exister)

---

## 🟡 Vérifications Importantes

### 3. Tables de Base de Données ✅
Dans SQL Editor, exécuter :
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'projects', 'user_stats', 'user_settings', 'events', 'email_queue')
ORDER BY table_name;
```

**Résultat attendu** : 6 tables

### 4. Edge Functions ✅
Dans Supabase Dashboard → Edge Functions, vérifier :
- [ ] `send-email` existe
- [ ] `process-email-queue` existe
- [ ] `send-reminders` existe
- [ ] `generate-stats` existe
- [ ] `check-maintenance-reminders` existe

---

## 🟢 Tests Fonctionnels

### 5. Tests Rapides ✅
- [ ] Dashboard affiche des statistiques
- [ ] Créer un client fonctionne
- [ ] Créer un projet fonctionne
- [ ] Calendrier fonctionne
- [ ] Upload d'image fonctionne (après config Storage)
- [ ] Export CSV fonctionne

---

## 📊 État Final

Après toutes ces vérifications :
- ✅ Application fonctionnelle à ~95%
- ⏳ IA à corriger en dernier

---

**Temps estimé** : 30 min - 1h

