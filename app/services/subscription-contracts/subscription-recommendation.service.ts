import { loggerService } from '~/lib/logger';
import { subscriptionRecommendationDataSourceService } from './subscription-recommendation-data-source.service';
import { subscriptionRecommendationRuleExecutorService } from './subscription-recommendation-rule-executor.service';
import { subscriptionRecommendationResultRepository } from '~/repositories/subscription-recommendation/subscription-recommendation-result.repository';
import { subscriptionRecommendationContextBuilderService } from './subscription-recommendation-context-builder.service';
import type {
  IGetRecommendationsParams,
  IOrderItem,
  ISubscriptionItem,
  IWishlistItem,
  IProductCatalogItem,
} from '~/types/subscription-contracts/subscription-recommendation.types';
import { generateProductRecommendations } from '~/lib/ai';
import { shopifyProductService } from '~/lib/shopify/services/product';

/**
 * Service for generating subscription recommendations
 * Integrates different recommendation sources and applies business rules
 */
export class SubscriptionRecommendationService {
  private readonly CLASS_NAME = 'SubscriptionRecommendationService';
  private readonly DEFAULT_VERSION = 'v1'; // Default version for cache

  /**
   * Prepare input data for LLM processing
   * @param evaluatedItems Array of items evaluated by rules
   * @param params Request parameters
   * @param rules Active rules with custom prompts
   * @returns Array of products formatted for LLM input
   */
  private async prepareLLMInput(evaluatedItems: any[], params: any, rules: any[] = []) {
    const METHOD = 'prepareLLMInput';
    try {
      // Extract unique SKU IDs from evaluated items
      const skuIds = evaluatedItems.map(item => item.skuId).filter((skuId): skuId is string => !!skuId);
      const uniqueSkuIds = [...new Set(skuIds)];

      // Return empty array if no SKUs found
      if (!uniqueSkuIds.length) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No SKUs found in evaluated items`);
        return [];
      }

      // Get unified contexts for these SKUs
      const unifiedContexts = await this.getUnifiedContexts(params, uniqueSkuIds);

      // Prepare search parameters
      const searchParams = {
        storeDomain: params.storeName,
        query: uniqueSkuIds.map(sku => `sku:${sku}`).join(' OR '),
        companyLocationId: params.companyLocationId,
        first: uniqueSkuIds.length
      };

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Searching for products with SKUs`, {
        skuCount: uniqueSkuIds.length,
        // Only log a sample of SKUs to avoid excessive logging
        skuSample: uniqueSkuIds.slice(0, 5).join(', ') + (uniqueSkuIds.length > 5 ? '...' : '')
      });

      // Fetch product details for each SKU
      let products: any[] = [];
      try {
        products = await shopifyProductService.searchProducts(searchParams);
      } catch (searchError) {
        loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error searching products`, {
          error: searchError instanceof Error ? searchError.message : 'Unknown error',
          skus: uniqueSkuIds
        });
      }

      // If no products found from API, create fallback data from evaluated items
      if (!products || products.length === 0) {
        loggerService.warn(`${this.CLASS_NAME}.${METHOD}: No products found from API, using fallback data`, {
          evaluatedItemsCount: evaluatedItems.length
        });

        // Create a map of rules by ID for easy lookup
        const rulesMap = new Map(
          rules.map(rule => [rule.id.toString(), rule])
        );

        // Create enhanced product data from evaluated items and unified contexts
        const llmInputProducts = evaluatedItems.map(item => {
          const context = unifiedContexts.get(item.skuId) || {};

          // Collect custom prompts from matched rules
          const matchedRuleIds = item.matchedRules || [];
          const rulePrompts: string[] = [];

          for (const ruleId of matchedRuleIds) {
            const rule = rulesMap.get(ruleId);
            if (rule?.customPrompt) {
              rulePrompts.push(rule.customPrompt);
            }
          }

          return {
            // Include all unified context fields
            ...context,
            // Add product information
            title: item.title || `Product ${item.skuId}`,
            description: item.description || `Description for ${item.skuId}`,
            category: item.category,
            inventoryQuantity: item.inventoryQuantity || 0,
            // Add rule evaluation results with updated field names
            score: item.score || 0,
            matchedRules: matchedRuleIds,
            // Add custom prompts from matched rules if any
            ...(rulePrompts.length > 0 ? { rulePrompts } : {})
          };
        });

        return llmInputProducts;
      }

      // Transform products and evaluated items into LLMInputProduct format
      const llmInputProducts = [];

      // Create a map of evaluated items by SKU for easy lookup
      const evaluatedItemsMap = new Map(
        evaluatedItems.map(item => [item.skuId, item])
      );

      // Create a map of rules by ID for easy lookup
      const rulesMap = new Map(
        rules.map(rule => [rule.id.toString(), rule])
      );

      // Log rules with custom prompts (summary at INFO level)
      const rulesWithPrompts = rules.filter(rule => rule.customPrompt);
      if (rulesWithPrompts.length > 0) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Found rules with custom prompts`, {
          rulesWithPromptsCount: rulesWithPrompts.length
        });

        // Log detailed rule information at DEBUG level
        if (loggerService.isLevelEnabled('debug')) {
          loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Rules with custom prompts details`, {
            rulesWithPrompts: rulesWithPrompts.map(rule => ({
              id: rule.id,
              name: rule.name,
              promptPreview: rule.customPrompt?.substring(0, 50) + (rule.customPrompt && rule.customPrompt.length > 50 ? '...' : '')
            }))
          });
        }
      }

      // Process each product and combine with evaluation data
      for (const product of products) {
        // Check all variants for matching SKUs
        const variants = product.variants?.nodes || [];
        for (const variant of variants) {
          const skuId = variant?.sku;
          const evaluatedItem = evaluatedItemsMap.get(skuId);
          const context = unifiedContexts.get(skuId) || {};

          if (evaluatedItem && skuId) {
            // Collect custom prompts from matched rules
            const matchedRuleIds = evaluatedItem.matchedRules || [];
            const rulePrompts: string[] = [];
            const matchedRulesWithPrompts: any[] = [];

            for (const ruleId of matchedRuleIds) {
              const rule = rulesMap.get(ruleId);
              if (rule?.customPrompt) {
                rulePrompts.push(rule.customPrompt);
                matchedRulesWithPrompts.push({
                  id: rule.id,
                  name: rule.name || rule.ruleKey,
                  promptPreview: rule.customPrompt.substring(0, 30) + (rule.customPrompt.length > 30 ? '...' : '')
                });
              }
            }

            // Log matched rules with custom prompts for this product (at DEBUG level only)
            if (matchedRulesWithPrompts.length > 0 && loggerService.isLevelEnabled('debug')) {
              loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Product matched rules with custom prompts`, {
                skuId,
                title: product.title,
                matchedRulesCount: matchedRulesWithPrompts.length,
                matchedRuleNames: matchedRulesWithPrompts.map(r => r.name)
              });
            }

            llmInputProducts.push({
              // Include all unified context fields
              ...context,
              // Add product information
              title: product.title,
              description: product.description,
              category: product.category?.fullName || undefined,
              inventoryQuantity: variant?.inventoryQuantity || 0,
              // Add rule evaluation results with updated field names
              score: evaluatedItem.score || 0,
              matchedRules: matchedRuleIds,
              // Add custom prompts from matched rules if any
              ...(rulePrompts.length > 0 ? { rulePrompts } : {})
            });
          }
        }
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Prepared LLM input products`, {
        inputProductCount: llmInputProducts.length,
        evaluatedItemsCount: evaluatedItems.length,
        productsFromApiCount: products.length
      });

      return llmInputProducts;

    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error preparing LLM input`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return [];
    }
  }

  /**
   * Get unified contexts for a set of SKUs
   * @param params Request parameters
   * @param skuIds List of SKU IDs to get contexts for
   * @returns Map of SKU ID to unified context
   */
  private async getUnifiedContexts(params: any, skuIds: string[]): Promise<Map<string, any>> {
    const METHOD = 'getUnifiedContexts';
    try {
      // Collect data sources
      const dataSourceResults = await this.collectDataSources(params);

      // Build unified contexts for the specified SKUs
      const unifiedContexts = subscriptionRecommendationContextBuilderService.buildUnifiedContexts({
        skuIds,
        storeName: params.storeName,
        companyLocationId: params.companyLocationId,
        orderItems: dataSourceResults.orderItems,
        subscriptionItems: dataSourceResults.subscriptionItems,
        wishlistItems: dataSourceResults.wishlistItems,
        catalogItems: dataSourceResults.catalogItems,
        topSellingSkus: dataSourceResults.topSellingSkus,
        shopifyRecommendationSkus: dataSourceResults.shopifyRecommendationSkus
      });

      return unifiedContexts;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error getting unified contexts`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        skuCount: skuIds.length
      });

      // Return empty map in case of error
      return new Map();
    }
  }

  /**
   * Get personalized subscription recommendations for a customer
   * @param params Request parameters
   * @returns Recommendations from different sources
   */
  public async getRecommendations(params: IGetRecommendationsParams): Promise<any> {
    const METHOD = 'getRecommendations';

    try {
      const { storeName: storeNameFromParams, companyLocationId: locationIdFromParams } = params;

      try {
        const cachedResults = await subscriptionRecommendationResultRepository.getResults({
          storeName: params.storeName,
          customerId: params.customerId,
          companyLocationId: params.companyLocationId,
          version: this.DEFAULT_VERSION
        });

        if (cachedResults && cachedResults.finalRecommendations.length > 0) {
          loggerService.info(`${this.CLASS_NAME}.${METHOD}: Using cached recommendations`, {
            storeName: params.storeName,
            customerId: params.customerId,
            companyLocationId: params.companyLocationId,
            recommendationsCount: cachedResults.finalRecommendations.length,
            cacheAge: Math.round((Date.now() - cachedResults.updatedAt.getTime()) / (1000 * 60)) + ' minutes'
          });

          if (cachedResults.llmOutput?.recommendations) {
            return {
              recommendations: cachedResults.llmOutput.recommendations,
              metadata: {
                cacheHit: true,
                cachedAt: cachedResults.updatedAt
              }
            };
          }

          return {
            recommendations: cachedResults.finalRecommendations,
            metadata: {
              cacheHit: true,
              cachedAt: cachedResults.updatedAt
            }
          };
        }

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No valid cache found, generating new recommendations`, {
          storeName: params.storeName,
          customerId: params.customerId,
          companyLocationId: params.companyLocationId
        });
      } catch (cacheError) {

        loggerService.warn(`${this.CLASS_NAME}.${METHOD}: Failed to check cache, will generate new recommendations`, {
          error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
          storeName: params.storeName,
          customerId: params.customerId
        });
      }

      // 1. Collect data from all data sources
      const dataSourceResults = await this.collectDataSources(params);

      // Get all unique SKU identifiers
      const allSkuIds = new Set<string>([
        ...dataSourceResults.orderItems.map(item => item.skuId),
        ...dataSourceResults.subscriptionItems.map(item => item.skuId),
        ...dataSourceResults.wishlistItems.map(item => item.skuId),
        ...dataSourceResults.shopifyRecommendationSkus
      ]);

      // Build unified contexts for all SKUs
      const unifiedContexts = subscriptionRecommendationContextBuilderService.buildUnifiedContexts({
        skuIds: Array.from(allSkuIds),
        storeName: storeNameFromParams,
        companyLocationId: locationIdFromParams,
        orderItems: dataSourceResults.orderItems,
        subscriptionItems: dataSourceResults.subscriptionItems,
        wishlistItems: dataSourceResults.wishlistItems,
        catalogItems: dataSourceResults.catalogItems,
        topSellingSkus: dataSourceResults.topSellingSkus,
        shopifyRecommendationSkus: dataSourceResults.shopifyRecommendationSkus
      });


      const ruleEngineContext = {
        unifiedContexts // Pass only the unified contexts map - this is what we actually use now
      };
      // Get all active rules for custom prompts
      const rules = await subscriptionRecommendationRuleExecutorService.getActiveRules(params.storeName);

      // Execute rules - now returns directly the evaluated items with scores
      const evaluatedItems = await subscriptionRecommendationRuleExecutorService.executeRules({
        customerId: params.customerId,
        storeName: params.storeName,
        companyLocationId: params.companyLocationId,
        context: ruleEngineContext
      });

      // Log rule execution results
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Rule execution completed`, {
        evaluatedItemsCount: evaluatedItems.length,
        rulesCount: rules.length,
        rulesWithPromptsCount: rules.filter(r => r.customPrompt).length
      });

      const llmInputProducts = await this.prepareLLMInput(evaluatedItems, params, rules);

      // After preparing llmInputProducts
      try {
        // Call the AI service to enhance recommendations
        const recommendations = await generateProductRecommendations(llmInputProducts);

        loggerService.info(`${this.CLASS_NAME}.getRecommendations: AI recommendations generated`, {
          recommendationCount: recommendations.length
        });

        // Cache the results to database without any conversion
        try {
          await subscriptionRecommendationResultRepository.saveResults({
            storeName: params.storeName,
            customerId: params.customerId,
            companyLocationId: params.companyLocationId,
            ruleResults: evaluatedItems,
            llmOutput: recommendations,
            finalRecommendations: recommendations as any,
            version: this.DEFAULT_VERSION,
          });

          loggerService.info(`${this.CLASS_NAME}.${METHOD}: Cached recommendation results to database`, {
            storeName: params.storeName,
            // Use masked IDs for sensitive data
            recommendationsCount: recommendations.length
          });
        } catch (cacheError) {
          // Log error but don't fail the request if caching fails
          loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to cache recommendation results`, {
            error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
            storeName: params.storeName
          });
        }

        // Return recommendations with metadata
        return {
          recommendations,
          evaluatedItems,
          metadata: {
            cacheHit: false,
            generatedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        loggerService.error(`${this.CLASS_NAME}.getRecommendations: AI recommendation failed`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          storeName: params.storeName
        });

        // If AI service fails, return empty results
        return {
          recommendations: [],
          metadata: {
            cacheHit: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        };
      }
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error generating recommendations`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        params
      });

      return {
        recommendations: [],
        metadata: {
          cacheHit: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Collect data from various sources to use in recommendations
   */
  public async collectDataSources(params: IGetRecommendationsParams): Promise<{
    orderItems: IOrderItem[];
    subscriptionItems: ISubscriptionItem[];
    wishlistItems: IWishlistItem[];
    catalogItems: IProductCatalogItem[];
    catalogSkus: Set<string>;
    topSellingSkus: Set<string>;
    shopifyRecommendationSkus: Set<string>;
  }> {
    const METHOD = 'collectDataSources';

    try {
      const [
        orderItems,
        subscriptionItems,
        wishlistItems,
        catalogItems
      ] = await Promise.all([
        subscriptionRecommendationDataSourceService.getOrderItems(params),
        subscriptionRecommendationDataSourceService.getSubscriptionItems(params),
        subscriptionRecommendationDataSourceService.getWishlistItems(params),
        subscriptionRecommendationDataSourceService.getCatalogProductItems(params)
      ]);

      // Create catalog SKUs set for filtering
      const catalogSkus = new Set<string>(catalogItems.map(item => item.skuId));

      // Combine and deduplicate product IDs from all sources
      const allProductIds = new Set<string>();

      // Collect product IDs from recent orders (last 90 days)
      orderItems
        .filter(item => new Date(item.orderDate).getTime() >= Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        .forEach(item => allProductIds.add(item.productId));

      // Extract SKUs from subscription items and wishlist items
      const combinedSkuSet = new Set<string>([
        ...subscriptionItems.map(item => item.skuId),
        ...wishlistItems.map(item => item.skuId)
      ].filter(Boolean));

      // Get product IDs for the combined set of SKUs
      if (combinedSkuSet.size > 0) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Getting product IDs for subscription and wishlist SKUs`, {
          combinedSkusCount: combinedSkuSet.size,
          subscriptionItemsCount: subscriptionItems.length,
          wishlistItemsCount: wishlistItems.length
        });

        const productIds = await subscriptionRecommendationDataSourceService.getProductIdsBySkuSet(
          params,
          combinedSkuSet
        );

        // Add product IDs to the collection
        productIds.forEach(id => allProductIds.add(id));

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Added product IDs from subscriptions and wishlists`, {
          productIdsAdded: productIds.length,
          totalProductIds: allProductIds.size
        });
      }

      // Convert collected unique IDs to array and limit count
      const uniqueProductIdsForRecommendations = Array.from(allProductIds);

      // Get Shopify recommendations
      const shopifyRecommendations = await subscriptionRecommendationDataSourceService.getShopifyRecommendations(
        params,
        uniqueProductIdsForRecommendations,
        'WISHLIST' // Use valid enum value
      );

      // Extract recommendation SKUs for context building
      const shopifyRecommendationSkus = new Set<string>();

      // Temporary set for top selling - in future, this will come from a dedicated data source
      const topSellingSkus = new Set<string>();

      shopifyRecommendations.forEach(rec => {
        // Extract SKU
        let skuId: string | null = null;

        // Get SKU from variant or direct property
        if (rec.variants?.edges?.[0]?.node?.sku) {
          skuId = rec.variants.edges[0].node.sku;
        } else if (rec.sku) {
          skuId = rec.sku;
        }

        if (skuId) {
          // Add to Shopify recommendation SKUs set
          shopifyRecommendationSkus.add(skuId);
        }
      });

      // Note: We will need a separate source for top selling products in the future
      // For now, using a placeholder empty set

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Collected data sources with optimized format`, {
        orderItemsCount: orderItems.length,
        subscriptionItemsCount: subscriptionItems.length,
        wishlistItemsCount: wishlistItems.length,
        catalogItemsCount: catalogItems.length,
        topSellingSkusCount: topSellingSkus.size,
        shopifyRecommendationsCount: shopifyRecommendations.length,
        shopifyRecommendationSkusCount: shopifyRecommendationSkus.size,
        catalogSkusCount: catalogSkus.size,
        customerId: params.customerId,
        storeName: params.storeName
      });

      return {
        orderItems,
        subscriptionItems,
        wishlistItems,
        catalogItems,
        catalogSkus,
        topSellingSkus,
        shopifyRecommendationSkus
      };
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to collect data sources`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        params
      });
      throw error;
    }
  }

  /**
   * Invalidate cached recommendations for a customer
   * @param params Customer identification parameters
   * @returns Object with invalidation result and reason
   */
  public async invalidateRecommendationCache(params: {
    storeName: string;
    customerId: string;
    companyLocationId: string;
    lineItems?: { sku: string }[];
  }): Promise<{ invalidated: boolean; reason: string }> {
    const METHOD = 'invalidateRecommendationCache';

    try {
      // If lineItems are provided, check if they are in the current recommendations
      if (params.lineItems && params.lineItems.length > 0) {
        try {
          // Get current cached recommendations
          const cachedResults = await subscriptionRecommendationResultRepository.getResults({
            storeName: params.storeName,
            customerId: params.customerId,
            companyLocationId: params.companyLocationId,
            version: this.DEFAULT_VERSION
          });

          // If we have cached results, check if all order SKUs are in the recommendations
          if (cachedResults && cachedResults.finalRecommendations.length > 0) {
            // Extract SKUs from the cached recommendations
            const recommendationSkus = new Set<string>();
            let skuCount = 0;
            let skuIdCount = 0;

            cachedResults.finalRecommendations.forEach(rec => {
              if (rec.sku) {
                recommendationSkus.add(rec.sku);
                skuCount++;
              }


              const anyRec = rec as any;
              if (anyRec.skuId) {
                recommendationSkus.add(anyRec.skuId);
                skuIdCount++;
              }
            });

            loggerService.info(`${this.CLASS_NAME}.${METHOD}: Extracted SKUs from recommendations`, {
              totalRecommendations: cachedResults.finalRecommendations.length,
              skuPropertyCount: skuCount,
              skuIdPropertyCount: skuIdCount,
              totalUniqueSkus: recommendationSkus.size,
              storeName: params.storeName,
              customerId: params.customerId
            });

            // Check if all order SKUs are in the recommendations
            const orderSkus = params.lineItems.map(item => item.sku);

            if (loggerService.isLevelEnabled('debug')) {
              loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Comparing order SKUs with recommendation SKUs`, {
                orderSkus: orderSkus,
                recommendationSkus: Array.from(recommendationSkus),
                storeName: params.storeName,
                customerId: params.customerId
              });
            }

            const skusNotInRecommendations = orderSkus.filter(sku => !recommendationSkus.has(sku));

            // If all SKUs are in recommendations, no need to invalidate cache
            if (skusNotInRecommendations.length === 0) {
              loggerService.info(`${this.CLASS_NAME}.${METHOD}: All order SKUs are in current recommendations, keeping cache`, {
                orderSkuCount: orderSkus.length,
                recommendationSkuCount: recommendationSkus.size,
                storeName: params.storeName,
                customerId: params.customerId
              });
              return {
                invalidated: false,
                reason: 'All order SKUs already exist in current recommendations'
              }; // No invalidation needed
            }

            // Log SKUs that are not in recommendations
            loggerService.info(`${this.CLASS_NAME}.${METHOD}: Some order SKUs are not in current recommendations, invalidating cache`, {
              orderSkuCount: orderSkus.length,
              skusNotInRecommendationsCount: skusNotInRecommendations.length,
              skusNotInRecommendations: skusNotInRecommendations.join(', '),
              storeName: params.storeName,
              customerId: params.customerId
            });
          }
        } catch (cacheError) {
          loggerService.warn(`${this.CLASS_NAME}.${METHOD}: Error checking cached recommendations, will invalidate cache`, {
            error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
            storeName: params.storeName,
            customerId: params.customerId
          });
        }
      }

      // Pass only the 3 main parameters to repository
      const invalidationResult = await subscriptionRecommendationResultRepository.invalidateResults({
        storeName: params.storeName,
        customerId: params.customerId,
        companyLocationId: params.companyLocationId
      });

      const result = {
        invalidated: invalidationResult,
        reason: invalidationResult
          ? 'Cache entries successfully invalidated'
          : 'No cache entries found to invalidate'
      };

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: ${result.invalidated ? 'Successfully invalidated' : 'No'} cache entries`, {
        ...params,
        lineItemsCount: params.lineItems?.length,
        reason: result.reason
      });

      return result;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to invalidate cache`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: {
          storeName: params.storeName,
          customerId: params.customerId,
          companyLocationId: params.companyLocationId,
          lineItemsCount: params.lineItems?.length
        }
      });

      return {
        invalidated: false,
        reason: 'Error occurred while attempting to invalidate cache'
      };
    }
  }
}

/**
 * Singleton instance of the recommendation service
 */
export const subscriptionRecommendationService = new SubscriptionRecommendationService();
