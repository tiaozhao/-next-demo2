import { AIModel } from '../core/interfaces/ai-model.interface';
import { AIProvider } from '../core/interfaces/ai-provider.interface';
import { ImageProcessingModelAdapter } from '../adapters/models/image-processing.adapter';
import { SubscriptionRecommendationModelAdapter } from '../adapters/models/subscription-recommendation.adapter';
import { AIServiceError } from '../core/errors/ai-service.errors';
import { loggerService } from '~/lib/logger';

/**
 * Factory for creating AI model instances
 */
export class AIModelFactory {
  /**
   * Create an AI model instance
   * @param modelType The type of model to create
   * @param provider The AI provider to use
   * @returns The created AI model instance
   */
  static createModel(modelType: string, provider: AIProvider): AIModel {
    try {
      // Create the model based on the type
      switch (modelType.toLowerCase()) {
        case 'image-processing':
          return new ImageProcessingModelAdapter(provider);
        case 'subscription-recommendation':
          return new SubscriptionRecommendationModelAdapter(provider);
        // Add more model types here as needed
        default:
          throw AIServiceError.configurationError(`Unsupported AI model type: ${modelType}`);
      }
    } catch (error) {
      loggerService.error('AIModelFactory: Failed to create model', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        modelType,
        provider: provider.id
      });

      throw error instanceof AIServiceError
        ? error
        : AIServiceError.configurationError(
          `Failed to create model: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
  }
} 