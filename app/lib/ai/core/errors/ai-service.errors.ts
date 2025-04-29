/**
 * Base class for AI service related errors
 */
export class AIServiceError extends Error {
  /**
   * Error code
   */
  code: string;

  /**
   * Constructor
   * @param message Error message
   * @param code Error code
   */
  constructor(message: string, code: string = 'AI_SERVICE_ERROR') {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
  }

  /**
   * Create an error for invalid configuration
   * @param message Error message details
   * @returns Configured error instance
   */
  static configurationError(message: string): AIServiceError {
    return new AIServiceError(
      `AI service configuration error: ${message}`,
      'AI_CONFIGURATION_ERROR'
    );
  }

  /**
   * Create an error for authentication failures
   * @param message Error message details
   * @returns Configured error instance
   */
  static authenticationError(message: string): AIServiceError {
    return new AIServiceError(
      `AI authentication error: ${message}`,
      'AI_AUTHENTICATION_ERROR'
    );
  }

  /**
   * Create an error for rate limiting
   * @param message Error message details
   * @returns Configured error instance
   */
  static rateLimitError(message: string): AIServiceError {
    return new AIServiceError(
      `AI rate limit exceeded: ${message}`,
      'AI_RATE_LIMIT_ERROR'
    );
  }

  /**
   * Create an error for model execution failures
   * @param message Error message details
   * @returns Configured error instance
   */
  static modelError(message: string): AIServiceError {
    return new AIServiceError(
      `AI model execution error: ${message}`,
      'AI_MODEL_ERROR'
    );
  }

  /**
   * Create an error for request failures
   * @param message Error message details
   * @returns Configured error instance
   */
  static requestError(message: string): AIServiceError {
    return new AIServiceError(
      `AI request error: ${message}`,
      'AI_REQUEST_ERROR'
    );
  }

  /**
   * Create an error for response parsing failures
   * @param message Error message details
   * @returns Configured error instance
   */
  static responseParsingError(message: string): AIServiceError {
    return new AIServiceError(
      `AI response parsing error: ${message}`,
      'AI_RESPONSE_PARSING_ERROR'
    );
  }
} 