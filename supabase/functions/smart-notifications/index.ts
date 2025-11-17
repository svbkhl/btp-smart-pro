/**
 * SMART NOTIFICATIONS - Système automatisé de notifications BTP
 * 
 * Cette fonction Edge est appelée par un cron job pour vérifier
 * et envoyer des notifications intelligentes basées sur les données.
 * 
 * Types de notifications :
 * - Devis en attente > 3 jours
 * - Devis non confirmés > 7 jours
 * - Chantiers qui commencent bientôt (1 jour avant)
 * - Chantiers qui se terminent bientôt (1 jour avant)
 * - Échéances de maintenance (7 jours avant)
 * - Paiements dus (3 jours avant)
 * - Paiements en retard
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationResult {
  type: string;
  count: number;
  notifications: any[];
}

/**
 * Templates d'emails professionnels BTP
 */
const emailTemplates = {
  quote_pending: (data: any) => ({
    subject: `🔔 Devis en attente depuis ${data.days_pending} jours`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 Rappel : Devis en attente</h2>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Vous avez un devis qui est en attente depuis <strong>${data.days_pending} jours</strong> :</p>
            <ul>
              <li><strong>Client :</strong> ${data.client_name || 'Non renseigné'}</li>
              <li><strong>Date de création :</strong> ${new Date(data.created_at).toLocaleDateString('fr-FR')}</li>
            </ul>
            <p>Pensez à finaliser et envoyer ce devis au client pour ne pas perdre l'opportunité.</p>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  quote_unconfirmed: (data: any) => ({
    subject: `⏰ Devis non confirmé depuis ${data.days_unconfirmed} jours`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #fff3cd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⏰ Rappel : Devis non confirmé</h2>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Un devis envoyé il y a <strong>${data.days_unconfirmed} jours</strong> n'a pas encore été confirmé par le client :</p>
            <ul>
              <li><strong>Client :</strong> ${data.client_name || 'Non renseigné'}</li>
              <li><strong>Date d'envoi :</strong> ${new Date(data.sent_at).toLocaleDateString('fr-FR')}</li>
            </ul>
            <p>Nous vous recommandons de relancer le client pour obtenir une confirmation ou un retour.</p>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  worksite_start: (data: any) => ({
    subject: `🏗️ Rappel : Début de chantier prévu ${data.days_until_start === 0 ? "aujourd'hui" : `dans ${data.days_until_start} jour(s)`}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d4edda; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .alert { padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; margin: 20px 0; }
          .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🏗️ Rappel : Début de chantier</h2>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Un chantier est prévu de commencer <strong>${data.days_until_start === 0 ? "aujourd'hui" : `dans ${data.days_until_start} jour(s)`}</strong> :</p>
            <ul>
              <li><strong>Chantier :</strong> ${data.project_name}</li>
              <li><strong>Date de début :</strong> ${new Date(data.start_date).toLocaleDateString('fr-FR')}</li>
            </ul>
            <div class="alert">
              <strong>⚠️ Actions à prévoir :</strong>
              <ul>
                <li>Vérifier que tous les matériaux sont disponibles</li>
                <li>Confirmer la présence de l'équipe</li>
                <li>Vérifier les conditions météorologiques</li>
                <li>Penser à vérifier la sécurité du chantier</li>
              </ul>
            </div>
            <p>Bonne préparation et bon courage pour ce nouveau chantier !</p>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  worksite_end: (data: any) => ({
    subject: `🏁 Rappel : Fin de chantier prévue ${data.days_until_end === 0 ? "aujourd'hui" : `dans ${data.days_until_end} jour(s)`}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .alert { padding: 15px; background-color: #d4edda; border-left: 4px solid #28a745; margin: 20px 0; }
          .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🏁 Rappel : Fin de chantier</h2>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Un chantier est prévu de se terminer <strong>${data.days_until_end === 0 ? "aujourd'hui" : `dans ${data.days_until_end} jour(s)`}</strong> :</p>
            <ul>
              <li><strong>Chantier :</strong> ${data.project_name}</li>
              <li><strong>Date de fin :</strong> ${new Date(data.end_date).toLocaleDateString('fr-FR')}</li>
            </ul>
            <div class="alert">
              <strong>✅ À prévoir pour la fin de chantier :</strong>
              <ul>
                <li>Effectuer une visite de réception avec le client</li>
                <li>Vérifier que tous les travaux sont conformes</li>
                <li>Préparer la facturation finale</li>
                <li>Nettoyer le chantier</li>
                <li>Réaliser les photos de fin de chantier</li>
              </ul>
            </div>
            <p>Félicitations pour l'aboutissement de ce projet !</p>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  maintenance_due: (data: any) => ({
    subject: `🔧 Rappel : Maintenance prévue dans ${data.days_until_maintenance} jour(s)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #fff3cd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔧 Rappel : Maintenance prévue</h2>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Une intervention de maintenance est prévue <strong>dans ${data.days_until_maintenance} jour(s)</strong> :</p>
            <ul>
              <li><strong>Client :</strong> ${data.client_name}</li>
              <li><strong>Équipement :</strong> ${data.equipment_type}</li>
              <li><strong>Date de maintenance :</strong> ${new Date(data.next_maintenance).toLocaleDateString('fr-FR')}</li>
            </ul>
            <p>Pensez à planifier cette intervention et à contacter le client pour confirmer le rendez-vous.</p>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  payment_due: (data: any) => ({
    subject: `💰 Rappel : Paiement dû dans ${data.days_until_due} jour(s)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .amount { font-size: 24px; font-weight: bold; color: #007bff; margin: 20px 0; }
          .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💰 Rappel : Paiement à venir</h2>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Un paiement est prévu <strong>dans ${data.days_until_due} jour(s)</strong> :</p>
            <div class="amount">Montant : ${data.amount.toFixed(2)} €</div>
            <ul>
              <li><strong>Date d'échéance :</strong> ${new Date(data.due_date).toLocaleDateString('fr-FR')}</li>
            </ul>
            <p>Pensez à préparer la facturation et à envoyer un rappel au client si nécessaire.</p>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  event_reminder: (data: any) => ({
    subject: `🔔 Rappel : ${data.title} dans ${data.time_remaining}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .event-info { background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #3b82f6; }
          .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Rappel d'événement</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Vous avez un événement prévu dans <strong>${data.time_remaining}</strong> :</p>
            <div class="event-info">
              <h2>${data.title}</h2>
              <p><strong>Date :</strong> ${new Date(data.start_date).toLocaleString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              ${data.location ? `<p><strong>Lieu :</strong> ${data.location}</p>` : ''}
              ${data.project_name ? `<p><strong>Projet :</strong> ${data.project_name}</p>` : ''}
            </div>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  payment_overdue: (data: any) => ({
    subject: `🚨 URGENT : Paiement en retard de ${data.days_overdue} jour(s)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8d7da; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .amount { font-size: 24px; font-weight: bold; color: #dc3545; margin: 20px 0; }
          .alert { padding: 15px; background-color: #f8d7da; border-left: 4px solid #dc3545; margin: 20px 0; }
          .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚨 URGENT : Paiement en retard</h2>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <div class="alert">
              <strong>⚠️ ATTENTION :</strong> Un paiement est en retard depuis <strong>${data.days_overdue} jour(s)</strong>.
            </div>
            <div class="amount">Montant : ${data.amount.toFixed(2)} €</div>
            <ul>
              <li><strong>Date d'échéance :</strong> ${new Date(data.due_date).toLocaleDateString('fr-FR')}</li>
              <li><strong>Jours de retard :</strong> ${data.days_overdue} jour(s)</li>
            </ul>
            <p><strong>Action requise :</strong> Contactez immédiatement le client pour régulariser ce paiement.</p>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

/**
 * Fonction principale pour vérifier et envoyer les notifications
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification (cron secret ou service role)
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: NotificationResult[] = [];

    // 1. Vérifier les devis en attente > 3 jours
    console.log('Checking pending quotes...');
    const { data: pendingQuotes, error: pendingError } = await supabase.rpc('check_pending_quotes');
    if (!pendingError && pendingQuotes && pendingQuotes.length > 0) {
      console.log(`Found ${pendingQuotes.length} pending quotes`);
      for (const quote of pendingQuotes) {
        const template = emailTemplates.quote_pending(quote);
        await createNotification(supabase, {
          user_id: quote.user_id,
          title: `Devis en attente depuis ${quote.days_pending} jours`,
          message: `Le devis pour ${quote.client_name || 'ce client'} est en attente depuis ${quote.days_pending} jours. Pensez à le finaliser et l'envoyer.`,
          type: 'warning',
          related_table: 'ai_quotes',
          related_id: quote.quote_id,
          notification_type: 'quote_pending',
          email_subject: template.subject,
          email_html: template.html,
        });
        
        // Mettre à jour reminder_sent_at
        await supabase
          .from('ai_quotes')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', quote.quote_id);
      }
      results.push({ type: 'quote_pending', count: pendingQuotes.length, notifications: pendingQuotes });
    }

    // 2. Vérifier les devis non confirmés > 7 jours
    console.log('Checking unconfirmed quotes...');
    const { data: unconfirmedQuotes, error: unconfirmedError } = await supabase.rpc('check_unconfirmed_quotes');
    if (!unconfirmedError && unconfirmedQuotes && unconfirmedQuotes.length > 0) {
      console.log(`Found ${unconfirmedQuotes.length} unconfirmed quotes`);
      for (const quote of unconfirmedQuotes) {
        const template = emailTemplates.quote_unconfirmed(quote);
        await createNotification(supabase, {
          user_id: quote.user_id,
          title: `Devis non confirmé depuis ${quote.days_unconfirmed} jours`,
          message: `Le devis pour ${quote.client_name || 'ce client'} n'a pas été confirmé depuis ${quote.days_unconfirmed} jours. Pensez à relancer le client.`,
          type: 'warning',
          related_table: 'ai_quotes',
          related_id: quote.quote_id,
          notification_type: 'quote_unconfirmed',
          email_subject: template.subject,
          email_html: template.html,
          email_to: quote.client_email || undefined,
        });
        
        // Mettre à jour confirmation_reminder_sent_at
        await supabase
          .from('ai_quotes')
          .update({ confirmation_reminder_sent_at: new Date().toISOString() })
          .eq('id', quote.quote_id);
      }
      results.push({ type: 'quote_unconfirmed', count: unconfirmedQuotes.length, notifications: unconfirmedQuotes });
    }

    // 3. Vérifier les chantiers qui commencent bientôt
    console.log('Checking upcoming worksites...');
    const { data: upcomingWorksites, error: upcomingError } = await supabase.rpc('check_upcoming_worksites');
    if (!upcomingError && upcomingWorksites && upcomingWorksites.length > 0) {
      console.log(`Found ${upcomingWorksites.length} upcoming worksites`);
      for (const worksite of upcomingWorksites) {
        const template = emailTemplates.worksite_start(worksite);
        await createNotification(supabase, {
          user_id: worksite.user_id,
          title: `Début de chantier prévu ${worksite.days_until_start === 0 ? "aujourd'hui" : `dans ${worksite.days_until_start} jour(s)`}`,
          message: `Le chantier "${worksite.project_name}" est prévu de commencer ${worksite.days_until_start === 0 ? "aujourd'hui" : `dans ${worksite.days_until_start} jour(s)`}. Pensez à vérifier la sécurité et la préparation du chantier.`,
          type: 'info',
          related_table: 'projects',
          related_id: worksite.project_id,
          notification_type: 'worksite_start',
          email_subject: template.subject,
          email_html: template.html,
        });
        
        // Mettre à jour notification_start_sent
        await supabase
          .from('projects')
          .update({ notification_start_sent: true })
          .eq('id', worksite.project_id);
      }
      results.push({ type: 'worksite_start', count: upcomingWorksites.length, notifications: upcomingWorksites });
    }

    // 4. Vérifier les chantiers qui se terminent bientôt
    console.log('Checking ending worksites...');
    const { data: endingWorksites, error: endingError } = await supabase.rpc('check_ending_worksites');
    if (!endingError && endingWorksites && endingWorksites.length > 0) {
      console.log(`Found ${endingWorksites.length} ending worksites`);
      for (const worksite of endingWorksites) {
        const template = emailTemplates.worksite_end(worksite);
        await createNotification(supabase, {
          user_id: worksite.user_id,
          title: `Fin de chantier prévue ${worksite.days_until_end === 0 ? "aujourd'hui" : `dans ${worksite.days_until_end} jour(s)`}`,
          message: `Le chantier "${worksite.project_name}" est prévu de se terminer ${worksite.days_until_end === 0 ? "aujourd'hui" : `dans ${worksite.days_until_end} jour(s)`}. Pensez à préparer la réception et la facturation finale.`,
          type: 'info',
          related_table: 'projects',
          related_id: worksite.project_id,
          notification_type: 'worksite_end',
          email_subject: template.subject,
          email_html: template.html,
        });
        
        // Mettre à jour notification_end_sent
        await supabase
          .from('projects')
          .update({ notification_end_sent: true })
          .eq('id', worksite.project_id);
      }
      results.push({ type: 'worksite_end', count: endingWorksites.length, notifications: endingWorksites });
    }

    // 5. Vérifier les échéances de maintenance
    console.log('Checking maintenance due...');
    const { data: maintenanceDue, error: maintenanceError } = await supabase.rpc('check_maintenance_due');
    if (!maintenanceError && maintenanceDue && maintenanceDue.length > 0) {
      console.log(`Found ${maintenanceDue.length} maintenance due`);
      for (const maintenance of maintenanceDue) {
        const template = emailTemplates.maintenance_due(maintenance);
        await createNotification(supabase, {
          user_id: maintenance.user_id,
          title: `Maintenance prévue dans ${maintenance.days_until_maintenance} jour(s)`,
          message: `Une intervention de maintenance est prévue dans ${maintenance.days_until_maintenance} jour(s) pour ${maintenance.client_name} - ${maintenance.equipment_type}. Pensez à planifier cette intervention.`,
          type: 'info',
          related_table: 'maintenance_reminders',
          related_id: maintenance.reminder_id,
          notification_type: 'maintenance_due',
          email_subject: template.subject,
          email_html: template.html,
        });
        
        // Mettre à jour notification_sent
        await supabase
          .from('maintenance_reminders')
          .update({ 
            notification_sent: true,
            notification_sent_at: new Date().toISOString(),
          })
          .eq('id', maintenance.reminder_id);
      }
      results.push({ type: 'maintenance_due', count: maintenanceDue.length, notifications: maintenanceDue });
    }

    // 6. Vérifier les paiements dus
    console.log('Checking payments due...');
    const { data: paymentsDue, error: paymentsDueError } = await supabase.rpc('check_payments_due');
    if (!paymentsDueError && paymentsDue && paymentsDue.length > 0) {
      console.log(`Found ${paymentsDue.length} payments due`);
      for (const payment of paymentsDue) {
        const template = emailTemplates.payment_due(payment);
        await createNotification(supabase, {
          user_id: payment.user_id,
          title: `Paiement dû dans ${payment.days_until_due} jour(s)`,
          message: `Un paiement de ${payment.amount.toFixed(2)} € est dû dans ${payment.days_until_due} jour(s). Pensez à préparer la facturation.`,
          type: 'info',
          related_table: 'payments',
          related_id: payment.payment_id,
          notification_type: 'payment_due',
          email_subject: template.subject,
          email_html: template.html,
        });
        
        // Mettre à jour reminder_sent_at
        await supabase
          .from('payments')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', payment.payment_id);
      }
      results.push({ type: 'payment_due', count: paymentsDue.length, notifications: paymentsDue });
    }

    // 7. Vérifier les paiements en retard
    console.log('Checking overdue payments...');
    const { data: overduePayments, error: overdueError } = await supabase.rpc('check_overdue_payments');
    if (!overdueError && overduePayments && overduePayments.length > 0) {
      console.log(`Found ${overduePayments.length} overdue payments`);
      for (const payment of overduePayments) {
        const template = emailTemplates.payment_overdue(payment);
        await createNotification(supabase, {
          user_id: payment.user_id,
          title: `🚨 URGENT : Paiement en retard de ${payment.days_overdue} jour(s)`,
          message: `Un paiement de ${payment.amount.toFixed(2)} € est en retard depuis ${payment.days_overdue} jour(s). Action requise immédiatement.`,
          type: 'urgent',
          related_table: 'payments',
          related_id: payment.payment_id,
          notification_type: 'payment_overdue',
          email_subject: template.subject,
          email_html: template.html,
        });
        
        // Mettre à jour le statut et reminder_sent_at
        await supabase
          .from('payments')
          .update({ 
            status: 'overdue',
            reminder_sent_at: new Date().toISOString(),
          })
          .eq('id', payment.payment_id);
      }
      results.push({ type: 'payment_overdue', count: overduePayments.length, notifications: overduePayments });
    }

    // =====================================================
    // 7. VÉRIFIER ET ENVOYER LES RAPPELS D'ÉVÉNEMENTS
    // =====================================================
    try {
      const { data: eventReminders, error: eventRemindersError } = await supabase
        .rpc('check_and_send_event_reminders');

      if (!eventRemindersError && eventReminders) {
        const sentReminders = eventReminders.filter((r: any) => r.reminder_sent);
        
        // Pour chaque rappel envoyé, créer un email si activé
        for (const reminder of sentReminders) {
          const { data: event } = await supabase
            .from('events')
            .select(`
              *,
              projects (
                name
              )
            `)
            .eq('id', reminder.event_id)
            .single();

          if (event) {
            const { data: settings } = await supabase
              .from('user_settings')
              .select('email_notifications, email')
              .eq('user_id', reminder.user_id)
              .single();

            const { data: user } = await supabase.auth.admin.getUserById(reminder.user_id);

            if (settings?.email_notifications && (settings.email || user?.user?.email)) {
              const emailTo = settings.email || user?.user?.email;
              const eventDate = new Date(event.start_date);
              const now = new Date();
              const diffMs = eventDate.getTime() - now.getTime();
              const diffMinutes = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMinutes / 60);
              const diffDays = Math.floor(diffHours / 24);

              let timeRemaining = '';
              if (diffDays > 0) {
                timeRemaining = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
              } else if (diffHours > 0) {
                timeRemaining = `${diffHours} heure${diffHours > 1 ? 's' : ''}`;
              } else {
                timeRemaining = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
              }

              await createNotification(supabase, {
                user_id: reminder.user_id,
                title: `🔔 Rappel : ${event.title}`,
                message: `L'événement "${event.title}" est prévu dans ${timeRemaining}.`,
                type: 'reminder',
                related_table: 'events',
                related_id: event.id,
                notification_type: 'event_reminder',
                email_subject: `🔔 Rappel : ${event.title} dans ${timeRemaining}`,
                email_html: emailTemplates.event_reminder({
                  title: event.title,
                  start_date: event.start_date,
                  location: event.location,
                  project_name: event.projects?.name,
                  time_remaining: timeRemaining,
                }),
              });
            }
          }
        }

        results.push({ 
          type: 'event_reminders', 
          count: sentReminders.length, 
          notifications: sentReminders 
        });
      }
    } catch (eventError) {
      console.error('Error processing event reminders:', eventError);
    }

    // Résumé
    const totalNotifications = results.reduce((sum, r) => sum + r.count, 0);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${totalNotifications} notifications`,
      results,
      total: totalNotifications,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-notifications function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Fonction helper pour créer une notification et un email
 */
async function createNotification(
  supabase: any,
  data: {
    user_id: string;
    title: string;
    message: string;
    type: string;
    related_table: string | null;
    related_id: string | null;
    notification_type: string;
    email_subject?: string;
    email_html?: string;
    email_to?: string;
  }
) {
  try {
    // Créer la notification via la fonction SQL
    // La fonction SQL récupère automatiquement l'email de l'utilisateur
    const { data: notificationId, error: notifError } = await supabase.rpc('create_notification_with_email', {
      p_user_id: data.user_id,
      p_title: data.title,
      p_message: data.message,
      p_type: data.type,
      p_related_table: data.related_table,
      p_related_id: data.related_id,
      p_email_to: data.email_to || null,
      p_email_subject: data.email_subject || null,
      p_email_html: data.email_html || null,
      p_notification_type: data.notification_type,
    });

    if (notifError) {
      console.error('Error creating notification:', notifError);
      // Fallback: créer manuellement la notification
      await supabase.from('notifications').insert({
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        related_table: data.related_table,
        related_id: data.related_id,
      });

      // Créer l'email si nécessaire
      if (userEmail && data.email_subject && data.email_html) {
        await supabase.from('email_queue').insert({
          user_id: data.user_id,
          to_email: userEmail,
          subject: data.email_subject,
          html_content: data.email_html,
          type: data.notification_type,
          status: 'pending',
        });
      }
    }

    return notificationId;
  } catch (error) {
    console.error('Error in createNotification:', error);
    throw error;
  }
}

