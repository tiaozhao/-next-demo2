/**
 * Common request options for AI services
 */
export interface AIRequestOptions {
  /**
   * Model identifier to use for the request
   */
  model?: string;

  /**
   * Temperature for controlling randomness in the response (0-1)
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;

  /**
   * API key for authentication (override default)
   */
  apiKey?: string;

  /**
   * Base URL for the API endpoint (override default)
   */
  baseURL?: string;
}

/**
 * Message content type
 */
export type ContentType = 'text' | 'image';

/**
 * Message part structure for multimodal messages
 */
export interface MessagePart {
  /**
   * The type of content in this part
   */
  type: ContentType;

  /**
   * Text content (for text type)
   */
  text?: string;

  /**
   * Base64-encoded image data (for image type)
   */
  image?: string;
}

/**
 * Message structure for AI conversation
 */
export interface AIMessage {
  /**
   * Message role
   */
  role: 'system' | 'user' | 'assistant';

  /**
   * Message content
   * Can be a string for simple text messages or an array of parts for multimodal
   */
  content: string | MessagePart[];
} 