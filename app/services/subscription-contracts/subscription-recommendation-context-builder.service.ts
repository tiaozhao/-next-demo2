import { loggerService } from '~/lib/logger';
import type {
  IOrderItem,
  ISubscriptionItem,
  IWishlistItem,
  IProductCatalogItem,
  IUnifiedItemContext
} from '~/types/subscription-contracts/subscription-recommendation.types';

/**
 * Context builder service for subscription recommendations
 * Responsible for building unified context from various data sources
 */
export class SubscriptionRecommendationContextBuilderService {
  private readonly CLASS_NAME = 'SubscriptionRecommendationContextBuilderService';

  /**
   * Build unified item context for a single SKU
   * @param params Input parameters and data sources
   * @returns Unified item context
   */
  public buildUnifiedContext(params: {
    skuId: string;
    storeName: string;
    companyLocationId: string;
    orderItems: IOrderItem[];
    subscriptionItems: ISubscriptionItem[];
    wishlistItems: IWishlistItem[];
    catalogItems: IProductCatalogItem[];
    topSellingSkus: Set<string>;
    shopifyRecommendationSkus?: Set<string>;
  }): IUnifiedItemContext {
    const METHOD = 'buildUnifiedContext';
    const start = Date.now();

    try {
      const { skuId, storeName, companyLocationId, orderItems, subscriptionItems, wishlistItems, topSellingSkus, shopifyRecommendationSkus } = params;

      // Filter items related to this specific SKU
      const relatedOrderItems = orderItems.filter(item => item.skuId === skuId);
      const relatedSubscriptionItems = subscriptionItems.filter(item => item.skuId === skuId);
      const relatedWishlistItems = wishlistItems.filter(item => item.skuId === skuId);

      // Build context with base fields
      const context: IUnifiedItemContext = {
        skuId,
        storeName,
        companyLocationId,

        // Boolean flags
        isInWishlist: relatedWishlistItems.length > 0,
        isSubscribed: relatedSubscriptionItems.some(item => item.status === 'active'),
        isTopSelling: topSellingSkus.has(skuId),
        isShopifyRecommendation: shopifyRecommendationSkus ? shopifyRecommendationSkus.has(skuId) : false,

        // Order statistics
        orderCount: relatedOrderItems.length,
        totalQuantity: relatedOrderItems.reduce((sum, item) => sum + item.quantity, 0),
        lastOrderDate: this.getLastOrderDate(relatedOrderItems),

        // Subscription details
        subscriptionFrequency: this.getActiveSubscriptionFrequency(relatedSubscriptionItems),
        nextDeliveryDate: this.getNextDeliveryDate(relatedSubscriptionItems)
      };

      loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Built unified context for SKU ${skuId}`, {
        skuId,
        orderItemsCount: relatedOrderItems.length,
        isSubscribed: context.isSubscribed,
        isInWishlist: context.isInWishlist,
        isShopifyRecommendation: context.isShopifyRecommendation,
        duration: Date.now() - start
      });

      return context;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error building unified context`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        skuId: params.skuId,
        duration: Date.now() - start
      });

      // Return basic context in case of error
      return {
        skuId: params.skuId,
        storeName: params.storeName,
        companyLocationId: params.companyLocationId
      };
    }
  }

  /**
   * Build unified context for multiple SKUs
   * @param params Input parameters and data sources
   * @returns Map of SKU to unified context
   */
  public buildUnifiedContexts(params: {
    skuIds: string[];
    storeName: string;
    companyLocationId: string;
    orderItems: IOrderItem[];
    subscriptionItems: ISubscriptionItem[];
    wishlistItems: IWishlistItem[];
    catalogItems: IProductCatalogItem[];
    topSellingSkus: Set<string>;
    shopifyRecommendationSkus?: Set<string>;
  }): Map<string, IUnifiedItemContext> {
    const METHOD = 'buildUnifiedContexts';
    const start = Date.now();

    try {
      const contextMap = new Map<string, IUnifiedItemContext>();

      for (const skuId of params.skuIds) {
        const context = this.buildUnifiedContext({
          skuId,
          storeName: params.storeName,
          companyLocationId: params.companyLocationId,
          orderItems: params.orderItems,
          subscriptionItems: params.subscriptionItems,
          wishlistItems: params.wishlistItems,
          catalogItems: params.catalogItems,
          topSellingSkus: params.topSellingSkus,
          shopifyRecommendationSkus: params.shopifyRecommendationSkus
        });

        contextMap.set(skuId, context);
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Built unified contexts for ${params.skuIds.length} SKUs`, {
        skuCount: params.skuIds.length,
        storeName: params.storeName,
        duration: Date.now() - start
      });

      return contextMap;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error building unified contexts`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        skuCount: params.skuIds.length,
        duration: Date.now() - start
      });

      // Return empty map in case of error
      return new Map<string, IUnifiedItemContext>();
    }
  }

  /**
   * Get the most recent order date from a list of order items
   * @param orderItems List of order items
   * @returns Most recent order date as ISO string, or undefined if no orders
   */
  private getLastOrderDate(orderItems: IOrderItem[]): string | undefined {
    if (!orderItems.length) return undefined;

    const orderDates = orderItems.map(item => new Date(item.orderDate).getTime());
    const mostRecentTimestamp = Math.max(...orderDates);

    return new Date(mostRecentTimestamp).toISOString();
  }

  /**
   * Get the frequency of the active subscription
   * @param subscriptionItems List of subscription items
   * @returns Frequency as string, or undefined if no active subscription
   */
  private getActiveSubscriptionFrequency(subscriptionItems: ISubscriptionItem[]): string | undefined {
    const activeSubscription = subscriptionItems.find(item => item.status === 'active');
    return activeSubscription?.frequency;
  }

  /**
   * Get the next delivery date of the active subscription
   * @param subscriptionItems List of subscription items
   * @returns Next delivery date as ISO string, or undefined if no active subscription
   */
  private getNextDeliveryDate(subscriptionItems: ISubscriptionItem[]): string | undefined {
    const activeSubscription = subscriptionItems.find(item => item.status === 'active');
    return activeSubscription?.nextDeliveryDate;
  }
}

export const subscriptionRecommendationContextBuilderService = new SubscriptionRecommendationContextBuilderService(); 