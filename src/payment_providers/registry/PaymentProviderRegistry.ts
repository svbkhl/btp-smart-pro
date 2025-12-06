/**
 * Payment Provider Registry
 * 
 * Factory pattern pour charger et gérer les différents payment providers
 */

import type { IPaymentProvider } from '../interfaces/IPaymentProvider';
import type { PaymentProviderType, PaymentProviderConfig } from '../types/PaymentTypes';

// Import des adapters (lazy loading pour optimiser le bundle)
// Utilisation d'imports dynamiques pour éviter les erreurs si les packages ne sont pas installés

// Types pour les adapters
type AdapterClass = new () => IPaymentProvider;

// Fonction pour charger les adapters dynamiquement
async function loadAdapter(adapterPath: string): Promise<AdapterClass | null> {
  try {
    const module = await import(adapterPath);
    const adapterKey = Object.keys(module).find(key => key.includes('Adapter'));
    if (!adapterKey) {
      return null;
    }
    return (module as any)[adapterKey] as AdapterClass;
  } catch (error) {
    console.warn(`⚠️ Adapter not available: ${adapterPath}`, error);
    return null;
  }
}

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

    // Créer une nouvelle instance du provider avec chargement dynamique
    let provider: IPaymentProvider;
    let AdapterClass: AdapterClass | null = null;

    switch (type) {
      case 'stripe':
        AdapterClass = await loadAdapter('../adapters/stripe_adapter');
        if (!AdapterClass) {
          throw new Error('Stripe adapter is not available. Please install stripe package: npm install stripe');
        }
        provider = new AdapterClass();
        break;
      case 'sumup':
        AdapterClass = await loadAdapter('../adapters/sumup_adapter');
        if (!AdapterClass) {
          throw new Error('SumUp adapter is not available');
        }
        provider = new AdapterClass();
        break;
      case 'payplug':
        AdapterClass = await loadAdapter('../adapters/payplug_adapter');
        if (!AdapterClass) {
          throw new Error('PayPlug adapter is not available');
        }
        provider = new AdapterClass();
        break;
      case 'stancer':
        AdapterClass = await loadAdapter('../adapters/stancer_adapter');
        if (!AdapterClass) {
          throw new Error('Stancer adapter is not available');
        }
        provider = new AdapterClass();
        break;
      case 'gocardless':
        AdapterClass = await loadAdapter('../adapters/gocardless_adapter');
        if (!AdapterClass) {
          throw new Error('GoCardless adapter is not available');
        }
        provider = new AdapterClass();
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




