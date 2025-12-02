/**
 * Payment Service - Service unifié pour tous les payment providers
 * 
 * Ce service abstrait les détails des différents providers et fournit
 * une interface unifiée pour créer des paiements, gérer les remboursements, etc.
 */

import { paymentProviderRegistry } from '../payment_providers/registry/PaymentProviderRegistry';
import type {
  PaymentProviderType,
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
} from '../payment_providers/types/PaymentTypes';
import { supabase } from '@/integrations/supabase/client';

export class PaymentService {
  /**
   * Récupérer le provider configuré pour une entreprise/utilisateur
   */
  private async getProviderConfig(
    userId?: string,
    companyId?: string
  ): Promise<{ provider: PaymentProviderType; config: PaymentProviderConfig }> {
    // Récupérer les paramètres de paiement depuis la base de données
    // Priorité: company settings > user settings > default (stripe)
    
    let providerType: PaymentProviderType = 'stripe'; // Par défaut
    let credentials: Record<string, any> = {};

    try {
      // Essayer de récupérer depuis user_settings
      if (userId) {
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('payment_provider, payment_provider_credentials')
          .eq('user_id', userId)
          .single();

        if (userSettings?.payment_provider) {
          providerType = userSettings.payment_provider as PaymentProviderType;
        }

        // TODO: Déchiffrer les credentials si nécessaire
        if (userSettings?.payment_provider_credentials) {
          credentials = userSettings.payment_provider_credentials;
        }
      }

      // Essayer de récupérer depuis payment_provider_credentials si la table existe
      if (companyId || userId) {
        const { data: providerCreds } = await supabase
          .from('payment_provider_credentials')
          .select('provider_type, credentials, is_active')
          .eq(companyId ? 'company_id' : 'user_id', companyId || userId)
          .eq('is_active', true)
          .single();

        if (providerCreds) {
          providerType = providerCreds.provider_type as PaymentProviderType;
          credentials = providerCreds.credentials || {};
        }
      }

      // Si pas de credentials, utiliser les variables d'environnement (pour Stripe par défaut)
      if (providerType === 'stripe' && Object.keys(credentials).length === 0) {
        // Fallback vers les variables d'environnement pour Stripe
        credentials = {
          secretKey: Deno.env.get('STRIPE_SECRET_KEY') || '',
        };
      }
    } catch (error) {
      console.warn('Error fetching payment provider config, using default:', error);
      // Utiliser Stripe par défaut avec les variables d'environnement
      credentials = {
        secretKey: Deno.env.get('STRIPE_SECRET_KEY') || '',
      };
    }

    const config: PaymentProviderConfig = {
      providerType,
      credentials,
      isActive: true,
      companyId,
      userId,
    };

    return { provider: providerType, config };
  }

  /**
   * Créer une session de paiement
   */
  async createPaymentSession(
    params: PaymentSessionParams,
    userId?: string,
    companyId?: string
  ): Promise<PaymentSessionResult> {
    const { provider, config } = await this.getProviderConfig(userId, companyId);
    
    const paymentProvider = await paymentProviderRegistry.createProvider(
      provider,
      config
    );

    return await paymentProvider.createPaymentSession(params);
  }

  /**
   * Créer un lien de paiement
   */
  async createPaymentLink(
    params: PaymentLinkParams,
    userId?: string,
    companyId?: string
  ): Promise<PaymentLinkResult> {
    const { provider, config } = await this.getProviderConfig(userId, companyId);
    
    const paymentProvider = await paymentProviderRegistry.createProvider(
      provider,
      config
    );

    return await paymentProvider.createPaymentLink(params);
  }

  /**
   * Rembourser un paiement
   */
  async refund(
    params: RefundParams,
    providerType: PaymentProviderType,
    userId?: string,
    companyId?: string
  ): Promise<RefundResult> {
    const { config } = await this.getProviderConfig(userId, companyId);
    
    const paymentProvider = await paymentProviderRegistry.createProvider(
      providerType,
      config
    );

    return await paymentProvider.refund(params);
  }

  /**
   * Vérifier un webhook
   */
  async verifyWebhook(
    request: Request,
    providerType: PaymentProviderType,
    secret: string
  ): Promise<WebhookEvent> {
    const config: PaymentProviderConfig = {
      providerType,
      credentials: {},
      isActive: true,
    };

    const paymentProvider = await paymentProviderRegistry.createProvider(
      providerType,
      config
    );

    return await paymentProvider.verifyWebhook(request, secret);
  }

  /**
   * Récupérer le statut d'un paiement
   */
  async getPaymentStatus(
    paymentId: string,
    providerType: PaymentProviderType,
    userId?: string,
    companyId?: string
  ): Promise<PaymentStatusResult> {
    const { config } = await this.getProviderConfig(userId, companyId);
    
    const paymentProvider = await paymentProviderRegistry.createProvider(
      providerType,
      config
    );

    return await paymentProvider.getPaymentStatus(paymentId);
  }

  /**
   * Créer un client
   */
  async createCustomer(
    customerData: CustomerData,
    userId?: string,
    companyId?: string
  ): Promise<CustomerResult> {
    const { provider, config } = await this.getProviderConfig(userId, companyId);
    
    const paymentProvider = await paymentProviderRegistry.createProvider(
      provider,
      config
    );

    return await paymentProvider.createCustomer(customerData);
  }

  /**
   * Lister les providers disponibles
   */
  getAvailableProviders(): PaymentProviderType[] {
    return paymentProviderRegistry.getAvailableProviders();
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

