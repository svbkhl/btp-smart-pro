/**
 * SumUp Payment Adapter
 * 
 * Documentation: https://developer.sumup.com/
 * 
 * SumUp est spécialisé dans les paiements pour les commerces physiques et en ligne
 * Particulièrement adapté pour le secteur BTP (paiements sur chantier)
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

export class SumUpAdapter implements IPaymentProvider {
  public readonly name = 'SumUp';
  public readonly type = 'sumup';
  
  private apiKey: string | null = null;
  private accessToken: string | null = null;
  private config: PaymentProviderConfig | null = null;
  private apiBaseUrl = 'https://api.sumup.com/v0.1';

  async initialize(config: PaymentProviderConfig): Promise<void> {
    this.config = config;
    
    // SumUp utilise OAuth2 pour l'authentification
    // Les credentials doivent contenir: clientId, clientSecret, accessToken (optionnel)
    const clientId = config.credentials.clientId;
    const clientSecret = config.credentials.clientSecret;
    this.accessToken = config.credentials.accessToken;

    if (!clientId || !clientSecret) {
      throw new Error('SumUp clientId and clientSecret are required');
    }

    // Si pas de token, obtenir un nouveau token OAuth2
    if (!this.accessToken) {
      // TODO: Implémenter le flow OAuth2 pour obtenir un access token
      // Voir: https://developer.sumup.com/docs/authentication
      throw new Error('SumUp access token is required. Please implement OAuth2 flow.');
    }

    this.apiKey = clientId;
  }

  async createPaymentSession(
    params: PaymentSessionParams
  ): Promise<PaymentSessionResult> {
    if (!this.accessToken) {
      throw new Error('SumUp adapter not initialized');
    }

    try {
      // TODO: Implémenter la création de checkout avec SumUp Checkout API
      // Documentation: https://developer.sumup.com/docs/api/checkouts
      
      const response = await fetch(`${this.apiBaseUrl}/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkout_reference: `invoice_${params.invoiceId || Date.now()}`,
          amount: params.amount,
          currency: params.currency,
          description: params.description || 'Paiement',
          return_url: params.successUrl,
          redirect_url: params.cancelUrl,
          merchant_code: this.config?.credentials.merchantCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`SumUp checkout creation failed: ${error.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        sessionId: data.id,
        checkoutUrl: data.redirect_uri || data.checkout_url,
        providerPaymentId: data.id,
      };
    } catch (error: any) {
      throw new Error(`SumUp payment session creation failed: ${error.message}`);
    }
  }

  async createPaymentLink(
    params: PaymentLinkParams
  ): Promise<PaymentLinkResult> {
    if (!this.accessToken) {
      throw new Error('SumUp adapter not initialized');
    }

    try {
      // TODO: Implémenter la création de payment link avec SumUp
      // SumUp utilise les "checkouts" comme payment links
      
      const response = await fetch(`${this.apiBaseUrl}/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency,
          description: params.description || 'Paiement',
        }),
      });

      if (!response.ok) {
        throw new Error(`SumUp payment link creation failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentLinkId: data.id,
        url: data.redirect_uri || data.checkout_url,
      };
    } catch (error: any) {
      throw new Error(`SumUp payment link creation failed: ${error.message}`);
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!this.accessToken) {
      throw new Error('SumUp adapter not initialized');
    }

    try {
      // TODO: Implémenter le remboursement avec SumUp Refunds API
      // Documentation: https://developer.sumup.com/docs/api/refunds
      
      const refundData: any = {
        amount: params.amount ? Math.round(params.amount * 100) : undefined,
      };

      const response = await fetch(`${this.apiBaseUrl}/me/refunds/${params.paymentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        throw new Error(`SumUp refund failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        refundId: data.id,
        amount: data.amount ? data.amount / 100 : params.amount || 0,
        status: data.status === 'SUCCESSFUL' ? 'refunded' : 'failed',
      };
    } catch (error: any) {
      throw new Error(`SumUp refund failed: ${error.message}`);
    }
  }

  async verifyWebhook(
    request: Request,
    secret: string
  ): Promise<WebhookEvent> {
    // TODO: Implémenter la vérification des webhooks SumUp
    // Documentation: https://developer.sumup.com/docs/webhooks
    
    const body = await request.text();
    const signature = request.headers.get('x-sumup-signature');

    if (!signature) {
      throw new Error('Missing SumUp signature header');
    }

    // TODO: Vérifier la signature HMAC
    // const isValid = verifyHmacSignature(body, signature, secret);
    // if (!isValid) {
    //   throw new Error('Invalid SumUp webhook signature');
    // }

    const event = JSON.parse(body);

    return {
      id: event.id || event.event_id,
      type: event.type || event.event_type,
      data: event.data || event,
      provider: 'sumup',
      timestamp: new Date().toISOString(),
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.accessToken) {
      throw new Error('SumUp adapter not initialized');
    }

    try {
      // TODO: Implémenter la récupération du statut avec SumUp Transactions API
      // Documentation: https://developer.sumup.com/docs/api/transactions
      
      const response = await fetch(`${this.apiBaseUrl}/me/transactions/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`SumUp payment status retrieval failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentId: data.id,
        status: this.mapSumUpStatus(data.status),
        amount: data.amount ? data.amount / 100 : 0,
        currency: data.currency?.toUpperCase() || 'EUR',
        paidAt: data.timestamp ? new Date(data.timestamp).toISOString() : undefined,
        metadata: {
          transaction_code: data.transaction_code,
          merchant_code: data.merchant_code,
        },
      };
    } catch (error: any) {
      throw new Error(`SumUp payment status retrieval failed: ${error.message}`);
    }
  }

  async createCustomer(customerData: CustomerData): Promise<CustomerResult> {
    // SumUp ne gère pas les clients de la même manière que Stripe
    // On retourne simplement l'email comme identifiant
    return {
      customerId: customerData.email,
      email: customerData.email,
    };
  }

  isConfigured(): boolean {
    return this.accessToken !== null && this.config !== null;
  }

  /**
   * Mapper les statuts SumUp vers nos statuts unifiés
   */
  private mapSumUpStatus(sumUpStatus: string): PaymentStatusResult['status'] {
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      PENDING: 'pending',
      PROCESSING: 'processing',
      SUCCESSFUL: 'succeeded',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
      REFUNDED: 'refunded',
    };

    return statusMap[sumUpStatus.toUpperCase()] || 'pending';
  }
}

