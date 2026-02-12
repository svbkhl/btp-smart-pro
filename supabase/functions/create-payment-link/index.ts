/**
 * Edge Function: create-payment-link
 * 
 * Crée un lien de paiement Stripe Checkout Session
 * 
 * Flow:
 * 1. Vérifie que le devis est signé
 * 2. Génère ou récupère la facture
 * 3. Crée une Stripe Checkout Session
 * 4. Enregistre le paiement en DB
 * 5. Retourne le lien de paiement
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { verifyCompanyMember } from "../_shared/auth.ts";

// Helper pour récupérer le company_id avec fallback agressif
async function getCompanyId(supabaseClient: any, userId: string, quoteCompanyId?: string): Promise<string> {
  // Priorité 1 : company_id du devis
  if (quoteCompanyId) {
    console.log('✅ company_id trouvé depuis le devis:', quoteCompanyId);
    return quoteCompanyId;
  }

  // Priorité 2 : company_id depuis company_users
  console.log('⚠️ Pas de company_id dans le devis, récupération depuis user');
  const { data: companyUser, error } = await supabaseClient
    .from('company_users')
    .select('company_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ Erreur récupération company_id depuis company_users:', error);
  }

  if (companyUser?.company_id) {
    console.log('✅ company_id trouvé depuis company_users:', companyUser.company_id);
    return companyUser.company_id;
  }

  // Priorité 3 : Créer une company par défaut pour cet utilisateur
  console.error('⚠️ FALLBACK ULTIME: Création company pour user:', userId);

  const { data: newCompany, error: companyError } = await supabaseClient
    .from('companies')
    .insert({
      name: 'Entreprise par défaut',
      owner_id: userId,
    })
    .select()
    .single();

  if (companyError || !newCompany) {
    console.error('❌ Impossible de créer company de fallback:', companyError);
    throw new Error('Impossible de déterminer ou créer company_id');
  }

  // Lier l'utilisateur à cette nouvelle company
  await supabaseClient
    .from('company_users')
    .insert({
      user_id: userId,
      company_id: newCompany.id,
      role: 'owner',
    });

  console.log('✅ Company de fallback créée:', newCompany.id);
  return newCompany.id;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
    const APP_URL = Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_URL') || 'https://www.btpsmartpro.com';

    if (!STRIPE_SECRET_KEY) {
      console.error('❌ [create-payment-link] STRIPE_SECRET_KEY non configuré');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'STRIPE_SECRET_KEY not configured',
          details: 'La clé API Stripe n\'est pas configurée dans les variables d\'environnement',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing authorization header',
          details: 'Un token d\'authentification est requis',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !authUser) {
      console.error('❌ [create-payment-link] Erreur authentification:', authError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unauthorized', 
          details: authError?.message || 'Token d\'authentification invalide ou expiré',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = { id: authUser.id, email: authUser.email };

    // Essayer de récupérer le company_id, mais ne pas bloquer si l'utilisateur n'est pas membre
    let companyId: string | null = null;
    try {
      const { verifyCompanyMember } = await import("../_shared/auth.ts");
      const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
      
      const authResult = await verifyCompanyMember(
        req,
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );

      if (authResult.success && authResult.companyId) {
        companyId = authResult.companyId;
        console.log('✅ [create-payment-link] Company ID récupéré:', companyId);
      } else {
        console.warn('⚠️ [create-payment-link] Utilisateur non membre d\'une entreprise, utilisation de user_id uniquement');
      }
    } catch (companyError) {
      console.warn('⚠️ [create-payment-link] Erreur récupération company:', companyError);
      // Continuer sans company_id
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ [create-payment-link] Erreur parsing body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { 
      quote_id, 
      invoice_id,
      payment_type = 'total', // 'total', 'deposit', 'partial'
      amount, // Montant custom (pour acompte)
      client_email,
      client_name
    } = body;

    console.log('📥 [create-payment-link] Requête reçue:', { 
      quote_id, 
      invoice_id, 
      payment_type, 
      amount, 
      user_id: user.id,
      company_id: companyId,
      body_keys: Object.keys(body),
    });

    // =====================================================
    // 1️⃣ VÉRIFIER LE DEVIS
    // =====================================================

    if (!quote_id) {
      console.error('❌ [create-payment-link] quote_id manquant dans la requête');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'quote_id is required',
          received_body: body,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Récupérer le devis (vérifier qu'il appartient à la company de l'user ou à l'user)
    let { data: quote, error: quoteError } = await supabaseClient
      .from('ai_quotes')
      .select('*')
      .eq('id', quote_id)
      .maybeSingle();

    // Si pas trouvé dans ai_quotes, essayer dans quotes
    if (!quote || quoteError) {
      console.log('🔍 [create-payment-link] Pas trouvé dans ai_quotes, essai dans quotes');
      const quotesResult = await supabaseClient
        .from('quotes')
        .select('*')
        .eq('id', quote_id)
        .maybeSingle();
      
      if (quotesResult.data) {
        quote = quotesResult.data;
        quoteError = null;
      }
    }

    if (quoteError || !quote) {
      console.error('❌ [create-payment-link] Devis non trouvé:', quoteError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Quote not found', 
          details: quoteError?.message || 'Le devis n\'a pas été trouvé dans la base de données',
          quote_id,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Vérifier l'appartenance : soit company_id correspond, soit user_id correspond
    const hasCompanyAccess = companyId && quote.company_id && quote.company_id === companyId;
    const hasUserAccess = quote.user_id === user.id;
    
    if (!hasCompanyAccess && !hasUserAccess) {
      console.error('❌ [create-payment-link] Devis n\'appartient pas à votre entreprise ou utilisateur', {
        quote_company_id: quote.company_id,
        user_company_id: companyId,
        quote_user_id: quote.user_id,
        user_id: user.id,
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Quote not found or access denied',
          details: 'Le devis n\'appartient pas à votre compte',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('✅ [create-payment-link] Accès autorisé au devis:', {
      quote_id: quote_id,
      hasCompanyAccess,
      hasUserAccess,
    });

    // Vérifier que le devis est signé
    if (!quote.signed || !quote.signed_at) {
      console.error('❌ [create-payment-link] Devis non signé:', {
        quote_id,
        signed: quote.signed,
        signed_at: quote.signed_at,
        status: quote.status,
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Quote must be signed before payment',
          details: 'Le devis doit être signé avant de créer un lien de paiement',
          quote_status: quote.status,
          quote_signed: quote.signed,
          quote_signed_at: quote.signed_at,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Devis trouvé et signé:', quote_id);

    // Résoudre company_id (auth, devis ou company_users) pour facture/paiement
    if (!companyId) {
      companyId = await getCompanyId(supabaseClient, user.id, quote.company_id);
    }
    if (!companyId) {
      console.error('❌ [create-payment-link] Impossible de déterminer company_id');
      return new Response(
        JSON.stringify({ error: 'User has no company assigned', details: 'company_id manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // 2️⃣ GÉNÉRER OU RÉCUPÉRER LA FACTURE
    // =====================================================

    let invoice;
    let invoiceId = invoice_id;

    if (!invoiceId) {
      // Vérifier si une facture existe déjà pour ce devis
      let { data: existingInvoice } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('quote_id', quote_id)
        .maybeSingle();
      
      // Si pas trouvée avec company_id, essayer avec user_id
      if (!existingInvoice) {
        const invoiceByUser = await supabaseClient
          .from('invoices')
          .select('*')
          .eq('quote_id', quote_id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (invoiceByUser.data) {
          existingInvoice = invoiceByUser.data;
        }
      }

      if (existingInvoice) {
        invoice = existingInvoice;
        invoiceId = existingInvoice.id;
        console.log('✅ Facture existante trouvée:', invoiceId);
      } else {
        // Créer une nouvelle facture — résolution définitive de company_id juste avant l'insert (défensif)
        let finalCompanyId: string | null = (companyId && String(companyId).trim()) ? companyId : null;
        if (!finalCompanyId) {
          try {
            finalCompanyId = await getCompanyId(supabaseClient, user.id, quote.company_id);
          } catch (e) {
            console.error('❌ [create-payment-link] getCompanyId fallback failed:', e);
            return new Response(
              JSON.stringify({ error: 'User has no company assigned', details: 'company_id manquant' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        if (!finalCompanyId || !String(finalCompanyId).trim()) {
          console.error('❌ [create-payment-link] company_id vide avant insert facture');
          return new Response(
            JSON.stringify({ error: 'User has no company assigned', details: 'company_id manquant' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const invoiceAmount = quote.estimated_cost || 0;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

        const invoiceData: any = {
          user_id: user.id,
          company_id: finalCompanyId,
          client_id: quote.client_id,
          quote_id: quote_id,
          invoice_number: invoiceNumber,
          client_name: quote.client_name || client_name,
          client_email: quote.client_email || client_email,
          amount: invoiceAmount,
          total_ttc: invoiceAmount,
          amount_paid: 0,
          amount_remaining: invoiceAmount,
          status: 'draft',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours
        };
        
        // Garde absolue : ne jamais insérer avec company_id null
        const safeCompanyId = (invoiceData.company_id && String(invoiceData.company_id).trim()) || finalCompanyId || (companyId && String(companyId).trim()) || null;
        if (!safeCompanyId) {
          console.error('❌ [create-payment-link] Blocage insert: company_id manquant');
          return new Response(
            JSON.stringify({ error: 'User has no company assigned', details: 'company_id manquant' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        invoiceData.company_id = safeCompanyId;

        console.log('📋 [create-payment-link] Données facture à créer:', {
          user_id: invoiceData.user_id,
          company_id: invoiceData.company_id,
          quote_id: invoiceData.quote_id,
          invoice_number: invoiceData.invoice_number,
        });

        const { data: newInvoice, error: invoiceError } = await supabaseClient
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (invoiceError || !newInvoice) {
          console.error('❌ [create-payment-link] Erreur création facture:', invoiceError);
          console.error('❌ [create-payment-link] Données tentées:', {
            user_id: invoiceData.user_id,
            company_id: invoiceData.company_id,
            quote_id: invoiceData.quote_id,
            invoice_number: invoiceData.invoice_number,
            companyId: companyId,
            invoiceData_full: JSON.stringify(invoiceData),
          });
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to create invoice', 
              details: invoiceError?.message,
              code: invoiceError?.code,
              attempted_data: {
                has_company_id: !!invoiceData.company_id,
                company_id_value: invoiceData.company_id,
              },
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        invoice = newInvoice;
        invoiceId = newInvoice.id;
        console.log('✅ Nouvelle facture créée:', invoiceId);
      }
    } else {
      // Récupérer la facture existante
      const { data: existingInvoice, error: invoiceError } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (invoiceError || !existingInvoice) {
        console.error('❌ [create-payment-link] Facture non trouvée:', invoiceError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Invoice not found',
            details: invoiceError?.message || 'La facture n\'a pas été trouvée',
            invoice_id: invoiceId,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      invoice = existingInvoice;
    }

    // Vérifier si la facture est déjà payée
    if (invoice.status === 'paid') {
      console.warn('⚠️ [create-payment-link] Facture déjà payée:', invoiceId);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invoice already paid',
          details: 'Cette facture a déjà été payée',
          invoice_id: invoiceId,
          invoice_status: invoice.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 3️⃣ CALCULER LE MONTANT À PAYER
    // =====================================================

    let paymentAmount = 0;
    const invoiceTotal = invoice.amount || invoice.total_ttc || 0;
    const alreadyPaid = invoice.amount_paid || 0;
    const remaining = invoiceTotal - alreadyPaid;

    if (payment_type === 'total') {
      paymentAmount = remaining;
    } else if (payment_type === 'deposit' || payment_type === 'partial') {
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Amount is required for deposit/partial payment',
            payment_type,
            amount_provided: amount,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      paymentAmount = Math.min(amount, remaining); // Ne pas dépasser le restant
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid payment_type. Use: total, deposit, or partial',
          payment_type_received: payment_type,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (paymentAmount <= 0) {
      console.error('❌ [create-payment-link] Montant invalide:', paymentAmount);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Payment amount must be greater than 0',
          paymentAmount,
          payment_type,
          invoiceTotal,
          alreadyPaid,
          remaining,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (isNaN(paymentAmount)) {
      console.error('❌ [create-payment-link] Montant n\'est pas un nombre:', paymentAmount);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Payment amount must be a valid number',
          paymentAmount,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('💰 [create-payment-link] Montant à payer:', { paymentAmount, payment_type, invoiceTotal, alreadyPaid, remaining });

    // =====================================================
    // 4️⃣ CRÉER LA STRIPE CHECKOUT SESSION
    // =====================================================

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Récupérer stripe_connect depuis la company (niveau entreprise - 1 Stripe par entreprise)
    const effectiveCompanyId = invoice.company_id || quote.company_id || companyId;
    const { data: companyData } = await supabaseClient
      .from('companies')
      .select('stripe_connect_account_id, stripe_connect_connected')
      .eq('id', effectiveCompanyId)
      .maybeSingle();

    const stripeAccountId = companyData?.stripe_connect_account_id;
    const stripeConnected = companyData?.stripe_connect_connected;

    // Vérifier que le montant est valide pour Stripe (minimum 0.50€)
    const amountInCents = Math.round(paymentAmount * 100);
    if (amountInCents < 50) {
      console.error('❌ [create-payment-link] Montant trop faible pour Stripe:', amountInCents, 'centimes');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Le montant minimum est de 0,50 €',
          paymentAmount,
          amountInCents,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Paramètres de base pour la session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Facture ${invoice.invoice_number || 'N/A'}`,
              description: `Paiement ${payment_type === 'total' ? 'total' : 'acompte'} - Devis ${quote.quote_number || quote_id.slice(0, 8)}`,
            },
            unit_amount: amountInCents, // Stripe utilise les centimes
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/payment/cancel?invoice_id=${invoiceId}`,
      metadata: {
        quote_id: quote_id,
        invoice_id: invoiceId,
        user_id: user.id,
        payment_type: payment_type,
        client_email: invoice.client_email || quote.client_email || client_email || '',
        client_name: invoice.client_name || quote.client_name || client_name || '',
      },
    };

    // Ajouter customer_email seulement s'il existe
    const customerEmail = invoice.client_email || quote.client_email || client_email;
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    console.log('📋 [create-payment-link] Paramètres session Stripe:', {
      amountInCents,
      currency: 'eur',
      invoice_number: invoice.invoice_number,
      quote_number: quote.quote_number,
      customer_email: customerEmail,
      stripeAccountId: stripeAccountId || 'none',
    });

    // Si Stripe Connect est configuré, ajouter le connected account
    if (stripeAccountId && stripeConnected) {
      console.log('✅ Utilisation Stripe Connect:', stripeAccountId);
      // @ts-ignore - Stripe types
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(paymentAmount * 100 * 0.02), // 2% de frais applicatifs
      };
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create(
        sessionParams,
        stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
      );
      console.log('✅ [create-payment-link] Stripe Checkout Session créée:', session.id);
    } catch (stripeError: any) {
      console.error('❌ [create-payment-link] Erreur création session Stripe:', stripeError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erreur Stripe lors de la création de la session',
          details: stripeError.message || 'Erreur inconnue',
          type: stripeError.type,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 5️⃣ ENREGISTRER LE PAIEMENT EN BASE
    // =====================================================

    const paymentData: any = {
      user_id: user.id,
      company_id: companyId || quote.company_id || invoice.company_id,
      invoice_id: invoiceId,
      quote_id: quote_id,
      client_id: quote.client_id,
      amount: paymentAmount,
      payment_type: payment_type,
      payment_method: 'stripe',
      payment_link: session.url,
      stripe_session_id: session.id,
      currency: 'EUR',
      status: 'pending',
      reference: invoice.invoice_number,
    };
    
    console.log('📋 [create-payment-link] Données paiement à créer:', {
      user_id: paymentData.user_id,
      company_id: paymentData.company_id,
      invoice_id: paymentData.invoice_id,
      quote_id: paymentData.quote_id,
    });

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('❌ [create-payment-link] Erreur création paiement:', paymentError);
      // Ne pas bloquer, le webhook gérera, mais logger l'erreur
      console.error('❌ [create-payment-link] Détails erreur paiement:', {
        message: paymentError.message,
        code: paymentError.code,
        details: paymentError.details,
        hint: paymentError.hint,
      });
    } else {
      console.log('✅ [create-payment-link] Paiement créé en base:', payment.id);
    }

    // Mettre à jour la facture
    await supabaseClient
      .from('invoices')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    // =====================================================
    // 6️⃣ RETOURNER LE LIEN
    // =====================================================

    if (!session || !session.url) {
      console.error('❌ [create-payment-link] Session Stripe invalide:', session);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Session Stripe invalide',
          details: 'La session de paiement n\'a pas été créée correctement',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ [create-payment-link] Succès - Lien créé:', {
      session_id: session.id,
      payment_url: session.url,
      payment_id: payment?.id,
      invoice_id: invoiceId,
      amount: paymentAmount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: session.url,  // ← Changé de payment_link à payment_url
        payment_link: session.url,  // ← Gardé pour rétrocompatibilité
        session_id: session.id,
        payment_id: payment?.id,
        invoice_id: invoiceId,
        amount: paymentAmount,
        currency: 'EUR',
        payment_type: payment_type,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const msg = error?.message ?? 'Erreur inconnue';
    console.error('❌ [create-payment-link] Error:', msg);
    if (error?.stack) console.error('❌ [create-payment-link] Stack:', error.stack);

    let errorMessage = 'Erreur lors de la création du lien de paiement';
    let errorDetails = msg;

    if (msg.includes('Stripe') || (err as { type?: string })?.type?.includes?.('Stripe')) {
      errorMessage = 'Erreur Stripe';
      errorDetails = (err as { raw?: { message?: string } })?.raw?.message ?? msg;
    } else if (msg.includes('not found')) {
      errorMessage = 'Devis ou facture introuvable';
    } else if (msg.includes('Unauthorized') || msg.includes('access denied')) {
      errorMessage = 'Accès refusé';
      errorDetails = 'Vous n\'avez pas les permissions nécessaires';
    } else if (msg.includes('STRIPE_SECRET_KEY')) {
      errorMessage = 'Configuration Stripe manquante';
    } else if (msg.includes('company')) {
      errorMessage = 'Erreur entreprise';
    }

    const errorResponse: Record<string, unknown> = {
      success: false,
      error: errorMessage,
      details: errorDetails,
      error_type: error?.name ?? 'UnknownError',
    };
    if (Deno.env.get('ENVIRONMENT') === 'development' || Deno.env.get('NODE_ENV') === 'development') {
      errorResponse.stack = error?.stack;
    }

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});



