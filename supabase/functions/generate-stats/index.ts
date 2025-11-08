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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Generating stats for user:', user.id);

    // Count quotes
    const { count: quotesCount, error: quotesError } = await supabase
      .from('ai_quotes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Sum quotes value
    const { data: quotesData, error: quotesValueError } = await supabase
      .from('ai_quotes')
      .select('estimated_cost')
      .eq('user_id', user.id);

    const totalQuotesValue = quotesData?.reduce(
      (sum, quote) => sum + (Number(quote.estimated_cost) || 0), 
      0
    ) || 0;

    // Count analyses
    const { count: analysesCount, error: analysesError } = await supabase
      .from('image_analysis')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Count maintenance reminders
    const { count: remindersCount, error: remindersError } = await supabase
      .from('maintenance_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Count active projects (quotes in progress)
    const { count: activeProjects, error: projectsError } = await supabase
      .from('ai_quotes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'draft');

    if (quotesError || quotesValueError || analysesError || remindersError || projectsError) {
      throw new Error('Error fetching stats data');
    }

    // Upsert stats
    const { data: existingStats } = await supabase
      .from('user_stats')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const statsData = {
      user_id: user.id,
      total_quotes: quotesCount || 0,
      total_quotes_value: totalQuotesValue,
      total_analyses: analysesCount || 0,
      total_maintenance_reminders: remindersCount || 0,
      active_projects: activeProjects || 0,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingStats) {
      const { data, error } = await supabase
        .from('user_stats')
        .update(statsData)
        .eq('id', existingStats.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('user_stats')
        .insert(statsData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    console.log('Stats generated successfully:', result);

    return new Response(JSON.stringify({ stats: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
