import { AIModel } from './ai-model.interface';
import { AIProvider } from './ai-provider.interface';

/**
 * AI Service Interface
 * Defines the basic contract for AI services
 * 
 * TInput - The input type that this service accepts
 * TOutput - The output type that this service produces
 */
export interface AIService<TInput, TOutput> {
  /**
   * Process the input and generate an output
   * @param input The input data to process
   * @returns The processed output
   */
  process(input: TInput): Promise<TOutput>;

  /**
   * Get the model used by this service
   * @returns The AI model
   */
  getModel(): AIModel;

  /**
   * Get the provider used by this service
   * @returns The AI provider
   */
  getProvider(): AIProvider;
} 