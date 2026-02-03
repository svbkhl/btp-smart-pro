/**
 * Script pour créer une entreprise par défaut et associer un utilisateur
 * Usage: npx tsx scripts/fix-user-company.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Assurez-vous que VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const USER_ID = '58747d0e-8382-40e5-9c4c-5b930744ecb0';

async function fixUserCompany() {
  try {
    console.log('🔵 [Fix] Début du fix pour user_id:', USER_ID);

    // 1. Vérifier si l'utilisateur existe
    console.log('\n📌 Étape 1: Vérification de l\'utilisateur...');
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(USER_ID);
    
    if (userError || !userData.user) {
      console.error('❌ Utilisateur non trouvé:', userError);
      return;
    }
    
    console.log('✅ Utilisateur trouvé:', userData.user.email);

    // 2. Vérifier si l'utilisateur a déjà une entreprise
    console.log('\n📌 Étape 2: Vérification des entreprises existantes...');
    const { data: existingCompany, error: companyCheckError } = await supabase
      .from('company_users')
      .select('company_id, companies!inner(id, name)')
      .eq('user_id', USER_ID)
      .maybeSingle();

    if (companyCheckError && companyCheckError.code !== 'PGRST116') {
      console.error('❌ Erreur lors de la vérification:', companyCheckError);
      return;
    }

    if (existingCompany) {
      console.log('✅ Entreprise existante trouvée:', existingCompany);
      console.log('✅ L\'utilisateur est déjà associé à une entreprise');
      return;
    }

    console.log('⚠️ Aucune entreprise trouvée pour cet utilisateur');

    // 3. Créer une entreprise par défaut
    console.log('\n📌 Étape 3: Création d\'une entreprise par défaut...');
    const { data: newCompany, error: createCompanyError } = await supabase
      .from('companies')
      .insert({
        name: 'Mon Entreprise BTP',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createCompanyError || !newCompany) {
      console.error('❌ Erreur lors de la création de l\'entreprise:', createCompanyError);
      return;
    }

    console.log('✅ Entreprise créée:', newCompany);

    // 4. Récupérer le rôle "propriétaire" (owner)
    console.log('\n📌 Étape 4: Récupération du rôle propriétaire...');
    const { data: ownerRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('slug', 'owner')
      .maybeSingle();

    if (roleError || !ownerRole) {
      console.warn('⚠️ Rôle owner non trouvé, utilisation du rôle par défaut');
    }

    // 5. Associer l'utilisateur à l'entreprise
    console.log('\n📌 Étape 5: Association de l\'utilisateur à l\'entreprise...');
    const { data: companyUser, error: associationError } = await supabase
      .from('company_users')
      .insert({
        user_id: USER_ID,
        company_id: newCompany.id,
        role_id: ownerRole?.id || null,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (associationError || !companyUser) {
      console.error('❌ Erreur lors de l\'association:', associationError);
      return;
    }

    console.log('✅ Utilisateur associé à l\'entreprise:', companyUser);

    // 6. Vérifier/Créer l'entrée dans employees
    console.log('\n📌 Étape 6: Vérification de l\'employé...');
    const { data: existingEmployee, error: employeeCheckError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', USER_ID)
      .eq('company_id', newCompany.id)
      .maybeSingle();

    if (employeeCheckError && employeeCheckError.code !== 'PGRST116') {
      console.error('❌ Erreur lors de la vérification de l\'employé:', employeeCheckError);
    }

    if (!existingEmployee) {
      console.log('⚠️ Aucune entrée employé trouvée, création...');
      
      const { data: newEmployee, error: createEmployeeError } = await supabase
        .from('employees')
        .insert({
          user_id: USER_ID,
          company_id: newCompany.id,
          nom: userData.user.user_metadata?.last_name || userData.user.user_metadata?.nom || 'Utilisateur',
          prenom: userData.user.user_metadata?.first_name || userData.user.user_metadata?.prenom || '',
          email: userData.user.email,
          poste: 'Propriétaire',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createEmployeeError) {
        console.error('❌ Erreur lors de la création de l\'employé:', createEmployeeError);
      } else {
        console.log('✅ Employé créé:', newEmployee);
      }
    } else {
      console.log('✅ Entrée employé déjà existante');
    }

    console.log('\n🎉 FIX TERMINÉ AVEC SUCCÈS !');
    console.log('\n📋 RÉSUMÉ:');
    console.log('- Entreprise créée:', newCompany.name, `(${newCompany.id})`);
    console.log('- Utilisateur associé:', userData.user.email);
    console.log('- Rôle:', ownerRole ? 'Propriétaire' : 'Membre');
    console.log('\n✅ Rechargez la page pour voir les changements !');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    process.exit(1);
  }
}

// Exécuter le script
fixUserCompany().then(() => {
  console.log('\n✅ Script terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
