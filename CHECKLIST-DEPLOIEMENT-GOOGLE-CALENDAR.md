# ✅ Checklist : Déploiement correction Google Calendar

## 🎯 Objectif
Corriger le problème où le patron invité avec le rôle "owner" ne pouvait pas configurer Google Calendar.

---

## 📋 Checklist de déploiement

### ✅ Étape 1 : Redéployer l'Edge Function `send-invitation` (OBLIGATOIRE)

- [ ] Ouvrir le terminal
- [ ] Naviguer vers le projet : `cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"`
- [ ] Redéployer : `supabase functions deploy send-invitation`
- [ ] Vérifier que le déploiement a réussi

**Commande complète :**
```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy send-invitation
```

---

### ✅ Étape 2 : Corriger la fonction SQL `accept_invitation` (OBLIGATOIRE)

- [ ] Ouvrir **Supabase Dashboard** → **SQL Editor**
- [ ] Ouvrir le fichier : `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql`
- [ ] Copier tout le contenu du fichier
- [ ] Coller dans l'éditeur SQL
- [ ] Exécuter le script (bouton "Run" ou `Ctrl+Enter`)
- [ ] Vérifier le message : `✅ Fonction accept_invitation corrigée avec succès`

**Fichier à exécuter :** `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql`

---

### ✅ Étape 3 : Corriger les utilisateurs existants (RECOMMANDÉ)

Si vous avez déjà invité des utilisateurs avant cette correction :

- [ ] Ouvrir **Supabase Dashboard** → **SQL Editor**
- [ ] Ouvrir le fichier : `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql`
- [ ] Copier tout le contenu du fichier
- [ ] Coller dans l'éditeur SQL
- [ ] Exécuter le script
- [ ] Vérifier les résultats dans les logs

**Fichier à exécuter :** `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql`

---

### ✅ Étape 4 : Vérification SQL

- [ ] Ouvrir **Supabase Dashboard** → **SQL Editor**
- [ ] Exécuter la requête de vérification :

```sql
SELECT 
  cu.company_id,
  cu.user_id,
  cu.role_id,
  r.slug as role_slug,
  r.name as role_name,
  ur.role as user_role,
  CASE 
    WHEN cu.role_id IS NULL THEN '❌ role_id NULL'
    WHEN r.slug IS NULL THEN '❌ role_id invalide'
    ELSE '✅ OK'
  END as status
FROM public.company_users cu
LEFT JOIN public.roles r ON r.id = cu.role_id
LEFT JOIN public.user_roles ur ON ur.user_id = cu.user_id
ORDER BY cu.company_id, cu.user_id;
```

- [ ] Vérifier que tous les utilisateurs ont `status = '✅ OK'`
- [ ] Si des utilisateurs ont `❌ role_id NULL`, réexécuter le script de l'étape 3

---

### ✅ Étape 5 : Tests fonctionnels

#### Test 1 : Nouvel utilisateur invité
- [ ] Créer une nouvelle entreprise (ou utiliser une existante)
- [ ] Inviter un utilisateur avec le rôle **"owner"**
- [ ] L'utilisateur accepte l'invitation
- [ ] L'utilisateur se connecte
- [ ] Aller dans **Paramètres** → **Intégrations**
- [ ] ✅ Vérifier que le bouton **"Connecter Google Calendar"** est visible
- [ ] ✅ Tester la connexion Google Calendar

#### Test 2 : Utilisateur existant corrigé
- [ ] Se connecter avec un utilisateur qui a été corrigé par le script SQL
- [ ] Aller dans **Paramètres** → **Intégrations**
- [ ] ✅ Vérifier que le bouton **"Connecter Google Calendar"** est visible (si owner/admin)
- [ ] ✅ Vérifier que le statut Google Calendar s'affiche (même sans permissions)

#### Test 3 : Affichage statut (utilisateur sans permissions)
- [ ] Se connecter avec un utilisateur **employee** (sans permissions)
- [ ] Aller dans **Paramètres** → **Intégrations**
- [ ] ✅ Vérifier que le message **"Google Calendar est déjà configuré"** s'affiche si configuré
- [ ] ✅ Vérifier l'email du compte Google connecté

---

## 🔍 Dépannage

### Le bouton Google Calendar n'apparaît toujours pas

1. **Vérifier le `role_id` dans la base de données :**
   ```sql
   SELECT cu.*, r.slug 
   FROM company_users cu 
   LEFT JOIN roles r ON r.id = cu.role_id 
   WHERE cu.user_id = 'VOTRE_USER_ID';
   ```

2. **Vérifier que le slug est bien "owner" ou "admin"**

3. **Vider le cache du navigateur** et se reconnecter

4. **Vérifier les logs** de l'Edge Function `send-invitation` dans Supabase Dashboard

### Erreur lors de l'exécution du script SQL

1. **Vérifier que la table `roles` existe** et contient les slugs :
   ```sql
   SELECT * FROM roles WHERE slug IN ('owner', 'admin', 'employee');
   ```

2. **Vérifier que la colonne `role_id` existe** dans `company_users` :
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'company_users' AND column_name = 'role_id';
   ```

3. **Vérifier les permissions RLS** si nécessaire

---

## 📊 Résumé des fichiers modifiés

### Code source
- ✅ `supabase/functions/send-invitation/index.ts` (2 corrections)
- ✅ `src/components/GoogleCalendarConnection.tsx` (affichage statut)

### Scripts SQL
- ✅ `supabase/FIX-ACCEPT-INVITATION-ROLE-ID.sql` (nouveau - OBLIGATOIRE)
- ✅ `supabase/FIX-COMPANY-USERS-ROLE-ID-EXISTING-USERS.sql` (nouveau - RECOMMANDÉ)

### Documentation
- ✅ `DEPLOY-FIX-GOOGLE-CALENDAR-PERMISSIONS.md` (guide déploiement)
- ✅ `RESUME-CORRECTION-GOOGLE-CALENDAR-PERMISSIONS.md` (résumé complet)
- ✅ `CHECKLIST-DEPLOIEMENT-GOOGLE-CALENDAR.md` (ce fichier)

---

## ✅ Validation finale

Une fois toutes les étapes terminées :

- [ ] ✅ Edge Function `send-invitation` redéployée
- [ ] ✅ Fonction SQL `accept_invitation` corrigée
- [ ] ✅ Utilisateurs existants corrigés (si applicable)
- [ ] ✅ Vérification SQL : tous les utilisateurs ont `role_id` correct
- [ ] ✅ Test 1 : Nouvel utilisateur owner peut configurer Google Calendar
- [ ] ✅ Test 2 : Utilisateur existant corrigé peut configurer Google Calendar
- [ ] ✅ Test 3 : Statut Google Calendar affiché pour tous les utilisateurs

---

## 🎉 Résultat attendu

Après avoir complété cette checklist :

✅ **Le patron invité avec le rôle "owner" peut maintenant configurer Google Calendar**
✅ **Tous les utilisateurs peuvent voir le statut Google Calendar (même sans permissions)**
✅ **Les permissions sont correctement gérées via `role_id` dans `company_users`**

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifier les logs Supabase Dashboard → Edge Functions → `send-invitation`
2. Vérifier les logs Supabase Dashboard → Logs → Postgres Logs
3. Consulter `RESUME-CORRECTION-GOOGLE-CALENDAR-PERMISSIONS.md` pour le dépannage détaillé
