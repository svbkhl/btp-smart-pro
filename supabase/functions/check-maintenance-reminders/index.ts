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

    console.log('Checking maintenance reminders...');

    // Get all reminders that are due within the next 7 days
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data: reminders, error: remindersError } = await supabase
      .from('maintenance_reminders')
      .select('*')
      .eq('status', 'pending')
      .gte('next_maintenance', today.toISOString().split('T')[0])
      .lte('next_maintenance', nextWeek.toISOString().split('T')[0]);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} reminders to process`);

    // Create notifications for each reminder
    const notifications = [];
    for (const reminder of reminders || []) {
      const daysUntil = Math.ceil(
        (new Date(reminder.next_maintenance).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let notificationType = 'reminder';
      if (daysUntil === 0) {
        notificationType = 'due_today';
      } else if (daysUntil <= 3) {
        notificationType = 'urgent';
      }

      notifications.push({
        reminder_id: reminder.id,
        user_id: reminder.user_id,
        notification_type: notificationType,
        status: 'sent'
      });
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('maintenance_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating notifications:', insertError);
        throw insertError;
      }

      console.log(`Created ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersChecked: reminders?.length || 0,
        notificationsCreated: notifications.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-maintenance-reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
