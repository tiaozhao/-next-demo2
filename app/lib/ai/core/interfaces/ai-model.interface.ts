/**
 * AI Model Interface
 * Defines the basic contract for AI models
 */
export interface AIModel {
  /**
   * Unique identifier for the model type
   */
  id: string;

  /**
   * Provider identifier this model is associated with
   */
  provider: string;

  /**
   * Specific model identifier within the provider
   */
  modelId: string;

  /**
   * List of model capabilities
   */
  capabilities: string[];

  /**
   * Context window size (in tokens)
   */
  contextWindow: number;

  /**
   * Whether this model supports multimodal inputs (images, audio, etc.)
   */
  supportsMultimodal: boolean;

  /**
   * Create a model instance for processing
   * @param options Optional configuration options
   * @returns The model instance
   */
  createInstance(options?: any): Promise<any>;
} 