# Corriger l’erreur 401 invalid_client (Google OAuth)

Si vous voyez **« Accès bloqué : erreur d'autorisation »** ou **« The OAuth client was not found »** avec `client_id=votre-client-id` dans l’URL, le **Client ID Google** configuré dans Supabase est encore un placeholder.

## À faire

### 1. Créer / récupérer les identifiants Google

1. Ouvrez [Google Cloud Console]() → **APIs & Services** → **Credentials**.
2. Créez ou sélectionnez un projet.https://console.cloud.google.com/
3. **Create credentials** → **OAuth client ID**.
4. Type : **Web application**.
5. **Authorized redirect URIs** : ajoutez l’URL de callback Supabase :
   - `https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback`
   - En local : `http://localhost:4000/auth/callback` (si vous utilisez le callback local).
6. Copiez le **Client ID** et le **Client Secret**.

### 2. Configurer Supabase

1. Ouvrez **Supabase Dashboard** → projet **renmjmqlmafqjzldmsgs**.
2. **Authentication** → **Providers** → **Google**.
3. Activez **Enable Sign in with Google**.
4. Collez le **Client ID** (pas « votre-client-id »).
5. Collez le **Client Secret**.
6. Enregistrez.

### 3. Tester

Rechargez l’app et cliquez sur **Se connecter avec Google**. L’erreur `invalid_client` doit disparaître si le Client ID / Secret sont corrects et les URI de redirection correspondent.
