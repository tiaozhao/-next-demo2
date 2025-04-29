import { AIProvider } from '../core/interfaces/ai-provider.interface';
import { OpenRouterAdapter } from '../adapters/providers/openrouter.adapter';
import { AIServiceError } from '../core/errors/ai-service.errors';
import { getServicesConfig } from '~/config';
import { loggerService } from '~/lib/logger';

/**
 * Factory for creating AI provider instances
 */
export class AIProviderFactory {
  /**
   * Create an AI provider instance
   * @param providerId Optional provider ID, if not specified, uses the default from config
   * @returns The created AI provider instance
   */
  static createProvider(providerId?: string): AIProvider {
    try {
      // If no provider ID is specified, get the default from config
      if (!providerId) {
        const { ai } = getServicesConfig();
        providerId = ai?.provider || 'openrouter';
      }

      const providerIdToUse = providerId || 'openrouter'; // Default fallback

      // Create the provider based on the ID
      switch (providerIdToUse.toLowerCase()) {
        case 'openrouter':
          return new OpenRouterAdapter();
        // Add more providers here as needed
        default:
          throw AIServiceError.configurationError(`Unsupported AI provider: ${providerIdToUse}`);
      }
    } catch (error) {
      loggerService.error('AIProviderFactory: Failed to create provider', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        providerId: providerId || 'unknown'
      });

      throw error instanceof AIServiceError
        ? error
        : AIServiceError.configurationError(
          `Failed to create provider: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
  }
} 