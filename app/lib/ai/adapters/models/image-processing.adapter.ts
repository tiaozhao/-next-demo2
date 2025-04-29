import { createOpenAI } from '@ai-sdk/openai';
import type { AIModel } from '../../core/interfaces/ai-model.interface';
import type { AIProvider } from '../../core/interfaces/ai-provider.interface';
import { AIServiceError } from '../../core/errors/ai-service.errors';
import { getServicesConfig } from '~/config';
import { loggerService } from '~/lib/logger';

/**
 * Adapter for image processing models
 * Implements the AIModel interface for image processing capabilities
 */
export class ImageProcessingModelAdapter implements AIModel {
  /**
   * Model type identifier
   */
  id = 'image-processing';

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
  capabilities = ['image-recognition', 'text-extraction', 'document-analysis'];

  /**
   * Context window size (in tokens)
   */
  contextWindow = 32000;

  /**
   * Whether this model supports multimodal inputs
   */
  supportsMultimodal = true;

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
    const configuredModel = ai.modes?.imageProcessing?.model || null;
    this.modelId = configuredModel || aiProvider.getDefaultModel();

    loggerService.info('ImageProcessingModelAdapter: Initialized', {
      provider: this.provider,
      modelId: this.modelId,
      supportsMultimodal: this.supportsMultimodal
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
      const modeConfig = ai.modes?.imageProcessing || {};

      // Create model instance using Vercel AI SDK
      const llmModel = createOpenAI({
        baseURL: this.providerInstance.getBaseUrl(),
        compatibility: 'strict',
        apiKey: options?.apiKey || process.env.API_KEY,
      })(this.modelId);

      loggerService.info('ImageProcessingModelAdapter: Created model instance', {
        modelId: this.modelId,
        provider: this.provider,
        temperature: modeConfig.temperature || 0
      });

      return llmModel;
    } catch (error) {
      loggerService.error('ImageProcessingModelAdapter: Failed to create model instance', {
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