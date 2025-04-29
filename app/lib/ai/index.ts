/**
 * AI Module
 * 
 * This module provides a unified interface for AI-powered functionality
 * including image recognition, text analysis, and recommendation services.
 * 
 * The architecture follows a modular design with providers, models, and services
 * that can be easily extended and configured.
 */

// Export core interfaces
export * from './core/interfaces/ai-provider.interface';
export * from './core/interfaces/ai-model.interface';
export * from './core/interfaces/ai-service.interface';

// Export types
export * from './core/types/ai-request.types';
export * from './core/types/ai-response.types';
export * from './core/types/purchase-order/purchase-order.types';
export * from './core/types/purchase-order/purchase-order.schema';
export * from './core/types/subscription-recommendation/recommendation.types';

// Export errors
export * from './core/errors/ai-service.errors';

// Export utils
export * from './core/utils/response-parser';

// Export factories for creating AI components
export * from './factories/ai-provider.factory';
export * from './factories/ai-model.factory';
export * from './factories/ai-service.factory';

// Export service implementations
export * from './services/image/image-recognition.service';
export * from './services/recommendation/subscription-recommendation.service';

// Convenience functions
import { AIServiceFactory } from './factories/ai-service.factory';
import type { PurchaseOrder } from './core/types/purchase-order/purchase-order.types';
import type {
  LLMInputProduct,
  FinalRecommendation
} from './core/types/subscription-recommendation/recommendation.types';
import { SubscriptionRecommendationService } from './services/recommendation/subscription-recommendation.service';

/**
 * Create an image recognition service for extracting structured data from images
 * @param providerId Optional provider ID
 * @returns Image recognition service instance
 */
export const createImageRecognitionService = (providerId?: string) => {
  return AIServiceFactory.createImageRecognitionService(providerId);
};

/**
 * Process image data and extract purchase order information
 * @param imageData Single image buffer or array of image buffers
 * @returns Extracted purchase order data
 */
export const extractPurchaseOrderFromImage = async (
  imageData: Buffer | Buffer[]
): Promise<PurchaseOrder> => {
  const service = createImageRecognitionService();
  return await service.process(imageData);
};

/**
 * Create a subscription recommendation service
 * @param providerId Optional provider ID
 * @returns Subscription recommendation service instance
 */
export const createSubscriptionRecommendationService = (providerId?: string) => {
  return AIServiceFactory.createSubscriptionRecommendationService(providerId);
};

/**
 * Generate product recommendations
 * 
 * @param products List of products to evaluate
 * @returns List of product recommendations with scores on a 0-10 scale
 */
export const generateProductRecommendations = async (
  products: LLMInputProduct[]
): Promise<FinalRecommendation[]> => {
  const service = createSubscriptionRecommendationService();
  return await service.generateRecommendations(products);
}; 