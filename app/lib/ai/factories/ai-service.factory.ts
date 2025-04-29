import { AIService } from '../core/interfaces/ai-service.interface';
import { ImageRecognitionService } from '../services/image/image-recognition.service';
import { SubscriptionRecommendationService } from '../services/recommendation/subscription-recommendation.service';
import { PurchaseOrder } from '../core/types/purchase-order/purchase-order.types';
import { AIProviderFactory } from './ai-provider.factory';
import { AIModelFactory } from './ai-model.factory';
import { AIServiceError } from '../core/errors/ai-service.errors';
import { loggerService } from '~/lib/logger';

/**
 * Factory for creating AI service instances
 */
export class AIServiceFactory {
  /**
   * Create an image recognition service for processing images and extracting structured data
   * @param providerId Optional provider ID to use
   * @returns The created image recognition service
   */
  static createImageRecognitionService(providerId?: string): AIService<Buffer | Buffer[], PurchaseOrder> {
    try {
      // Create provider and model
      const provider = AIProviderFactory.createProvider(providerId);
      const model = AIModelFactory.createModel('image-processing', provider);

      // Create and return the service
      return new ImageRecognitionService(model, provider);
    } catch (error) {
      loggerService.error('AIServiceFactory: Failed to create image recognition service', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        providerId: providerId || 'default'
      });

      throw error instanceof AIServiceError
        ? error
        : AIServiceError.configurationError(
          `Failed to create image recognition service: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
  }

  /**
   * Create a subscription recommendation service
   * @param providerId Optional provider ID to use
   * @returns The created subscription recommendation service
   */
  static createSubscriptionRecommendationService(providerId?: string): SubscriptionRecommendationService {
    try {
      // Create provider and model
      const provider = AIProviderFactory.createProvider(providerId);
      const model = AIModelFactory.createModel('subscription-recommendation', provider);

      // Create and return the service
      return new SubscriptionRecommendationService(model, provider);
    } catch (error) {
      loggerService.error('AIServiceFactory: Failed to create subscription recommendation service', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        providerId: providerId || 'default'
      });

      throw error instanceof AIServiceError
        ? error
        : AIServiceError.configurationError(
          `Failed to create subscription recommendation service: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
  }

  // Additional factory methods for other service types can be added here
} 