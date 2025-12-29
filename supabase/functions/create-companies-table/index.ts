/**
 * Edge Function pour créer la table companies
 * 
 * Cette fonction exécute le script SQL pour créer la table companies
 * si elle n'existe pas encore.
 * 
 * ⚠️ ATTENTION : Nécessite le service_role_key pour exécuter du SQL arbitraire
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification (doit être admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Vérifier que l'utilisateur est admin
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Vérifier le rôle admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'administrateur') {
      throw new Error('Forbidden: Admin access required');
    }

    // Utiliser le service_role pour exécuter du SQL
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Script SQL pour créer la table companies
    const sqlScript = `
      -- Créer la table companies
      CREATE TABLE IF NOT EXISTS public.companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        plan TEXT DEFAULT 'custom' CHECK (plan IN ('basic', 'pro', 'enterprise', 'custom')),
        features JSONB DEFAULT '{}'::jsonb,
        settings JSONB DEFAULT '{}'::jsonb,
        support_level INTEGER DEFAULT 0 CHECK (support_level IN (0, 1, 2)),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'no_support')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );

      -- Créer les index
      CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
      CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);

      -- Activer RLS
      ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

      -- Supprimer les anciennes policies si elles existent
      DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
      DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
      DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;

      -- Policy pour permettre aux admins système de créer des entreprises
      CREATE POLICY "Admins can manage all companies"
        ON public.companies FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE company_id = companies.id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
          )
          OR
          EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'administrateur'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'administrateur'
          )
        );

      -- Fonction pour mettre à jour updated_at
      CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger pour updated_at
      DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public.companies;
      CREATE TRIGGER trigger_update_companies_updated_at
        BEFORE UPDATE ON public.companies
        FOR EACH ROW
        EXECUTE FUNCTION public.update_companies_updated_at();
    `;

    // Exécuter le SQL via rpc (nécessite une fonction SQL pré-existante)
    // Alternative : utiliser l'API REST directement
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
      sql_query: sqlScript 
    });

    if (error) {
      // Si la fonction exec_sql n'existe pas, on ne peut pas exécuter automatiquement
      console.error('Error executing SQL:', error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot execute SQL automatically. Please run the script manually in Supabase SQL Editor.',
          instructions: {
            step1: 'Go to Supabase Dashboard → SQL Editor',
            step2: 'Open file: supabase/CREER-TABLE-COMPANIES.sql',
            step3: 'Copy all content and paste in SQL Editor',
            step4: 'Click "Run"',
          },
          sql_script: sqlScript,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Table companies created successfully',
        data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating companies table:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        instructions: {
          step1: 'Go to Supabase Dashboard → SQL Editor',
          step2: 'Open file: supabase/CREER-TABLE-COMPANIES.sql',
          step3: 'Copy all content and paste in SQL Editor',
          step4: 'Click "Run"',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});














