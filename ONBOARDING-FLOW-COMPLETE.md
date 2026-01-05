# 🎯 FLUX D'INSCRIPTION PROFESSIONNEL COMPLET

## 📋 OBJECTIF

Créer un parcours d'inscription sécurisé, professionnel et structuré où :
- Le **premier utilisateur** devient le **PATRON** de son entreprise
- Le **patron** invite ses **employés**
- Chaque compte est **sécurisé** (email + mot de passe)
- Chaque entreprise est **isolée** (multi-tenant)

---

## 🔄 FLUX GLOBAL

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUX D'INSCRIPTION                        │
└─────────────────────────────────────────────────────────────┘

1️⃣ LIEN D'INVITATION INITIALE (nouveau patron)
   ↓
2️⃣ FORMULAIRE D'INSCRIPTION
   - Nom, Prénom, Email, Mot de passe
   - Validation sécurité
   ↓
3️⃣ EMAIL DE VÉRIFICATION
   - Envoi code OTP / lien
   - Compte bloqué tant que non vérifié
   ↓
4️⃣ CRÉATION ENTREPRISE (OBLIGATOIRE)
   - Nom entreprise, SIRET, Adresse, etc.
   - Utilisateur devient OWNER
   ↓
5️⃣ ACCÈS À L'APPLICATION
   - Dashboard principal
   - Droits complets (OWNER)
   ↓
6️⃣ INVITATION EMPLOYÉS (par le patron)
   - Lien d'invitation lié à l'entreprise
   - Rôle défini (EMPLOYEE)
   ↓
7️⃣ INSCRIPTION EMPLOYÉ
   - Formulaire simplifié
   - Rattachement automatique à l'entreprise
   - Droits limités (EMPLOYEE)
```

---

## 🔐 ÉTAPE 1 : LIEN D'INVITATION INITIALE

### Type d'invitation
```typescript
// 2 types d'invitations
type InvitationType = 
  | 'company_creation'  // Pour créer une nouvelle entreprise
  | 'employee_join';    // Pour rejoindre une entreprise existante

interface Invitation {
  id: string;
  email: string;
  type: InvitationType;
  company_id?: string;  // NULL si company_creation
  role: 'owner' | 'admin' | 'employee';
  token: string;        // Token unique
  expires_at: Date;
  used_at?: Date;       // NULL si pas encore utilisé
}
```

### Génération du lien
```sql
-- Invitation pour créer une entreprise (PATRON)
INSERT INTO invitations (email, type, role, token, expires_at)
VALUES ('patron@example.com', 'company_creation', 'owner', 'token-xxx', NOW() + INTERVAL '7 days');

-- Invitation pour rejoindre une entreprise (EMPLOYÉ)
INSERT INTO invitations (email, type, role, company_id, token, expires_at)
VALUES ('employe@example.com', 'employee_join', 'employee', 'company-uuid', 'token-yyy', NOW() + INTERVAL '3 days');
```

---

## 📝 ÉTAPE 2 : FORMULAIRE D'INSCRIPTION

### Champs obligatoires
```typescript
interface SignUpForm {
  // Identité
  firstName: string;        // Prénom (min 2 caractères)
  lastName: string;         // Nom (min 2 caractères)
  email: string;            // Email (format valide, unique)
  
  // Sécurité
  password: string;         // Mot de passe (min 8 caractères)
  confirmPassword: string;  // Confirmation
  
  // Invitation
  invitationToken: string;  // Token depuis l'URL
}
```

### Validation du mot de passe
```typescript
// Règles strictes
const passwordRules = {
  minLength: 8,
  requireUppercase: true,   // Au moins 1 majuscule
  requireLowercase: true,   // Au moins 1 minuscule
  requireNumber: true,      // Au moins 1 chiffre
  requireSpecialChar: true, // Au moins 1 caractère spécial (@, !, ?, etc.)
};

function validatePassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[@!?#$%^&*]/.test(password)
  );
}
```

### Processus d'inscription
```typescript
// 1. Vérifier que l'invitation est valide
const invitation = await checkInvitation(token);

// 2. Créer le compte Supabase Auth
const { user } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      first_name: firstName,
      last_name: lastName,
      invitation_token: token,
    },
    emailRedirectTo: `${APP_URL}/verify-email`,
  },
});

// 3. Marquer l'invitation comme utilisée
await supabase
  .from('invitations')
  .update({ 
    used_at: new Date(),
    user_id: user.id,
    status: 'accepted',
  })
  .eq('token', token);

// 4. Rediriger vers page de vérification email
navigate('/verify-email');
```

---

## ✉️ ÉTAPE 3 : VÉRIFICATION EMAIL (OBLIGATOIRE)

### Email de confirmation
```typescript
// Supabase envoie automatiquement un email avec :
// - Lien de confirmation : /auth/confirm?token=xxx
// - Code OTP (optionnel)

// L'utilisateur doit cliquer sur le lien ou entrer le code
```

### Blocage de l'accès
```typescript
// Guard dans App.tsx
function RequireEmailVerified({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Vérifier si l'email est vérifié
  if (user && !user.email_confirmed_at) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}

// Utilisation
<Route element={<RequireEmailVerified><ProtectedRoutes /></RequireEmailVerified>}>
  <Route path="/dashboard" element={<Dashboard />} />
  {/* ... autres routes protégées */}
</Route>
```

### Page de vérification
```tsx
// src/pages/VerifyEmail.tsx
const VerifyEmail = () => {
  const { user, refreshSession } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleResendEmail = async () => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    
    if (!error) {
      toast({ title: 'Email renvoyé !', description: 'Vérifiez votre boîte mail.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 max-w-md">
        <Mail className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-2xl font-bold mt-4">Vérifiez votre email</h1>
        <p className="text-muted-foreground mt-2">
          Nous avons envoyé un email de confirmation à <strong>{user.email}</strong>
        </p>
        <Button onClick={handleResendEmail} className="mt-4">
          Renvoyer l'email
        </Button>
      </Card>
    </div>
  );
};
```

---

## 🏢 ÉTAPE 4 : CRÉATION ENTREPRISE (OBLIGATOIRE)

### Vérification du statut
```typescript
// Après vérification email, vérifier si l'utilisateur a une entreprise
const { data: companyUser } = await supabase
  .from('company_users')
  .select('company_id, companies(*)')
  .eq('user_id', user.id)
  .single();

if (!companyUser) {
  // Rediriger vers création entreprise
  navigate('/onboarding/create-company');
}
```

### Formulaire de création entreprise
```typescript
interface CompanyCreationForm {
  // Informations de base
  name: string;                    // Nom de l'entreprise *
  type: string;                    // Type (SARL, SAS, Auto-entrepreneur, etc.) *
  
  // Identifiants légaux
  siret: string;                   // SIRET (14 chiffres)
  tva_number?: string;             // Numéro TVA intracommunautaire
  
  // Contact
  email: string;                   // Email professionnel *
  phone: string;                   // Téléphone *
  website?: string;                // Site web
  
  // Adresse
  address: string;                 // Adresse *
  city: string;                    // Ville *
  postal_code: string;             // Code postal *
  country: string;                 // Pays * (défaut: France)
  
  // Autres
  description?: string;            // Description de l'activité
  logo_url?: string;               // Logo
  employee_count?: number;         // Nombre d'employés
}
```

### Processus de création
```typescript
async function createCompany(formData: CompanyCreationForm) {
  // 1. Créer l'entreprise
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: formData.name,
      type: formData.type,
      siret: formData.siret,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      postal_code: formData.postal_code,
      country: formData.country,
      status: 'active',
      created_by: user.id,
    })
    .select()
    .single();

  // 2. Lier l'utilisateur comme OWNER
  await supabase
    .from('company_users')
    .insert({
      user_id: user.id,
      company_id: company.id,
      role: 'owner',
      status: 'active',
    });

  // 3. Créer les paramètres par défaut
  await supabase
    .from('user_settings')
    .insert({
      user_id: user.id,
      company_id: company.id,
      // ... paramètres par défaut
    });

  // 4. Rediriger vers le dashboard
  navigate('/dashboard');
}
```

### Guard "Entreprise requise"
```typescript
// Guard dans App.tsx
function RequireCompany({ children }: { children: React.ReactNode }) {
  const { user, company, loading } = useAuth();

  if (loading) return <Loader />;

  // Si pas d'entreprise, rediriger vers création
  if (user && !company) {
    return <Navigate to="/onboarding/create-company" replace />;
  }

  return <>{children}</>;
}

// Utilisation
<Route element={<RequireEmailVerified><RequireCompany><ProtectedRoutes /></RequireCompany></RequireEmailVerified>}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

---

## 👥 ÉTAPE 5 : RÔLES ET PERMISSIONS

### Types de rôles
```typescript
type UserRole = 
  | 'owner'     // Patron : tous les droits
  | 'admin'     // Administrateur : presque tous les droits
  | 'employee'; // Employé : droits limités

interface CompanyUser {
  user_id: string;
  company_id: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  permissions?: string[];  // Permissions spécifiques
}
```

### Matrice de permissions
```typescript
const PERMISSIONS = {
  // Gestion entreprise
  'company.update': ['owner', 'admin'],
  'company.delete': ['owner'],
  
  // Gestion utilisateurs
  'users.invite': ['owner', 'admin'],
  'users.view': ['owner', 'admin', 'employee'],
  'users.update': ['owner', 'admin'],
  'users.delete': ['owner'],
  
  // Gestion clients
  'clients.create': ['owner', 'admin', 'employee'],
  'clients.view': ['owner', 'admin', 'employee'],
  'clients.update': ['owner', 'admin', 'employee'],
  'clients.delete': ['owner', 'admin'],
  
  // Gestion devis/factures
  'quotes.create': ['owner', 'admin', 'employee'],
  'quotes.view': ['owner', 'admin', 'employee'],
  'quotes.update': ['owner', 'admin', 'employee'],
  'quotes.delete': ['owner', 'admin'],
  
  // Gestion paiements
  'payments.view': ['owner', 'admin'],
  'payments.manage': ['owner'],
  
  // Paramètres
  'settings.view': ['owner', 'admin', 'employee'],
  'settings.update': ['owner', 'admin'],
} as const;
```

### Hook de vérification de permissions
```typescript
// src/hooks/usePermissions.ts
export function usePermissions() {
  const { user, companyUser } = useAuth();

  const can = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!companyUser) return false;
    const allowedRoles = PERMISSIONS[permission];
    return allowedRoles.includes(companyUser.role);
  };

  const isOwner = companyUser?.role === 'owner';
  const isAdmin = companyUser?.role === 'admin';
  const isEmployee = companyUser?.role === 'employee';

  return { can, isOwner, isAdmin, isEmployee };
}

// Utilisation
function InviteButton() {
  const { can } = usePermissions();

  if (!can('users.invite')) return null;

  return <Button>Inviter un employé</Button>;
}
```

---

## 📨 ÉTAPE 6 : INVITATION EMPLOYÉS

### Génération d'invitation (par le patron)
```typescript
async function inviteEmployee(email: string, role: 'admin' | 'employee') {
  // 1. Vérifier les permissions
  const { can } = usePermissions();
  if (!can('users.invite')) {
    throw new Error('Vous n\'avez pas les droits pour inviter des utilisateurs');
  }

  // 2. Générer le token
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

  // 3. Créer l'invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .insert({
      email,
      type: 'employee_join',
      role,
      company_id: currentCompany.id,
      invited_by: user.id,
      token,
      expires_at: expiresAt,
      status: 'pending',
    })
    .select()
    .single();

  // 4. Envoyer l'email d'invitation
  const invitationUrl = `${APP_URL}/accept-invitation?token=${token}`;
  await sendInvitationEmail({
    to: email,
    companyName: currentCompany.name,
    inviterName: user.full_name,
    invitationUrl,
    role,
  });

  return invitation;
}
```

---

## 🗄️ ÉTAPE 7 : SCHÉMA BASE DE DONNÉES

### Table `invitations` (améliorée)
```sql
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type d'invitation
  type TEXT NOT NULL CHECK (type IN ('company_creation', 'employee_join')),
  
  -- Informations
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'employee')),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Token et sécurité
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT valid_company_for_employee CHECK (
    (type = 'company_creation' AND company_id IS NULL) OR
    (type = 'employee_join' AND company_id IS NOT NULL)
  ),
  CONSTRAINT invitation_used_once CHECK (
    (used_at IS NULL AND status = 'pending') OR
    (used_at IS NOT NULL AND status IN ('accepted', 'expired', 'cancelled'))
  )
);
```

### Table `companies` (complète)
```sql
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informations de base
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  
  -- Identifiants légaux
  siret TEXT UNIQUE,
  tva_number TEXT,
  
  -- Contact
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT,
  
  -- Adresse
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'France',
  
  -- Visuel
  logo_url TEXT,
  
  -- Métadonnées
  employee_count INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

---

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1 : Base de données (1h)
- [ ] Créer migrations SQL
- [ ] Ajouter contraintes et validations
- [ ] Créer RLS policies
- [ ] Tester les contraintes

### Phase 2 : Vérification email (2h)
- [ ] Créer page `/verify-email`
- [ ] Créer guard `RequireEmailVerified`
- [ ] Implémenter renvoi email
- [ ] Tester le blocage

### Phase 3 : Création entreprise (3h)
- [ ] Créer page `/onboarding/create-company`
- [ ] Créer formulaire complet
- [ ] Créer guard `RequireCompany`
- [ ] Associer user comme OWNER
- [ ] Tester le flux complet

### Phase 4 : Permissions (2h)
- [ ] Créer hook `usePermissions()`
- [ ] Implémenter matrice de permissions
- [ ] Protéger les composants
- [ ] Protéger les routes
- [ ] Tester les accès

### Phase 5 : Invitation employés (2h)
- [ ] Améliorer `InviteUserDialog`
- [ ] Distinguer `company_creation` vs `employee_join`
- [ ] Adapter page `AcceptInvitation`
- [ ] Tester les 2 types d'invitations

### Phase 6 : Tests et ajustements (2h)
- [ ] Tester le flux complet PATRON
- [ ] Tester le flux complet EMPLOYÉ
- [ ] Vérifier l'isolation des données
- [ ] Ajuster l'UX si nécessaire

---

## ⏱️ TEMPS TOTAL ESTIMÉ

**12 heures** de développement pour un flux d'inscription professionnel complet.

---

## 📝 NOTES IMPORTANTES

1. **Supabase Auth gère déjà** :
   - Hash des mots de passe (bcrypt)
   - Vérification email
   - Sessions sécurisées

2. **Ce qu'on doit ajouter** :
   - Validation renforcée du mot de passe
   - Blocage navigation (guards)
   - Formulaire création entreprise
   - Système de permissions

3. **Ce qui existe déjà** :
   - Table `invitations` ✅
   - Table `companies` ✅
   - Table `company_users` ✅
   - Page `AcceptInvitation` ✅ (à améliorer)

---

*Document créé le : 05/01/2026*
*Statut : 🟡 EN COURS D'IMPLÉMENTATION*
