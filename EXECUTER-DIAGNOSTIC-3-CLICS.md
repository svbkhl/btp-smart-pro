# 🚀 EXÉCUTER LE DIAGNOSTIC (3 CLICS)

Je ne peux pas exécuter dans ton navigateur, mais voici comment le faire en **3 CLICS** :

---

## ⚡ MÉTHODE ULTRA-RAPIDE

### 1️⃣ Ouvrir l'éditeur SQL (1 clic)

**Click sur ce lien :**

https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

---

### 2️⃣ Copier le script (1 clic)

**Ouvre le fichier `DIAGNOSTIC-COMPLET-EMAILS.sql`**

Ou copie directement ce script :

```sql
-- DIAGNOSTIC RAPIDE
SELECT COUNT(*) as total_emails FROM email_messages;
```

---

### 3️⃣ Exécuter (1 clic)

**Click sur le bouton "RUN"** (ou Cmd+Entrée)

---

## 📊 RÉSULTATS POSSIBLES

### Résultat A : Erreur "relation does not exist"
```
❌ relation "public.email_messages" does not exist
```

**→ La table n'existe pas !**

**Solution :** Exécute ce script dans Supabase :

```sql
-- Créer la table email_messages
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  email_type TEXT DEFAULT 'notification',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL
);

-- Activer RLS
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Policy pour lire ses propres emails
CREATE POLICY "Users can view their own email messages"
  ON public.email_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy pour service role
CREATE POLICY "Service role can manage email messages"
  ON public.email_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON public.email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_sent_at ON public.email_messages(sent_at DESC);
```

Puis **RUN** (Cmd+Entrée).

---

### Résultat B : total_emails = 0
```
total_emails
------------
0
```

**→ La table existe mais est vide !**

**Solution :**
1. Va sur https://www.btpsmartpro.com/facturation
2. Envoie un lien de paiement par email
3. Reviens exécuter le diagnostic

---

### Résultat C : total_emails > 0
```
total_emails
------------
5
```

**→ Des emails existent en base !**

**Le problème est dans l'affichage frontend.**

**Solutions :**

#### Solution 1 : Mode démo
Ouvre la console (F12) sur https://www.btpsmartpro.com/messaging :
```javascript
localStorage.removeItem('fake-data-enabled')
location.reload()
```

#### Solution 2 : Cache query
Dans la console (F12) :
```javascript
queryClient.invalidateQueries({ queryKey: ['email_messages'] })
location.reload()
```

#### Solution 3 : Vérifier RLS
Retourne dans Supabase SQL Editor :
```sql
-- Vérifier que la policy existe
SELECT * FROM pg_policies WHERE tablename = 'email_messages';

-- Si vide, recréer la policy
CREATE POLICY "Users can view their own email messages"
  ON public.email_messages
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 🎯 SCRIPT COMPLET

Pour un diagnostic détaillé, exécute tout le fichier `DIAGNOSTIC-COMPLET-EMAILS.sql` :

1. **Ouvre** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Copie** tout le contenu de `DIAGNOSTIC-COMPLET-EMAILS.sql`
3. **Colle** dans l'éditeur
4. **Click** "RUN"

Tu verras :
- ✅ Si la table existe
- 📊 Nombre total d'emails
- 📊 Emails par type et statut
- 📧 Les 10 derniers emails
- 🔒 Les RLS policies
- 👤 Les utilisateurs
- 🎯 Résumé avec diagnostic

---

## 🆘 APRÈS LE DIAGNOSTIC

**Dis-moi ce que tu obtiens :**

1. **Erreur** "table does not exist" ? → On crée la table
2. **0 emails** ? → On envoie un email de test
3. **> 0 emails** ? → On corrige l'affichage frontend

Avec le résultat, je saurai exactement quoi faire ! 🎯

---

**🚀 EXÉCUTE LE SCRIPT MAINTENANT ! C'EST RAPIDE ! ⚡**
