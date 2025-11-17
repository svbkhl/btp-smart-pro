import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'dirigeant') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parser le body
    const body = await req.json();
    const { action, data } = body;

    // Créer un employé
    if (action === 'create') {
      const { email, password, nom, prenom, poste, specialites } = data;

      if (!email || !password || !nom || !poste) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!authData.user) {
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Assigner le rôle "salarie"
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'salarie',
        });

      if (roleError) {
        // Nettoyer : supprimer le compte créé
        await supabase.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Créer l'enregistrement employé
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert({
          user_id: authData.user.id,
          nom,
          prenom: prenom || null,
          poste,
          specialites: specialites || [],
        })
        .select()
        .single();

      if (employeeError) {
        // Nettoyer : supprimer le rôle et le compte
        await supabase.from('user_roles').delete().eq('user_id', authData.user.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: `Failed to create employee record: ${employeeError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, employee: employeeData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supprimer un employé
    if (action === 'delete') {
      const { employeeId } = data;

      if (!employeeId) {
        return new Response(
          JSON.stringify({ error: 'Employee ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Récupérer l'user_id
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single();

      if (fetchError || !employee) {
        return new Response(
          JSON.stringify({ error: 'Employee not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Supprimer l'enregistrement employé
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: `Failed to delete employee: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Supprimer le rôle
      await supabase.from('user_roles').delete().eq('user_id', employee.user_id);

      // Supprimer le compte auth
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(employee.user_id);
      if (authDeleteError) {
        console.warn('Failed to delete auth account:', authDeleteError);
        // Ne pas faire échouer la requête si la suppression auth échoue
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Toggle account (désactiver/activer)
    if (action === 'toggle') {
      const { userId, disabled } = data;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        ban_expires_at: disabled ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null,
      });

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Failed to update account: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-employees function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

