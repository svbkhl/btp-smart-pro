/**
 * Stripe Payment Adapter
 * 
 * Refactorisation de l'intégration Stripe existante en adapter pattern
 * Maintient la compatibilité avec le code existant
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

// Stripe SDK (à installer: npm install stripe)
// @ts-ignore - Stripe sera installé
import Stripe from 'stripe';

export class StripeAdapter implements IPaymentProvider {
  public readonly name = 'Stripe';
  public readonly type = 'stripe';
  
  private stripe: Stripe | null = null;
  private config: PaymentProviderConfig | null = null;

  async initialize(config: PaymentProviderConfig): Promise<void> {
    this.config = config;
    
    const secretKey = config.credentials.secretKey || config.credentials.apiKey;
    if (!secretKey) {
      throw new Error('Stripe secret key is required');
    }

    // @ts-ignore
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  async createPaymentSession(
    params: PaymentSessionParams
  ): Promise<PaymentSessionResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: params.description || 'Paiement',
              },
              unit_amount: Math.round(params.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          ...params.metadata,
          invoice_id: params.invoiceId || '',
          quote_id: params.quoteId || '',
        },
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url || '',
        providerPaymentId: session.payment_intent as string | undefined,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment session creation failed: ${error.message}`);
    }
  }

  async createPaymentLink(
    params: PaymentLinkParams
  ): Promise<PaymentLinkResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: params.description || 'Paiement',
              },
              unit_amount: Math.round(params.amount * 100),
            },
            quantity: 1,
          },
        ],
        metadata: params.metadata || {},
      });

      return {
        paymentLinkId: paymentLink.id,
        url: paymentLink.url,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment link creation failed: ${error.message}`);
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.paymentId,
      };

      if (params.amount) {
        refundParams.amount = Math.round(params.amount * 100);
      }

      if (params.reason) {
        refundParams.reason = params.reason as Stripe.RefundCreateParams.Reason;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        refundId: refund.id,
        amount: refund.amount / 100, // Convert from cents
        status: this.mapStripeStatus(refund.status),
      };
    } catch (error: any) {
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
  }

  async verifyWebhook(
    request: Request,
    secret: string
  ): Promise<WebhookEvent> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const body = await request.text();
      const signature = request.headers.get('stripe-signature');

      if (!signature) {
        throw new Error('Missing Stripe signature header');
      }

      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        secret
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        provider: 'stripe',
        timestamp: new Date(event.created * 1000).toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Stripe webhook verification failed: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      return {
        paymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase() as any,
        paidAt: paymentIntent.created
          ? new Date(paymentIntent.created * 1000).toISOString()
          : undefined,
        metadata: paymentIntent.metadata,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment status retrieval failed: ${error.message}`);
    }
  }

  async createCustomer(customerData: CustomerData): Promise<CustomerResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address
          ? {
              line1: customerData.address.line1,
              line2: customerData.address.line2,
              city: customerData.address.city,
              postal_code: customerData.address.postalCode,
              country: customerData.address.country,
            }
          : undefined,
        metadata: customerData.metadata,
      });

      return {
        customerId: customer.id,
        email: customer.email || customerData.email,
      };
    } catch (error: any) {
      throw new Error(`Stripe customer creation failed: ${error.message}`);
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null && this.config !== null;
  }

  /**
   * Mapper les statuts Stripe vers nos statuts unifiés
   */
  private mapStripeStatus(
    stripeStatus: string
  ): PaymentStatusResult['status'] {
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'processing',
      requires_action: 'processing',
      processing: 'processing',
      requires_capture: 'processing',
      canceled: 'cancelled',
      succeeded: 'succeeded',
      pending: 'pending',
      refunded: 'refunded',
      partially_refunded: 'partially_refunded',
      failed: 'failed',
    };

    return statusMap[stripeStatus] || 'pending';
  }
}

