/**
 * GoCardless Payment Adapter
 * 
 * Documentation: https://developer.gocardless.com/
 * 
 * GoCardless est spécialisé dans les prélèvements SEPA et les paiements récurrents
 * Idéal pour les abonnements et les paiements réguliers dans le BTP
 */

import type { IPaymentProvider } from '../interfaces/IPaymentProvider';
import type {
  PaymentSessionParams,
  PaymentSessionResult,
  PaymentLinkParams,
  PaymentLinkResult,
  RefundParams,
  RefundResult,
  WebhookEvent,
  PaymentStatusResult,
  CustomerData,
  CustomerResult,
  PaymentProviderConfig,
} from '../types/PaymentTypes';

export class GoCardlessAdapter implements IPaymentProvider {
  public readonly name = 'GoCardless';
  public readonly type = 'gocardless';
  
  private accessToken: string | null = null;
  private config: PaymentProviderConfig | null = null;
  private apiBaseUrl = 'https://api.gocardless.com';

  async initialize(config: PaymentProviderConfig): Promise<void> {
    this.config = config;
    
    // GoCardless utilise OAuth2 ou une clé d'accès
    this.accessToken = config.credentials.accessToken || config.credentials.secretKey;

    if (!this.accessToken) {
      throw new Error('GoCardless access token is required');
    }

    // Déterminer l'URL de l'API selon l'environnement
    if (this.accessToken.startsWith('sandbox_')) {
      this.apiBaseUrl = 'https://api-sandbox.gocardless.com';
    } else {
      this.apiBaseUrl = 'https://api.gocardless.com';
    }
  }

  async createPaymentSession(
    params: PaymentSessionParams
  ): Promise<PaymentSessionResult> {
    if (!this.accessToken) {
      throw new Error('GoCardless adapter not initialized');
    }

    try {
      // GoCardless fonctionne différemment : il faut d'abord créer un mandat (mandate)
      // puis créer un paiement basé sur ce mandat
      // Pour les paiements ponctuels, on utilise les "one-off payments"
      
      // TODO: Implémenter la création de paiement avec GoCardless Payments API
      // Documentation: https://developer.gocardless.com/api-reference#payments
      
      // Étape 1: Créer ou récupérer un customer
      const customer = await this.createCustomer({
        email: params.customerEmail,
        name: params.customerName,
      });

      // Étape 2: Créer un mandat (pour les paiements récurrents) ou un paiement ponctuel
      const response = await fetch(`${this.apiBaseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'GoCardless-Version': '2015-07-06',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // Convert to pence/cents
          currency: params.currency,
          description: params.description || 'Paiement',
          metadata: {
            ...params.metadata,
            invoice_id: params.invoiceId || '',
            quote_id: params.quoteId || '',
          },
          links: {
            mandate: params.metadata?.mandate_id || '', // Nécessite un mandat préalable
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GoCardless payment creation failed: ${error.message || response.statusText}`);
      }

      const data = await response.json();

      // GoCardless ne retourne pas d'URL de checkout comme Stripe
      // Le paiement est traité directement via le mandat
      // Pour les paiements ponctuels sans mandat, il faut utiliser le flow de redirection
      
      return {
        sessionId: data.payments?.id || data.id,
        checkoutUrl: params.successUrl, // GoCardless redirige vers success_url après traitement
        providerPaymentId: data.payments?.id || data.id,
      };
    } catch (error: any) {
      throw new Error(`GoCardless payment session creation failed: ${error.message}`);
    }
  }

  async createPaymentLink(
    params: PaymentLinkParams
  ): Promise<PaymentLinkResult> {
    if (!this.accessToken) {
      throw new Error('GoCardless adapter not initialized');
    }

    try {
      // GoCardless utilise les "billing requests" pour créer des liens de paiement
      // TODO: Implémenter avec GoCardless Billing Requests API
      // Documentation: https://developer.gocardless.com/api-reference#billing-requests
      
      const response = await fetch(`${this.apiBaseUrl}/v1/billing_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'GoCardless-Version': '2015-07-06',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_request: {
            amount: Math.round(params.amount * 100),
            currency: params.currency,
            description: params.description || 'Paiement',
          },
          metadata: params.metadata || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`GoCardless payment link creation failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentLinkId: data.billing_requests?.id || data.id,
        url: data.billing_requests?.authorisation_url || data.authorisation_url,
      };
    } catch (error: any) {
      throw new Error(`GoCardless payment link creation failed: ${error.message}`);
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!this.accessToken) {
      throw new Error('GoCardless adapter not initialized');
    }

    try {
      // GoCardless appelle les remboursements "refunds"
      // TODO: Implémenter le remboursement avec GoCardless Refunds API
      // Documentation: https://developer.gocardless.com/api-reference#refunds
      
      const refundData: any = {
        amount: params.amount ? Math.round(params.amount * 100) : undefined,
        links: {
          payment: params.paymentId,
        },
      };

      const response = await fetch(`${this.apiBaseUrl}/v1/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'GoCardless-Version': '2015-07-06',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        throw new Error(`GoCardless refund failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        refundId: data.refunds?.id || data.id,
        amount: data.refunds?.amount ? data.refunds.amount / 100 : params.amount || 0,
        status: this.mapGoCardlessStatus(data.refunds?.status || data.status),
      };
    } catch (error: any) {
      throw new Error(`GoCardless refund failed: ${error.message}`);
    }
  }

  async verifyWebhook(
    request: Request,
    secret: string
  ): Promise<WebhookEvent> {
    // TODO: Implémenter la vérification des webhooks GoCardless
    // Documentation: https://developer.gocardless.com/getting-started/api/handling-webhooks
    
    const body = await request.text();
    const signature = request.headers.get('webhook-signature');

    if (!signature) {
      throw new Error('Missing GoCardless signature header');
    }

    // TODO: Vérifier la signature
    // GoCardless utilise une signature HMAC-SHA256
    // const isValid = verifyHmacSignature(body, signature, secret);
    // if (!isValid) {
    //   throw new Error('Invalid GoCardless webhook signature');
    // }

    const event = JSON.parse(body);

    return {
      id: event.events?.[0]?.id || event.id,
      type: event.events?.[0]?.action || event.type,
      data: event.events?.[0]?.resource || event.data,
      provider: 'gocardless',
      timestamp: new Date().toISOString(),
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.accessToken) {
      throw new Error('GoCardless adapter not initialized');
    }

    try {
      // TODO: Implémenter la récupération du statut avec GoCardless Payments API
      
      const response = await fetch(`${this.apiBaseUrl}/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'GoCardless-Version': '2015-07-06',
        },
      });

      if (!response.ok) {
        throw new Error(`GoCardless payment status retrieval failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentId: data.payments?.id || data.id,
        status: this.mapGoCardlessStatus(data.payments?.status || data.status),
        amount: data.payments?.amount ? data.payments.amount / 100 : 0,
        currency: data.payments?.currency?.toUpperCase() || 'EUR',
        paidAt: data.payments?.charge_date 
          ? new Date(data.payments.charge_date).toISOString() 
          : undefined,
        metadata: data.payments?.metadata || {},
      };
    } catch (error: any) {
      throw new Error(`GoCardless payment status retrieval failed: ${error.message}`);
    }
  }

  async createCustomer(customerData: CustomerData): Promise<CustomerResult> {
    if (!this.accessToken) {
      throw new Error('GoCardless adapter not initialized');
    }

    try {
      // TODO: Implémenter la création de customer avec GoCardless Customers API
      // Documentation: https://developer.gocardless.com/api-reference#customers
      
      const response = await fetch(`${this.apiBaseUrl}/v1/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'GoCardless-Version': '2015-07-06',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerData.email,
          given_name: customerData.name?.split(' ')[0],
          family_name: customerData.name?.split(' ').slice(1).join(' ') || '',
          address_line1: customerData.address?.line1,
          city: customerData.address?.city,
          postal_code: customerData.address?.postalCode,
          country_code: customerData.address?.country || 'FR',
        }),
      });

      if (!response.ok) {
        throw new Error(`GoCardless customer creation failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        customerId: data.customers?.id || data.id,
        email: data.customers?.email || customerData.email,
      };
    } catch (error: any) {
      throw new Error(`GoCardless customer creation failed: ${error.message}`);
    }
  }

  isConfigured(): boolean {
    return this.accessToken !== null && this.config !== null;
  }

  /**
   * Mapper les statuts GoCardless vers nos statuts unifiés
   */
  private mapGoCardlessStatus(goCardlessStatus: string): PaymentStatusResult['status'] {
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      pending_submission: 'pending',
      submitted: 'processing',
      confirmed: 'succeeded',
      paid_out: 'succeeded',
      cancelled: 'cancelled',
      customer_approval_denied: 'failed',
      failed: 'failed',
      charged_back: 'failed',
      refunded: 'refunded',
    };

    return statusMap[goCardlessStatus.toLowerCase()] || 'pending';
  }
}














