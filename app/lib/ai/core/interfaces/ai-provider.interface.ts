/**
 * AI Provider Interface
 * Defines the basic contract for interacting with AI service providers
 */
export interface AIProvider {
  /**
   * Unique identifier for the provider
   */
  id: string;

  /**
   * Display name for the provider
   */
  name: string;

  /**
   * Get the base URL for API requests
   */
  getBaseUrl(): string;

  /**
   * Get the default model ID for this provider
   */
  getDefaultModel(): string;

  /**
   * Authenticate credentials and test connection
   * @returns Whether the credentials are valid
   */
  authenticate(): Promise<boolean>;

  /**
   * Check API usage limits
   * @returns Usage limit information
   */
  checkLimits(): Promise<{
    isWithinLimits: boolean;
    usagePercentage: number;
    limitRemaining: number | null;
  }>;
} 