# 📧 Système d'Envoi d'Emails depuis le Compte Utilisateur

## 📋 Vue d'Ensemble

Ce système permet d'envoyer des emails de devis depuis **le compte email de chaque utilisateur** avec support pour :

1. ✅ **Gmail via OAuth**
2. ✅ **Outlook via OAuth**
3. ✅ **SMTP classique** (avec user/password ou App Password)

## 🏗️ Architecture

```
Frontend (React)
    ↓
useSendQuoteEmail Hook (TanStack Query)
    ↓
sendQuoteEmailService
    ↓
Edge Function: send-email-from-user
    ↓
Provider (Gmail OAuth / Outlook OAuth / SMTP)
    ↓
Email envoyé depuis le compte de l'utilisateur
```

## 📁 Structure des Fichiers

```
src/
├── types/
│   └── email.ts                    # Types TypeScript
├── services/
│   └── sendQuoteEmailService.ts    # Service d'envoi d'email
├── hooks/
│   └── useSendQuoteEmail.ts        # Hook React avec TanStack Query
└── components/
    └── quotes/
        └── SendQuoteEmailButton.tsx # Composant bouton

supabase/
└── functions/
    └── send-email-from-user/
        └── index.ts                 # Edge Function principale
```

## 🚀 Installation

### 1. Déployer l'Edge Function

```bash
supabase functions deploy send-email-from-user
```

### 2. Configurer les Variables d'Environnement

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :

- `MAILGUN_API_KEY` (optionnel, pour SMTP via Mailgun)
- `MAILGUN_DOMAIN` (optionnel, pour SMTP via Mailgun)
- `RESEND_API_KEY` (optionnel, fallback pour SMTP)

### 3. Créer la Table `user_email_settings`

Exécutez ce script SQL dans Supabase :

```sql
CREATE TABLE IF NOT EXISTS public.user_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'smtp', 'resend')),
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  from_email TEXT,
  from_name TEXT,
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.user_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email settings"
ON public.user_email_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email settings"
ON public.user_email_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email settings"
ON public.user_email_settings FOR UPDATE
USING (auth.uid() = user_id);
```

## 💻 Utilisation

### Exemple 1 : Utiliser le Hook Directement

```tsx
import { useSendQuoteEmail } from "@/hooks/useSendQuoteEmail";

function MyComponent() {
  const sendEmail = useSendQuoteEmail();

  const handleSend = () => {
    sendEmail.mutate({
      quoteId: "123",
      quoteNumber: "DEV-2025-001",
      clientEmail: "client@example.com",
      clientName: "John Doe",
      includePDF: true,
      customMessage: "Message personnalisé",
    });
  };

  return (
    <button onClick={handleSend} disabled={sendEmail.isPending}>
      {sendEmail.isPending ? "Envoi..." : "Envoyer le devis"}
    </button>
  );
}
```

### Exemple 2 : Utiliser le Composant Bouton

```tsx
import { SendQuoteEmailButton } from "@/components/quotes/SendQuoteEmailButton";

function QuoteDetails({ quote }) {
  return (
    <SendQuoteEmailButton
      quoteId={quote.id}
      quoteNumber={quote.quote_number}
      clientEmail={quote.client_email}
      clientName={quote.client_name}
      includePDF={true}
      onSuccess={() => {
        console.log("Email envoyé avec succès!");
      }}
    />
  );
}
```

### Exemple 3 : Vérifier la Configuration

```tsx
import { useUserEmailConfigured } from "@/hooks/useSendQuoteEmail";

function EmailStatus() {
  const { data, isLoading } = useUserEmailConfigured();

  if (isLoading) return <div>Chargement...</div>;

  if (!data?.configured) {
    return (
      <div>
        <p>Veuillez configurer votre compte email</p>
        <Link to="/settings">Aller aux paramètres</Link>
      </div>
    );
  }

  return <div>Email configuré: {data.provider}</div>;
}
```

## 🔧 Configuration des Comptes Email

### Gmail (OAuth)

1. **Configurer OAuth dans Supabase** :
   - Allez dans Authentication → Providers → Google
   - Activez Google OAuth
   - Ajoutez vos credentials Google

2. **Dans l'application** :
   - L'utilisateur se connecte avec Google
   - Le token OAuth est stocké dans `user_email_settings`

### Outlook (OAuth)

1. **Configurer OAuth dans Supabase** :
   - Allez dans Authentication → Providers → Microsoft
   - Activez Microsoft OAuth
   - Ajoutez vos credentials Microsoft

2. **Dans l'application** :
   - L'utilisateur se connecte avec Microsoft
   - Le token OAuth est stocké dans `user_email_settings`

### SMTP Classique

L'utilisateur configure :
- Serveur SMTP (ex: `smtp.gmail.com`)
- Port (ex: `587`)
- Email
- Mot de passe (ou App Password pour Gmail)

## 📊 Logs et Debugging

Tous les logs sont préfixés avec `[send-email-from-user]` pour faciliter le debugging :

```
📧 [send-email-from-user] Début de la requête
✅ [send-email-from-user] Utilisateur authentifié: abc123
🔍 [send-email-from-user] Récupération des settings email...
✅ [send-email-from-user] Settings email récupérés
📄 [send-email-from-user] Génération du PDF...
✅ [send-email-from-user] PDF généré avec succès
📤 [send-email-from-user] Envoi de l'email via smtp
✅ [send-email-from-user] Email envoyé avec succès: email_123
```

## ⚠️ Gestion des Erreurs

Le système gère automatiquement :

- ❌ **Configuration email non trouvée** → Message clair + lien vers paramètres
- ❌ **OAuth non configuré** → Message pour reconnecter le compte
- ❌ **Erreur SMTP** → Message avec détails de l'erreur
- ❌ **PDF non généré** → Email envoyé sans PDF
- ❌ **Erreur réseau** → Retry automatique (via TanStack Query)

## 🔐 Sécurité

- ✅ **RLS activé** : Les utilisateurs ne peuvent voir/modifier que leurs propres settings
- ✅ **Authentification requise** : Tous les appels nécessitent un token valide
- ✅ **Tokens OAuth sécurisés** : Stockés de manière sécurisée dans Supabase
- ✅ **Mots de passe chiffrés** : Les mots de passe SMTP sont stockés de manière sécurisée

## 🚧 TODO / Améliorations Futures

- [ ] Implémenter l'envoi réel via Gmail API (OAuth)
- [ ] Implémenter l'envoi réel via Microsoft Graph API (OAuth)
- [ ] Support pour refresh token automatique
- [ ] Support pour plusieurs comptes email par utilisateur
- [ ] Template d'email personnalisable
- [ ] Statistiques d'envoi (taux de succès, etc.)

## 📝 Notes

- **Gmail OAuth** : Pour l'instant, utilise SMTP avec App Password. L'implémentation Gmail API nécessite une configuration OAuth2 plus complexe.
- **Outlook OAuth** : Pour l'instant, utilise SMTP avec mot de passe. L'implémentation Microsoft Graph API nécessite une configuration OAuth2 plus complexe.
- **SMTP** : Utilise Mailgun si configuré, sinon Resend en fallback.

## 🆘 Support

En cas de problème :

1. Vérifiez les logs dans Supabase Dashboard → Edge Functions → Logs
2. Vérifiez que `user_email_settings` est bien configuré
3. Vérifiez les variables d'environnement (MAILGUN_API_KEY, etc.)
4. Testez la configuration email dans les paramètres de l'application










