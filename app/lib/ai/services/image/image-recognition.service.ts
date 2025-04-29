import { generateText } from 'ai';
import { AIService } from '../../core/interfaces/ai-service.interface';
import { AIModel } from '../../core/interfaces/ai-model.interface';
import { AIProvider } from '../../core/interfaces/ai-provider.interface';
import { AIServiceError } from '../../core/errors/ai-service.errors';
import { getServicesConfig } from '~/config';
import { loggerService } from '~/lib/logger';
import { PurchaseOrder } from '../../core/types/purchase-order/purchase-order.types';
import { PurchaseOrderSchema } from '../../core/types/purchase-order/purchase-order.schema';
import { getPurchaseOrderPrompt } from '../../core/prompts/purchase-order.prompt';
import {
  cleanJsonResponse,
  preprocessRawData,
} from '../../core/utils/response-parser';

/**
 * Image Recognition Service
 * Provides functionality for extracting structured data from images
 */
export class ImageRecognitionService implements AIService<Buffer | Buffer[], PurchaseOrder> {
  /**
   * Service class name for logging
   */
  private readonly CLASS_NAME = 'ImageRecognitionService';

  /**
   * AI model instance
   */
  private model: AIModel;

  /**
   * AI provider instance
   */
  private provider: AIProvider;

  /**
   * Constructor
   * @param model The AI model to use
   * @param provider The AI provider to use
   */
  constructor(model: AIModel, provider: AIProvider) {
    this.model = model;
    this.provider = provider;

    loggerService.info(`${this.CLASS_NAME}: Initialized`, {
      modelId: this.model.modelId,
      provider: this.provider.id
    });
  }

  /**
   * Process image data and extract purchase order information
   * @param imageData Single image buffer or array of image buffers
   * @returns Extracted purchase order data
   */
  async process(imageData: Buffer | Buffer[]): Promise<PurchaseOrder> {
    const METHOD = 'process';
    try {
      // Validate image data
      this.validateImageData(imageData);

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting image recognition`, {
        imageCount: Array.isArray(imageData) ? imageData.length : 1,
        provider: this.provider.id,
        model: this.model.modelId
      });

      // Check usage limits
      const { isWithinLimits } = await this.provider.checkLimits();
      if (!isWithinLimits) {
        throw AIServiceError.rateLimitError('Usage limits exceeded');
      }

      // Get configuration
      const { ai } = getServicesConfig();
      const modeConfig = ai.modes?.imageProcessing || {};

      // Create model instance
      const modelInstance = await this.model.createInstance();

      // Create messages for processing
      const messages = this.createMessages(imageData);

      // Generate text from AI
      const result = await this.generateAIResponse(
        modelInstance,
        messages,
        {
          temperature: modeConfig.temperature ?? 0,
          maxTokens: modeConfig.maxTokens
        }
      );

      // Parse the result
      const parsedData = this.processAIResponse(result);

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully processed image`, {
        orderNumber: parsedData.orderNumber,
        itemCount: parsedData.items.length,
        provider: this.provider.id,
        model: this.model.modelId
      });

      return parsedData;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to process image`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        provider: this.provider.id,
        model: this.model.modelId,
        imageCount: Array.isArray(imageData) ? imageData.length : 1
      });

      throw error instanceof AIServiceError
        ? error
        : AIServiceError.modelError(
          `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
  }

  /**
   * Get the AI model
   * @returns The AI model
   */
  getModel(): AIModel {
    return this.model;
  }

  /**
   * Get the AI provider
   * @returns The AI provider
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Validate the image data
   * @param imageData The image data to validate
   */
  private validateImageData(imageData: Buffer | Buffer[]): void {
    if (!imageData || (Array.isArray(imageData) && imageData.length === 0)) {
      throw AIServiceError.requestError('Image data is required');
    }
  }

  /**
   * Create messages for AI processing
   * @param imageData The image data to process
   * @returns Array of messages for the AI
   */
  private createMessages(imageData: Buffer | Buffer[]): Array<{ role: 'system' | 'user'; content: any }> {
    const imageContents = Array.isArray(imageData) ? imageData : [imageData];

    // Use the dedicated prompt module instead of an inline method
    const systemPrompt = getPurchaseOrderPrompt();

    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          ...imageContents.map(img => ({
            type: 'image',
            image: img.toString('base64')
          })),
          {
            type: 'text',
            text: 'Extract all purchase order information from these images. If there are multiple pages, combine the information appropriately. Return the data in JSON format.'
          }
        ]
      }
    ];
  }

  /**
   * Generate AI response
   * @param model The model instance
   * @param messages The messages for the AI
   * @param options Generation options
   * @returns The generated text
   */
  private async generateAIResponse(
    model: any,
    messages: Array<{ role: 'system' | 'user'; content: any }>,
    options: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const { text } = await generateText({
      model,
      messages,
      temperature: options.temperature || 0,
      maxTokens: options.maxTokens,
    });

    return text;
  }

  /**
   * Process and validate AI response
   * @param response The raw response from the AI
   * @returns The validated and processed purchase order data
   */
  private processAIResponse(response: string): PurchaseOrder {
    try {
      // Use utility function to clean JSON response
      const cleanedJson = cleanJsonResponse(response);

      // Parse JSON
      const data = JSON.parse(cleanedJson);

      // Use utility function to process field mappings
      const processedData = preprocessRawData(data, this.CLASS_NAME);

      // Validate data against schema
      const validatedData = PurchaseOrderSchema.parse(processedData);

      return validatedData;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.processAIResponse: Failed to parse response`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        responsePreview: response.substring(0, 200) + (response.length > 200 ? '...' : '')
      });

      throw AIServiceError.responseParsingError(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
} 