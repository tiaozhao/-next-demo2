/**
 * Service for generating product recommendations
 */

import { generateText } from 'ai';
import type { AIModel } from '../../core/interfaces/ai-model.interface';
import type { AIProvider } from '../../core/interfaces/ai-provider.interface';
import { AIServiceError } from '../../core/errors/ai-service.errors';
import { getServicesConfig } from '~/config';
import { loggerService } from '~/lib/logger';
import { getRecommendationPrompt } from '../../core/prompts/subscription-recommendation.prompt';
import type {
  LLMInputProduct,
  FinalRecommendation
} from '../../core/types/subscription-recommendation/recommendation.types';

/**
 * Service for generating B2B subscription recommendations
 */
export class SubscriptionRecommendationService {
  /**
   * Service class name for logging
   */
  private readonly CLASS_NAME = 'SubscriptionRecommendationService';

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
   * Generate product recommendations
   *
   * @param products List of products to evaluate
   * @returns List of product recommendations with scores on a 0-10 scale
   */
  async generateRecommendations(products: LLMInputProduct[]): Promise<FinalRecommendation[]> {
    const METHOD = 'generateRecommendations';
    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting recommendation generation`, {
        productCount: products.length,
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
      const modeConfig = ai.modes?.subscriptionRecommendation || {};

      // Create model instance
      const modelInstance = await this.model.createInstance();

      // Generate prompt
      const prompt = getRecommendationPrompt(products);

      // Process prompt data for logging
      const productsWithPrompts = products.filter(p => (p as any).rulePrompts && (p as any).rulePrompts.length > 0);

      // Collect all unique rule prompts
      const allRulePrompts = new Set<string>();
      const matchedRulePrompts = new Map<string, string[]>();

      products.forEach(p => {
        if ((p as any).rulePrompts && Array.isArray((p as any).rulePrompts)) {
          (p as any).rulePrompts.forEach((prompt: string) => {
            allRulePrompts.add(prompt);

            // Associate rule names with prompts
            if (p.matchedRules && p.matchedRules.length > 0) {
              p.matchedRules.forEach(ruleName => {
                if (!matchedRulePrompts.has(ruleName)) {
                  matchedRulePrompts.set(ruleName, []);
                }
                if (!matchedRulePrompts.get(ruleName)?.includes(prompt)) {
                  matchedRulePrompts.get(ruleName)?.push(prompt);
                }
              });
            }
          });
        }
      });

      // Log summary information at INFO level
      if (productsWithPrompts.length > 0) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Processing recommendation with custom prompts`, {
          productsWithPromptsCount: productsWithPrompts.length,
          uniqueRulePromptsCount: allRulePrompts.size,
          matchedRulesCount: matchedRulePrompts.size
        });

        // Log detailed information at DEBUG level
        if (loggerService.isLevelEnabled('debug')) {
          // Log matched rules and their prompts (with previews)
          loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Matched rules and their prompts`, {
            count: matchedRulePrompts.size,
            rulePrompts: Array.from(matchedRulePrompts.entries()).map(([ruleName, prompts]) => ({
              ruleName,
              promptCount: prompts.length,
              promptPreviews: prompts.map(p => p.substring(0, 50) + (p.length > 50 ? '...' : ''))
            }))
          });

          // Log prompt summary
          const promptPreview = prompt.substring(0, 200) + (prompt.length > 200 ? '...' : '');
          loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Prompt summary`, {
            promptLength: prompt.length,
            promptPreview
          });

          // Log a sample of product data (limited to 1 product)
          if (productsWithPrompts.length > 0) {
            const sampleProduct = productsWithPrompts[0];
            loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Sample product data`, {
              skuId: sampleProduct.skuId,
              title: sampleProduct.title,
              category: sampleProduct.category,
              score: sampleProduct.score,
              matchedRulesCount: sampleProduct.matchedRules.length,
              promptsCount: ((sampleProduct as any).rulePrompts || []).length
            });
          }
        }
      }

      // Create messages for AI processing
      const messages = [
        {
          role: 'system' as const,
          content: prompt
        }
      ];

      // Generate text from AI
      const llmResponse = await this.generateAIResponse(
        modelInstance,
        messages,
        {
          temperature: modeConfig.temperature ?? 0.2,
          maxTokens: modeConfig.maxTokens ?? 2048
        }
      );

      // Parse the response
      const recommendations = this.parseRecommendations(llmResponse);

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully generated recommendations`, {
        recommendationCount: recommendations.length,
        provider: this.provider.id,
        model: this.model.modelId
      });

      return recommendations;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to generate recommendations`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        provider: this.provider.id,
        model: this.model.modelId
      });

      throw error instanceof AIServiceError
        ? error
        : AIServiceError.modelError(
          `Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
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
      temperature: options.temperature || 0.2,
      maxTokens: options.maxTokens || 2048,
    });

    return text;
  }

  /**
   * Parse LLM response into FinalRecommendation objects
   *
   * @param response Raw LLM response text
   * @returns List of parsed recommendations
   */
  private parseRecommendations(response: string): FinalRecommendation[] {
    try {
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        loggerService.warn(`${this.CLASS_NAME}.parseRecommendations: No JSON found in response`);
        return [];
      }

      // Parse JSON
      const parsed = JSON.parse(jsonMatch[0]);

      // Ensure it's an array
      if (!Array.isArray(parsed)) {
        loggerService.warn(`${this.CLASS_NAME}.parseRecommendations: Response is not an array`);
        return [];
      }

      // Validate and transform each recommendation
      return parsed.map(item => ({
        skuId: item.skuId,
        reason: item.reason || 'Recommended product',
        score: typeof item.score === 'number' ? Math.min(10, Math.max(0, item.score)) : 5
      }));
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.parseRecommendations: Failed to parse response`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseExcerpt: response.substring(0, 200) + '...'
      });
      return [];
    }
  }
}