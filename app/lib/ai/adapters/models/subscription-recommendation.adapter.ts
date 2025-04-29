import { createOpenAI } from '@ai-sdk/openai';
import type { AIModel } from '../../core/interfaces/ai-model.interface';
import type { AIProvider } from '../../core/interfaces/ai-provider.interface';
import { AIServiceError } from '../../core/errors/ai-service.errors';
import { getServicesConfig } from '~/config';
import { loggerService } from '~/lib/logger';

/**
 * Adapter for subscription recommendation models
 * Implements the AIModel interface for recommendation enhancement capabilities
 */
export class SubscriptionRecommendationModelAdapter implements AIModel {
  /**
   * Model type identifier
   */
  id = 'subscription-recommendation';

  /**
   * Provider identifier
   */
  provider: string;

  /**
   * Specific model identifier
   */
  modelId: string;

  /**
   * Model capabilities
   */
  capabilities = ['text-generation', 'recommendation', 'analysis'];

  /**
   * Context window size (in tokens)
   */
  contextWindow = 16000;

  /**
   * Whether this model supports multimodal inputs
   */
  supportsMultimodal = false;

  /**
   * The AI provider instance
   */
  private providerInstance: AIProvider;

  /**
   * Constructor
   * @param aiProvider The AI provider instance
   */
  constructor(aiProvider: AIProvider) {
    this.providerInstance = aiProvider;
    this.provider = aiProvider.id;

    // Get model configuration from config system
    const { ai } = getServicesConfig();

    // Use configured model or get from provider's default
    const configuredModel = ai.modes?.subscriptionRecommendation?.model || null;
    this.modelId = configuredModel || aiProvider.getDefaultModel();

    loggerService.info('SubscriptionRecommendationModelAdapter: Initialized', {
      provider: this.provider,
      modelId: this.modelId,
      capabilities: this.capabilities
    });
  }

  /**
   * Create a model instance for processing
   * @param options Optional configuration options
   * @returns Model instance configured for the provider
   */
  async createInstance(options?: any): Promise<any> {
    try {
      // Get model configuration from config system
      const { ai } = getServicesConfig();
      const modeConfig = ai.modes?.subscriptionRecommendation || {};

      // Create model instance using Vercel AI SDK
      const llmModel = createOpenAI({
        baseURL: this.providerInstance.getBaseUrl(),
        compatibility: 'strict',
        apiKey: options?.apiKey || process.env.API_KEY,
      })(this.modelId);

      loggerService.info('SubscriptionRecommendationModelAdapter: Created model instance', {
        modelId: this.modelId,
        provider: this.provider,
        temperature: modeConfig.temperature || 0.2
      });

      return llmModel;
    } catch (error) {
      loggerService.error('SubscriptionRecommendationModelAdapter: Failed to create model instance', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        modelId: this.modelId,
        provider: this.provider
      });

      throw AIServiceError.modelError(
        `Failed to create model instance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
} 