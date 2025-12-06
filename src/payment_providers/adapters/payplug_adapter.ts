/**
 * PayPlug Payment Adapter
 * 
 * Documentation: https://docs.payplug.com/
 * 
 * PayPlug est une solution de paiement française, idéale pour les entreprises françaises
 * Supporte les paiements en ligne et les prélèvements SEPA
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

export class PayPlugAdapter implements IPaymentProvider {
  public readonly name = 'PayPlug';
  public readonly type = 'payplug';
  
  private secretKey: string | null = null;
  private config: PaymentProviderConfig | null = null;
  private apiBaseUrl = 'https://api.payplug.com';

  async initialize(config: PaymentProviderConfig): Promise<void> {
    this.config = config;
    
    // PayPlug utilise une clé secrète simple
    this.secretKey = config.credentials.secretKey || config.credentials.apiKey;

    if (!this.secretKey) {
      throw new Error('PayPlug secret key is required');
    }

    // Déterminer l'URL de l'API selon l'environnement (test ou production)
    if (this.secretKey.startsWith('sk_test_')) {
      this.apiBaseUrl = 'https://api.payplug.com';
    } else if (this.secretKey.startsWith('sk_live_')) {
      this.apiBaseUrl = 'https://api.payplug.com';
    } else {
      throw new Error('Invalid PayPlug secret key format');
    }
  }

  async createPaymentSession(
    params: PaymentSessionParams
  ): Promise<PaymentSessionResult> {
    if (!this.secretKey) {
      throw new Error('PayPlug adapter not initialized');
    }

    try {
      // TODO: Implémenter la création de paiement avec PayPlug Payments API
      // Documentation: https://docs.payplug.com/api-routes#tag/Payments
      
      const response = await fetch(`${this.apiBaseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // Convert to cents
          currency: params.currency,
          customer: {
            email: params.customerEmail,
            first_name: params.customerName?.split(' ')[0],
            last_name: params.customerName?.split(' ').slice(1).join(' ') || '',
          },
          metadata: {
            ...params.metadata,
            invoice_id: params.invoiceId || '',
            quote_id: params.quoteId || '',
          },
          hosted_payment: {
            return_url: params.successUrl,
            cancel_url: params.cancelUrl,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`PayPlug payment creation failed: ${error.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        sessionId: data.id,
        checkoutUrl: data.hosted_payment?.payment_url || data.hosted_payment?.url,
        providerPaymentId: data.id,
      };
    } catch (error: any) {
      throw new Error(`PayPlug payment session creation failed: ${error.message}`);
    }
  }

  async createPaymentLink(
    params: PaymentLinkParams
  ): Promise<PaymentLinkResult> {
    if (!this.secretKey) {
      throw new Error('PayPlug adapter not initialized');
    }

    try {
      // PayPlug utilise les "payment pages" comme payment links
      // TODO: Implémenter avec PayPlug Payment Pages API
      // Documentation: https://docs.payplug.com/api-routes#tag/Payment-pages
      
      const response = await fetch(`${this.apiBaseUrl}/v1/payment_pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100),
          currency: params.currency,
          metadata: params.metadata || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`PayPlug payment link creation failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentLinkId: data.id,
        url: data.payment_url || data.url,
      };
    } catch (error: any) {
      throw new Error(`PayPlug payment link creation failed: ${error.message}`);
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!this.secretKey) {
      throw new Error('PayPlug adapter not initialized');
    }

    try {
      // TODO: Implémenter le remboursement avec PayPlug Refunds API
      // Documentation: https://docs.payplug.com/api-routes#tag/Refunds
      
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
        throw new Error(`PayPlug refund failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        refundId: data.id,
        amount: data.amount ? data.amount / 100 : params.amount || 0,
        status: this.mapPayPlugStatus(data.status),
      };
    } catch (error: any) {
      throw new Error(`PayPlug refund failed: ${error.message}`);
    }
  }

  async verifyWebhook(
    request: Request,
    secret: string
  ): Promise<WebhookEvent> {
    // TODO: Implémenter la vérification des webhooks PayPlug
    // Documentation: https://docs.payplug.com/webhooks
    
    const body = await request.text();
    const signature = request.headers.get('payplug-signature');

    if (!signature) {
      throw new Error('Missing PayPlug signature header');
    }

    // TODO: Vérifier la signature
    // PayPlug utilise une signature HMAC-SHA256
    // const isValid = verifyHmacSignature(body, signature, secret);
    // if (!isValid) {
    //   throw new Error('Invalid PayPlug webhook signature');
    // }

    const event = JSON.parse(body);

    return {
      id: event.id || event.event_id,
      type: event.type || event.event_type,
      data: event.data || event,
      provider: 'payplug',
      timestamp: new Date().toISOString(),
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.secretKey) {
      throw new Error('PayPlug adapter not initialized');
    }

    try {
      // TODO: Implémenter la récupération du statut avec PayPlug Payments API
      // Documentation: https://docs.payplug.com/api-routes#tag/Payments
      
      const response = await fetch(`${this.apiBaseUrl}/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`PayPlug payment status retrieval failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentId: data.id,
        status: this.mapPayPlugStatus(data.is_paid ? 'paid' : data.status),
        amount: data.amount ? data.amount / 100 : 0,
        currency: data.currency?.toUpperCase() || 'EUR',
        paidAt: data.paid_at ? new Date(data.paid_at * 1000).toISOString() : undefined,
        metadata: data.metadata || {},
      };
    } catch (error: any) {
      throw new Error(`PayPlug payment status retrieval failed: ${error.message}`);
    }
  }

  async createCustomer(customerData: CustomerData): Promise<CustomerResult> {
    // PayPlug gère les clients via l'email dans les paiements
    // Pas de système de clients séparé comme Stripe
    return {
      customerId: customerData.email,
      email: customerData.email,
    };
  }

  isConfigured(): boolean {
    return this.secretKey !== null && this.config !== null;
  }

  /**
   * Mapper les statuts PayPlug vers nos statuts unifiés
   */
  private mapPayPlugStatus(payPlugStatus: string): PaymentStatusResult['status'] {
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      created: 'pending',
      processing: 'processing',
      paid: 'succeeded',
      failed: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
      partially_refunded: 'partially_refunded',
    };

    return statusMap[payPlugStatus.toLowerCase()] || 'pending';
  }
}







