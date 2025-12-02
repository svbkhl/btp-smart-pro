/**
 * Stancer Payment Adapter
 * 
 * Documentation: https://docs.stancer.com/
 * 
 * Stancer est une solution de paiement française, alternative à Stripe
 * Supporte les cartes bancaires et les prélèvements SEPA
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

export class StancerAdapter implements IPaymentProvider {
  public readonly name = 'Stancer';
  public readonly type = 'stancer';
  
  private secretKey: string | null = null;
  private config: PaymentProviderConfig | null = null;
  private apiBaseUrl = 'https://api.stancer.com';

  async initialize(config: PaymentProviderConfig): Promise<void> {
    this.config = config;
    
    // Stancer utilise une clé secrète
    this.secretKey = config.credentials.secretKey || config.credentials.apiKey;

    if (!this.secretKey) {
      throw new Error('Stancer secret key is required');
    }

    // Déterminer l'URL de l'API selon l'environnement
    if (this.secretKey.startsWith('sk_test_')) {
      this.apiBaseUrl = 'https://api.stancer.com';
    } else if (this.secretKey.startsWith('sk_live_')) {
      this.apiBaseUrl = 'https://api.stancer.com';
    }
  }

  async createPaymentSession(
    params: PaymentSessionParams
  ): Promise<PaymentSessionResult> {
    if (!this.secretKey) {
      throw new Error('Stancer adapter not initialized');
    }

    try {
      // TODO: Implémenter la création de paiement avec Stancer Payments API
      // Documentation: https://docs.stancer.com/api-reference/payments
      
      const response = await fetch(`${this.apiBaseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // Convert to cents
          currency: params.currency.toLowerCase(),
          description: params.description || 'Paiement',
          customer: {
            email: params.customerEmail,
            name: params.customerName,
          },
          metadata: {
            ...params.metadata,
            invoice_id: params.invoiceId || '',
            quote_id: params.quoteId || '',
          },
          return_url: params.successUrl,
          cancel_url: params.cancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Stancer payment creation failed: ${error.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        sessionId: data.id,
        checkoutUrl: data.checkout_url || data.url,
        providerPaymentId: data.id,
      };
    } catch (error: any) {
      throw new Error(`Stancer payment session creation failed: ${error.message}`);
    }
  }

  async createPaymentLink(
    params: PaymentLinkParams
  ): Promise<PaymentLinkResult> {
    if (!this.secretKey) {
      throw new Error('Stancer adapter not initialized');
    }

    try {
      // TODO: Implémenter la création de payment link avec Stancer
      // Stancer utilise les "payment pages" ou "checkout sessions"
      
      const response = await fetch(`${this.apiBaseUrl}/v1/payment_links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100),
          currency: params.currency.toLowerCase(),
          description: params.description || 'Paiement',
          metadata: params.metadata || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Stancer payment link creation failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentLinkId: data.id,
        url: data.url || data.checkout_url,
      };
    } catch (error: any) {
      throw new Error(`Stancer payment link creation failed: ${error.message}`);
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!this.secretKey) {
      throw new Error('Stancer adapter not initialized');
    }

    try {
      // TODO: Implémenter le remboursement avec Stancer Refunds API
      // Documentation: https://docs.stancer.com/api-reference/refunds
      
      const refundData: any = {};
      if (params.amount) {
        refundData.amount = Math.round(params.amount * 100);
      }

      const response = await fetch(`${this.apiBaseUrl}/v1/payments/${params.paymentId}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        throw new Error(`Stancer refund failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        refundId: data.id,
        amount: data.amount ? data.amount / 100 : params.amount || 0,
        status: this.mapStancerStatus(data.status),
      };
    } catch (error: any) {
      throw new Error(`Stancer refund failed: ${error.message}`);
    }
  }

  async verifyWebhook(
    request: Request,
    secret: string
  ): Promise<WebhookEvent> {
    // TODO: Implémenter la vérification des webhooks Stancer
    // Documentation: https://docs.stancer.com/webhooks
    
    const body = await request.text();
    const signature = request.headers.get('stancer-signature');

    if (!signature) {
      throw new Error('Missing Stancer signature header');
    }

    // TODO: Vérifier la signature HMAC
    // const isValid = verifyHmacSignature(body, signature, secret);
    // if (!isValid) {
    //   throw new Error('Invalid Stancer webhook signature');
    // }

    const event = JSON.parse(body);

    return {
      id: event.id || event.event_id,
      type: event.type || event.event_type,
      data: event.data || event,
      provider: 'stancer',
      timestamp: new Date().toISOString(),
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.secretKey) {
      throw new Error('Stancer adapter not initialized');
    }

    try {
      // TODO: Implémenter la récupération du statut avec Stancer Payments API
      
      const response = await fetch(`${this.apiBaseUrl}/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Stancer payment status retrieval failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentId: data.id,
        status: this.mapStancerStatus(data.status),
        amount: data.amount ? data.amount / 100 : 0,
        currency: data.currency?.toUpperCase() || 'EUR',
        paidAt: data.paid_at ? new Date(data.paid_at * 1000).toISOString() : undefined,
        metadata: data.metadata || {},
      };
    } catch (error: any) {
      throw new Error(`Stancer payment status retrieval failed: ${error.message}`);
    }
  }

  async createCustomer(customerData: CustomerData): Promise<CustomerResult> {
    // Stancer gère les clients via l'email dans les paiements
    return {
      customerId: customerData.email,
      email: customerData.email,
    };
  }

  isConfigured(): boolean {
    return this.secretKey !== null && this.config !== null;
  }

  /**
   * Mapper les statuts Stancer vers nos statuts unifiés
   */
  private mapStancerStatus(stancerStatus: string): PaymentStatusResult['status'] {
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      pending: 'pending',
      processing: 'processing',
      succeeded: 'succeeded',
      paid: 'succeeded',
      failed: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
      partially_refunded: 'partially_refunded',
    };

    return statusMap[stancerStatus.toLowerCase()] || 'pending';
  }
}

