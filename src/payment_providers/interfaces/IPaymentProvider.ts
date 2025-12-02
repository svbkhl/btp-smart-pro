/**
 * Interface de base pour tous les payment providers
 * 
 * Tous les adapters doivent implémenter cette interface
 */

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

export interface IPaymentProvider {
  /**
   * Nom du provider (pour logging et debugging)
   */
  readonly name: string;

  /**
   * Type du provider
   */
  readonly type: string;

  /**
   * Initialiser le provider avec sa configuration
   */
  initialize(config: PaymentProviderConfig): Promise<void>;

  /**
   * Créer une session de paiement (pour checkout)
   * Utilisé pour les paiements directs depuis l'application
   */
  createPaymentSession(
    params: PaymentSessionParams
  ): Promise<PaymentSessionResult>;

  /**
   * Créer un lien de paiement (payment link)
   * Utilisé pour envoyer un lien par email
   */
  createPaymentLink(
    params: PaymentLinkParams
  ): Promise<PaymentLinkResult>;

  /**
   * Rembourser un paiement
   * @param paymentId ID du paiement côté provider
   * @param amount Montant à rembourser (optionnel, rembourse tout si non spécifié)
   */
  refund(params: RefundParams): Promise<RefundResult>;

  /**
   * Vérifier et parser un webhook
   * @param request Request HTTP du webhook
   * @param secret Secret pour vérifier la signature
   */
  verifyWebhook(
    request: Request,
    secret: string
  ): Promise<WebhookEvent>;

  /**
   * Récupérer le statut d'un paiement
   * @param paymentId ID du paiement côté provider
   */
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;

  /**
   * Créer un client dans le système du provider
   * Utile pour les paiements récurrents ou la gestion des clients
   */
  createCustomer(customerData: CustomerData): Promise<CustomerResult>;

  /**
   * Vérifier si le provider est correctement configuré
   */
  isConfigured(): boolean;
}

