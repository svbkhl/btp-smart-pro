/**
 * Payment Provider Registry
 * 
 * Factory pattern pour charger et gérer les différents payment providers
 */

import type { IPaymentProvider } from '../interfaces/IPaymentProvider';
import type { PaymentProviderType, PaymentProviderConfig } from '../types/PaymentTypes';

// Import des adapters (lazy loading pour optimiser le bundle)
import { StripeAdapter } from '../adapters/stripe_adapter';
import { SumUpAdapter } from '../adapters/sumup_adapter';
import { PayPlugAdapter } from '../adapters/payplug_adapter';
import { StancerAdapter } from '../adapters/stancer_adapter';
import { GoCardlessAdapter } from '../adapters/gocardless_adapter';

export class PaymentProviderRegistry {
  private static instance: PaymentProviderRegistry;
  private providers: Map<PaymentProviderType, IPaymentProvider> = new Map();
  private initializedProviders: Set<PaymentProviderType> = new Set();

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): PaymentProviderRegistry {
    if (!PaymentProviderRegistry.instance) {
      PaymentProviderRegistry.instance = new PaymentProviderRegistry();
    }
    return PaymentProviderRegistry.instance;
  }

  /**
   * Enregistrer un provider
   */
  public registerProvider(
    type: PaymentProviderType,
    provider: IPaymentProvider
  ): void {
    this.providers.set(type, provider);
  }

  /**
   * Obtenir un provider par son type
   */
  public getProvider(type: PaymentProviderType): IPaymentProvider | null {
    return this.providers.get(type) || null;
  }

  /**
   * Créer et initialiser un provider avec sa configuration
   */
  public async createProvider(
    type: PaymentProviderType,
    config: PaymentProviderConfig
  ): Promise<IPaymentProvider> {
    // Vérifier si le provider est déjà initialisé avec cette config
    const cacheKey = `${type}_${config.companyId || config.userId}`;
    if (this.initializedProviders.has(type as any)) {
      const existing = this.getProvider(type);
      if (existing && existing.isConfigured()) {
        return existing;
      }
    }

    // Créer une nouvelle instance du provider
    let provider: IPaymentProvider;

    switch (type) {
      case 'stripe':
        provider = new StripeAdapter();
        break;
      case 'sumup':
        provider = new SumUpAdapter();
        break;
      case 'payplug':
        provider = new PayPlugAdapter();
        break;
      case 'stancer':
        provider = new StancerAdapter();
        break;
      case 'gocardless':
        provider = new GoCardlessAdapter();
        break;
      default:
        throw new Error(`Unsupported payment provider: ${type}`);
    }

    // Initialiser avec la configuration
    await provider.initialize(config);

    // Enregistrer dans le cache
    this.registerProvider(type, provider);
    this.initializedProviders.add(type as any);

    return provider;
  }

  /**
   * Lister tous les providers disponibles
   */
  public getAvailableProviders(): PaymentProviderType[] {
    return ['stripe', 'sumup', 'payplug', 'stancer', 'gocardless'];
  }

  /**
   * Vérifier si un provider est disponible
   */
  public isProviderAvailable(type: PaymentProviderType): boolean {
    return this.getAvailableProviders().includes(type);
  }

  /**
   * Réinitialiser un provider (utile pour les tests ou le changement de config)
   */
  public resetProvider(type: PaymentProviderType): void {
    this.providers.delete(type);
    this.initializedProviders.delete(type as any);
  }

  /**
   * Réinitialiser tous les providers
   */
  public resetAll(): void {
    this.providers.clear();
    this.initializedProviders.clear();
  }
}

// Export singleton instance
export const paymentProviderRegistry = PaymentProviderRegistry.getInstance();

