/**
 * Types partagés pour tous les payment providers
 */

export type PaymentProviderType = 
  | 'stripe' 
  | 'sumup' 
  | 'payplug' 
  | 'stancer' 
  | 'gocardless';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'succeeded' 
  | 'failed' 
  | 'cancelled' 
  | 'refunded' 
  | 'partially_refunded';

export type Currency = 'EUR' | 'USD' | 'GBP';

export interface PaymentSessionParams {
  amount: number;
  currency: Currency;
  customerEmail: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  invoiceId?: string;
  quoteId?: string;
}

export interface PaymentSessionResult {
  sessionId: string;
  checkoutUrl: string;
  providerPaymentId?: string;
}

export interface PaymentLinkParams {
  amount: number;
  currency: Currency;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentLinkResult {
  paymentLinkId: string;
  url: string;
}

export interface RefundParams {
  paymentId: string;
  amount?: number; // Si non spécifié, rembourse le montant total
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: PaymentStatus;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  provider: PaymentProviderType;
  timestamp: string;
}

export interface PaymentStatusResult {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  paidAt?: string;
  metadata?: Record<string, any>;
}

export interface CustomerData {
  email: string;
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  metadata?: Record<string, string>;
}

export interface CustomerResult {
  customerId: string;
  email: string;
}

export interface PaymentProviderConfig {
  providerType: PaymentProviderType;
  credentials: Record<string, any>;
  isActive: boolean;
  companyId?: string;
  userId?: string;
}

