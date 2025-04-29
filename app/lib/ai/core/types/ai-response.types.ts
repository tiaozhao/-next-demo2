/**
 * AI Response format
 */
export interface AIResponse<T = any> {
  /**
   * The raw text response from the AI model
   */
  text: string;

  /**
   * The parsed response content (if applicable)
   */
  content?: T;

  /**
   * Model identifier that generated the response
   */
  model: string;

  /**
   * Provider identifier that processed the request
   */
  provider: string;

  /**
   * Usage statistics for the request
   */
  usage?: {
    /**
     * Number of prompt tokens
     */
    promptTokens: number;

    /**
     * Number of completion tokens
     */
    completionTokens: number;

    /**
     * Total tokens used
     */
    totalTokens: number;
  };
}

/**
 * Error response from AI request
 */
export interface AIErrorResponse {
  /**
   * Error code
   */
  code: string;

  /**
   * Error message
   */
  message: string;

  /**
   * HTTP status code if applicable
   */
  status?: number;

  /**
   * Provider-specific error details
   */
  details?: any;
} 