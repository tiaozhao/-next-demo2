import type { AIProvider } from '../../core/interfaces/ai-provider.interface';
import { AIServiceError } from '../../core/errors/ai-service.errors';
import { getServicesConfig, getEnvConfig } from '~/config';
import { loggerService } from '~/lib/logger';

/**
 * OpenRouter API provider adapter
 * Implements the AIProvider interface for OpenRouter API
 */
export class OpenRouterAdapter implements AIProvider {
  /**
   * Provider unique identifier
   */
  id = 'openrouter';

  /**
   * Provider display name
   */
  name = 'OpenRouter';

  /**
   * API key for authentication
   */
  private apiKey: string;

  /**
   * Base URL for API requests
   */
  private baseUrl: string;

  /**
   * Default model ID
   */
  private model: string;

  /**
   * Maximum usage percentage threshold
   */
  private maxUsagePercentage: number;

  /**
   * Constructor
   */
  constructor() {
    // Load configuration from config system
    const { ai } = getServicesConfig();
    const env = getEnvConfig();

    loggerService.info('OpenRouterAdapter: Configuration', {
      apiKeyExists: !!env.aiKey
    });

    this.apiKey = env.aiKey || process.env.API_KEY || '';

    this.baseUrl = ai.baseUrl;
    this.model = ai.model;
    this.maxUsagePercentage = ai.maxUsagePercentage;

    if (!this.apiKey) {
      throw AIServiceError.configurationError('API_KEY environment variable is required');
    }

    loggerService.info('OpenRouterAdapter: Initialized', {
      baseUrl: this.baseUrl,
      model: this.model,
      maxUsagePercentage: this.maxUsagePercentage
    });
  }

  /**
   * Get base URL for API requests
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get default model ID
   */
  getDefaultModel(): string {
    return this.model;
  }

  /**
   * Authenticate with the API
   * @returns Whether authentication was successful
   */
  async authenticate(): Promise<boolean> {
    try {
      const { isWithinLimits } = await this.checkLimits();
      return isWithinLimits;
    } catch (error) {
      loggerService.error('OpenRouterAdapter: Authentication failed', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check API usage limits
   * @returns Usage limit information
   */
  async checkLimits(): Promise<{
    isWithinLimits: boolean;
    usagePercentage: number;
    limitRemaining: number | null;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw AIServiceError.requestError(`Failed to fetch limits: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      loggerService.info('OpenRouterAdapter: Limit response', {
        ...data.data
      });

      // If there's no limit set, we assume it's unlimited
      if (data.data.limit === null) {
        return {
          isWithinLimits: true,
          usagePercentage: 0,
          limitRemaining: null
        };
      }

      // Check if usage exceeds threshold
      const isWithinLimits = data.data.usage < this.maxUsagePercentage;

      if (!isWithinLimits) {
        loggerService.warn('OpenRouterAdapter: Usage exceeded threshold', {
          usage: data.data.usage,
          threshold: this.maxUsagePercentage
        });
      }

      return {
        isWithinLimits,
        usagePercentage: data.data.usage,
        limitRemaining: data.data.limit_remaining
      };
    } catch (error) {
      loggerService.error('OpenRouterAdapter: Error checking limits', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });

      throw error instanceof AIServiceError
        ? error
        : AIServiceError.requestError(
          error instanceof Error
            ? error.message
            : 'Unknown error checking OpenRouter limits'
        );
    }
  }
} 