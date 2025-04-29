import { loggerService } from '~/lib/logger';
import { subscriptionContractRepository } from '~/repositories/subscription-contracts/subscription-contract.repository';
import { ShopifyClientManager } from '~/lib/shopify/client';
import { GET_CATALOG_PRODUCTS_WITH_VARIANTS } from '~/lib/shopify/queries/catalog';
import { shoppingListRepository } from '~/repositories/shopping-lists/shopping-list.repository';
import { shoppingListItemsRepository } from '~/repositories/shopping-lists/shopping-list-items.repository';
import { prisma } from '~/lib/prisma.server';
import type {
  IShoppingListSkuInfo,
  IDataSourceParams,
  ICatalogsResponse,
  IOrderItem,
  ISubscriptionItem,
  IWishlistItem,
  IProductCatalogItem
} from '~/types/subscription-contracts/subscription-recommendation.types';

import { shopifyProductService } from '~/lib/shopify/services/product';
import { shopifyOrderService } from '~/lib/shopify/services/order';

/**
 * Data source service for subscription recommendations
 * Responsible for retrieving data from various sources to build recommendations
 */
export class SubscriptionRecommendationDataSourceService {
  private readonly CLASS_NAME = 'SubscriptionRecommendationDataSourceService';


  /**
   * Get recent SKUs from wishlists
   * @param params Request parameters
   * @returns Array of unique SKUs with their last added date and quantity
   */
  public async getRecentWishlistSkus(params: IDataSourceParams): Promise<IShoppingListSkuInfo[]> {
    const METHOD = 'getRecentWishlistSkus';

    try {
      // 1. Get all wishlists for the customer
      const wishlists = await shoppingListRepository.findMany({
        customerId: params.customerId,
        companyLocationId: params.companyLocationId,
        storeName: params.storeName,
        pageSize: 10, // Limit to the 10 most recent wishlists
        sort: [{ field: 'updatedAt', order: 'desc' }]
      });

      if (!wishlists.lists.length) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No wishlists found`, {
          customerId: params.customerId,
          storeName: params.storeName
        });
        return [];
      }

      // 2. Get items from these wishlists
      const skuMap = new Map<string, IShoppingListSkuInfo>();
      let processedSkus = 0;

      // Process the 10 most recent wishlists
      for (const list of wishlists.lists) {
        const items = await shoppingListItemsRepository.findMany({
          shoppingListId: Number(list.id),
          pagination: {
            page: 1,
            pageSize: 50
          },
          sort: [{ field: 'createdAt', order: 'desc' }]
        });

        // Process items in the current wishlist
        for (const item of items.lists) {
          const existingItem = skuMap.get(item.skuId);

          // Get price from SkuPriceByLocation
          const priceInfo = await prisma.skuPriceByLocation.findFirst({
            where: {
              skuId: item.skuId,
              storeName: params.storeName,
              companyLocationId: params.companyLocationId
            },
            orderBy: {
              updatedAt: 'desc'
            }
          });

          if (existingItem) {
            // If SKU exists, update the quantity and last added date if more recent
            const updatedQuantity = (existingItem.quantity ?? 0) + (item.quantity ?? 0);
            skuMap.set(item.skuId, {
              ...existingItem,
              quantity: updatedQuantity,
              lastAddedAt: item.updatedAt > existingItem.lastAddedAt ? item.updatedAt : existingItem.lastAddedAt,
              price: priceInfo ? {
                amount: priceInfo.price.toString(),
                currencyCode: priceInfo.currencyCode
              } : existingItem.price
            });
          } else {
            // If SKU doesn't exist, add it to the map
            skuMap.set(item.skuId, {
              skuId: item.skuId,
              productId: item.productId,
              quantity: item.quantity || 0,
              lastAddedAt: item.updatedAt,
              price: priceInfo ? {
                amount: priceInfo.price.toString(),
                currencyCode: priceInfo.currencyCode
              } : undefined
            });
            processedSkus++;
          }

          // Exit early if we have collected 10 unique SKUs
          if (skuMap.size >= 10 && !existingItem) break;
        }

        // Exit early if we have collected 10 unique SKUs
        if (skuMap.size >= 10) break;
      }

      const result = Array.from(skuMap.values());

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved wishlist SKUs`, {
        processedLists: wishlists.lists.length,
        processedSkus,
        resultSkus: result.length,
        totalUniqueSkus: skuMap.size,
        storeName: params.storeName
      });

      return result;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get wishlist SKUs`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName: params.storeName
      });

      // Return empty array for graceful fallback
      return [];
    }
  }



  /**
   * Merge and process SKUs from different sources
   * @param wishlistSkus SKUs from wishlists
   * @param orderSkus SKUs from orders
   * @returns Merged and processed SKUs
   */
  public mergeAndProcessSkus(
    wishlistSkus: IShoppingListSkuInfo[],
    orderSkus: IShoppingListSkuInfo[]
  ): IShoppingListSkuInfo[] {
    const METHOD = 'mergeAndProcessSkus';

    try {
      // Create a map to store unique SKUs
      const skuMap = new Map<string, IShoppingListSkuInfo>();

      // Add wishlist SKUs
      for (const sku of wishlistSkus) {
        skuMap.set(sku.skuId, sku);
      }

      // Add or update with order SKUs
      for (const sku of orderSkus) {
        const existingSku = skuMap.get(sku.skuId);
        if (existingSku) {
          skuMap.set(sku.skuId, {
            ...existingSku,
            quantity: (existingSku.quantity ?? 0) + (sku.quantity ?? 0),
            lastAddedAt: sku.lastAddedAt > existingSku.lastAddedAt ? sku.lastAddedAt : existingSku.lastAddedAt
          });
        } else {
          skuMap.set(sku.skuId, sku);
        }
      }

      // Get all SKUs from the map
      const allSkus = Array.from(skuMap.values());

      // Create a map to collect unique productIds
      const productIdMap = new Map<string, IShoppingListSkuInfo>();

      // Sort all SKUs by lastAddedAt (most recent first)
      allSkus.sort((a, b) => b.lastAddedAt.getTime() - a.lastAddedAt.getTime());

      // Filter to get only unique productIds, keeping the most recently added SKU for each productId
      for (const sku of allSkus) {
        if (!productIdMap.has(sku.productId)) {
          productIdMap.set(sku.productId, sku);
        }

        // Break once we have 10 unique productIds
        if (productIdMap.size >= 10) {
          break;
        }
      }

      // Get the final result with unique productIds
      const result = Array.from(productIdMap.values());

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully merged SKUs`, {
        totalInputSkus: wishlistSkus.length + orderSkus.length,
        uniqueSkus: skuMap.size,
        uniqueProductIds: productIdMap.size,
        resultSkus: result.length,
      });

      return result;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to merge SKUs`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalInputSkus: wishlistSkus.length + orderSkus.length
      });

      // Return combined array in case of error
      return [...wishlistSkus, ...orderSkus];
    }
  }

  /**
   * Get Shopify product recommendations
   * @param params Request parameters
   * @param productIds Array of product IDs to get recommendations for
   * @param sourceType Optional source type to track recommendation origin
   * @returns Array of product recommendations
   */
  public async getShopifyRecommendations(
    params: IDataSourceParams,
    productIds: string[],
    sourceType: 'WISHLIST' | 'ORDER_HISTORY' | 'SUBSCRIPTION' = 'WISHLIST'
  ): Promise<any[]> {
    const METHOD = 'getShopifyRecommendations';

    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Getting Shopify recommendations`, {
        productIdsCount: productIds.length,
        storeName: params.storeName,
        sourceType
      });

      if (!productIds.length) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No product IDs provided`, {
          storeName: params.storeName
        });
        return [];
      }

      // Extract unique productIds and limit to 10
      const uniqueProductIds = [...new Set(productIds)].slice(0,30);

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Processing recommendations for products`, {
        count: uniqueProductIds.length,
        storeName: params.storeName
      });

      // Log detailed product IDs at debug level only
      if (loggerService.isLevelEnabled('debug')) {
        loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Product IDs for recommendations`, {
          // Only log first few IDs to avoid excessive logging
          productIdSamples: uniqueProductIds.slice(0, 3).map(id => id.split('/').pop())
        });
      }

      // Get recommendations using Promise.all for parallel processing
      const recommendationPromises = uniqueProductIds.map(productId =>
        shopifyProductService.getSingleProductRecommendation({
          storeDomain: params.storeName,
          companyLocationId: params.companyLocationId,
          productId,
          intent: 'RELATED'
        })
      );

      const recommendationsResults = await Promise.all(recommendationPromises);

      // Flatten recommendations and add source information
      const allRecommendations = recommendationsResults.flat().map(recommendation => ({
        ...recommendation,
        recommendationSource: sourceType, // Add source information to each recommendation
        sourceProductIds: uniqueProductIds // Add the IDs of products that led to this recommendation
      }));

      // Deduplicate recommendations
      const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations);

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved Shopify recommendations`, {
        totalRecommendations: allRecommendations.length,
        uniqueRecommendations: uniqueRecommendations.length,
        sourceType,
        storeName: params.storeName
      });

      return uniqueRecommendations;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get Shopify recommendations`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName: params.storeName,
        productIdsCount: productIds.length,
        sourceType
      });

      // Return empty array for graceful fallback
      return [];
    }
  }

  /**
   * Deduplicate recommendations by product ID
   */
  private deduplicateRecommendations(recommendations: any[]): any[] {
    const uniqueRecommendations = new Map<string, any>();

    for (const recommendation of recommendations) {
      if (!uniqueRecommendations.has(recommendation.id)) {
        uniqueRecommendations.set(recommendation.id, recommendation);
      }
    }

    return Array.from(uniqueRecommendations.values());
  }



  /**
   * Format subscription frequency based on interval unit and value
   * @param unit Interval unit (day, week, month)
   * @param value Interval value
   * @returns Formatted frequency string
   */
  private formatFrequency(unit: string, value: number): string {
    if (unit === 'day') {
      if (value === 7) return 'weekly';
      if (value === 14) return 'bi-weekly';
      return `every-${value}-days`;
    }

    if (unit === 'week') {
      if (value === 1) return 'weekly';
      if (value === 2) return 'bi-weekly';
      return `every-${value}-weeks`;
    }

    if (unit === 'month') {
      if (value === 1) return 'monthly';
      if (value === 2) return 'bi-monthly';
      if (value === 3) return 'quarterly';
      if (value === 6) return 'semi-annually';
      if (value === 12) return 'annually';
      return `every-${value}-months`;
    }

    // Default return value
    return `${value}-${unit}`;
  }

  /**
   * Get active subscriptions for a customer
   * @param params Request parameters
   * @returns Array of active subscriptions
   */
  public async getActiveSubscriptions(params: IDataSourceParams): Promise<Array<{
    sku: string;
    intervalUnit: string;
    intervalValue: number;
    status: string;
    title?: string;
    quantity: number;
    price?: {
      amount: string;
      currencyCode: string;
    };
    lastOrderDate?: Date;
  }>> {
    const METHOD = 'getActiveSubscriptions';

    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Getting active subscriptions`, {
        storeName: params.storeName
      });

      // Fetch subscription contracts from the repository
      const subscriptionContracts = await subscriptionContractRepository.fetchAll({
        storeName: params.storeName,
        companyLocationId: params.companyLocationId,
        filter: {
          status: ['active'] // Only get active subscriptions
        },
        pagination: {
          page: 1,
          pageSize: 50 // Limit to 50 subscriptions
        },
        sort: {
          field: 'nextOrderCreationDate',
          order: 'asc'
        }
      });

      if (!subscriptionContracts || !subscriptionContracts.data || subscriptionContracts.data.length === 0) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No active subscriptions found`, {
          storeName: params.storeName
        });
        return [];
      }
      const subscriptionDetails = await subscriptionContractRepository.getByIds({
        ids: subscriptionContracts.data.map(contract => Number(contract.id)),
        storeName: params.storeName
      });

      // Filter out nulls and process subscription lines
      const validSubscriptions = subscriptionDetails.filter(contract => contract !== null);
      const subscriptionItems: Array<{
        sku: string;
        intervalUnit: string;
        intervalValue: number;
        status: string;
        title?: string;
        quantity: number
        price?: {
          amount: string;
          currencyCode: string;
        };
        lastOrderDate?: Date;
      }> = [];

      // Extract subscription items from contracts
      for (const contract of validSubscriptions) {
        if (!contract || !contract.lines) continue;

        // Extract items from contract lines
        for (const line of contract.lines) {
          if (!line.sku) continue;

          // Add each product in the subscription without productId
          subscriptionItems.push({
            sku: line.sku,
            intervalUnit: contract.intervalUnit,
            intervalValue: contract.intervalValue,
            status: contract.status,
            title: `Subscription Product ${line.sku}`,
            price: {
              amount: line.price.toString(),
              currencyCode: contract.currencyCode || 'USD'
            },
            quantity: line.quantity,
            lastOrderDate: contract.nextOrderCreationDate ? new Date(contract.nextOrderCreationDate) : undefined
          });
        }
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved active subscriptions`, {
        subscriptionsCount: subscriptionItems.length,
        storeName: params.storeName
      });

      return subscriptionItems;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get active subscriptions`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName: params.storeName
      });

      // Return empty array in case of error
      return [];
    }
  }

  /**
   * Get products from catalog
   * @param params Request parameters
   * @returns Array of all SKUs from catalog for filtering
   */
  public async getCatalogProducts(params: IDataSourceParams): Promise<Set<string>> {
    const METHOD = 'getCatalogProducts';

    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieving catalog products`, {
        storeName: params.storeName,
        companyLocationId: params.companyLocationId
      });

      const response = await ShopifyClientManager.query<ICatalogsResponse>(
        GET_CATALOG_PRODUCTS_WITH_VARIANTS,
        params.storeName,
        {
          variables: {
            query: `company_location_id:${params.companyLocationId.split('/').pop()}`
          }
        }
      );

      // Create a set for unique SKUs
      const catalogSkuSet = new Set<string>();

      if (!response?.data?.catalogs?.edges) {
        return catalogSkuSet;
      }

      const catalogEdges = response.data.catalogs.edges || [];
      const validSkus = catalogEdges
        .flatMap(catalogEdge => catalogEdge.node?.publication?.products?.edges || [])
        .flatMap(productEdge => productEdge.node?.variants?.edges || [])
        .map(variantEdge => variantEdge.node.sku)
        .filter(Boolean);

      validSkus.forEach(sku => catalogSkuSet.add(sku));

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved catalog SKUs`, {
        uniqueSkusCount: catalogSkuSet.size,
        storeName: params.storeName,
      });

      return catalogSkuSet;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get catalog SKUs`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName: params.storeName
      });

      // Return empty set in case of error
      return new Set<string>();
    }
  }

  /**
   * Get order items in optimized format
   * @param params Request parameters
   * @returns Array of order items in optimized format
   */
  public async getOrderItems(params: IDataSourceParams): Promise<IOrderItem[]> {
    const METHOD = 'getOrderItems';
    const limit = params.limit || 10;

    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieving order items`, {
        storeName: params.storeName,
        limit
      });

      // Get recent order items from Shopify API
      const response = await shopifyOrderService.getRecentOrderItems({
        storeDomain: params.storeName,
        companyLocationId: params.companyLocationId
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Recent orders response`, {
        ordersCount: response.orders.length
      });

      if (!response || !response.orders || response.orders.length === 0) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No orders found or empty response`, {
          storeName: params.storeName
        });

        return [];
      }

      // Transform response to optimized format
      const orderItems: IOrderItem[] = [];
      const processedSkus = new Set<string>();

      // Process all orders from most recent to oldest
      for (const order of response.orders) {
        if (!order.items || order.items.length === 0) continue;

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Processing order`, {
          orderId: order.id,
          itemsCount: order.items.length,
          tags: order.tags
        });

        for (const item of order.items) {
          if (!item.sku || !item.product?.id) continue;

          // Skip if we already reached the limit for unique SKUs
          if (processedSkus.has(item.sku) && processedSkus.size >= limit) continue;

          // Add to processed SKUs set
          processedSkus.add(item.sku);

          // Use the order creation date if available, otherwise use current date
          const orderDate = order.createdAt
            ? new Date(order.createdAt).toISOString()
            : new Date().toISOString();

          // Determine if this is a subscription order based on order tags
          const isSubscriptionOrder =
            (order.tags && Array.isArray(order.tags) &&
            order.tags.some((tag: string) => tag.toLowerCase().includes('subscription'))) ||
            false;

          orderItems.push({
            skuId: item.sku,
            orderDate,
            quantity: item.quantity || 1,
            isSubscriptionOrder,
            productId: item.product.id
          });

          // Limit to requested number of items
          if (processedSkus.size >= limit) break;
        }

        // If we've reached the limit, stop processing more orders
        if (processedSkus.size >= limit) break;
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved order items`, {
        itemsCount: orderItems.length,
        storeName: params.storeName
      });

      return orderItems;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get order items`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName: params.storeName
      });

      return [];
    }
  }

  /**
   * Get subscription items in optimized format
   * @param params Request parameters
   * @returns Array of subscription items in optimized format
   */
  public async getSubscriptionItems(params: IDataSourceParams): Promise<ISubscriptionItem[]> {
    const METHOD = 'getSubscriptionItems';

    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieving subscription items`, {
        storeName: params.storeName
      });

      // Get active subscriptions using the existing method
      const activeSubscriptions = await this.getActiveSubscriptions(params);

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No active subscriptions found`, {
          storeName: params.storeName
        });

        return [];
      }

      // Transform to optimized format
      const subscriptionItems: ISubscriptionItem[] = [];

      for (const subscription of activeSubscriptions) {
        // Ensure subscription and required fields exist
        if (!subscription || !subscription.sku) {
          continue;
        }

        // Use the formatFrequency helper to get standardized frequency string
        const frequency = this.formatFrequency(
          subscription.intervalUnit,
          subscription.intervalValue
        );

        // Use the nextOrderCreationDate (stored in lastOrderDate field) directly
        // as the next delivery date without additional calculation
        const nextDeliveryDate = subscription.lastOrderDate
          ? subscription.lastOrderDate.toISOString()
          : new Date().toISOString();

        // Normalize status
        let status: 'active' | 'paused' | 'cancelled' = 'active';
        if (subscription.status) {
          const upperStatus = subscription.status.toUpperCase();
          if (upperStatus === 'PAUSED') status = 'paused';
          else if (upperStatus === 'CANCELLED') status = 'cancelled';
        }


        subscriptionItems.push({
          skuId: subscription.sku,
          quantity: subscription.quantity,
          frequency,
          nextDeliveryDate,
          status
        });
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved subscription items`, {
        itemsCount: subscriptionItems.length,
        storeName: params.storeName
      });

      return subscriptionItems;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get subscription items`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName: params.storeName
      });

      return [];
    }
  }

  /**
   * Get wishlist items in optimized format
   * @param params Request parameters
   * @returns Array of wishlist items in optimized format
   */
  public async getWishlistItems(params: IDataSourceParams): Promise<IWishlistItem[]> {
    const METHOD = 'getWishlistItems';
    const limit = params.limit || 10;

    try {
      // Get all shopping lists for the customer
      const shoppingLists = await shoppingListRepository.findMany({
        customerId: params.customerId,
        companyLocationId: params.companyLocationId,
        storeName: params.storeName,
        pageSize: 10, // Limit to the 10 most recent shopping lists
        sort: [{ field: 'updatedAt', order: 'desc' }]
      });

      if (!shoppingLists.lists.length) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No shopping lists found`, {
          storeName: params.storeName
        });
        return [];
      }

      // Process wishlist items
      const wishlistItems: IWishlistItem[] = [];
      const processedSkus = new Set<string>();

      // Process the most recent shopping lists
      for (const list of shoppingLists.lists) {
        const items = await shoppingListItemsRepository.findMany({
          shoppingListId: Number(list.id),
          pagination: {
            page: 1,
            pageSize: 50
          },
          sort: [{ field: 'createdAt', order: 'desc' }]
        });

        // Process items in the current shopping list
        for (const item of items.lists) {
          // Skip if we already processed this SKU
          if (processedSkus.has(item.skuId)) continue;

          wishlistItems.push({
            skuId: item.skuId,
            addedDate: item.updatedAt.toISOString(),
            productId: item.productId
          });

          processedSkus.add(item.skuId);

          // Exit early if we have collected enough unique SKUs
          if (wishlistItems.length >= limit) break;
        }

        // Exit early if we have collected enough unique SKUs
        if (wishlistItems.length >= limit) break;
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved wishlist items`, {
        itemsCount: wishlistItems.length,
        storeName: params.storeName
      });

      return wishlistItems;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get wishlist items`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName: params.storeName
      });

      return [];
    }
  }

  /**
   * Get catalog products in optimized format
   * @param params Request parameters
   * @returns Array of catalog products in optimized format
   */
  public async getCatalogProductItems(params: IDataSourceParams): Promise<IProductCatalogItem[]> {
    const METHOD = 'getCatalogProductItems';

    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieving catalog products`, {
        customerId: params.customerId,
        storeName: params.storeName
      });

      // Get catalog SKUs first using existing method
      const catalogSkus = await this.getCatalogProducts(params);

      // Transform to optimized format
      const productItems: IProductCatalogItem[] = Array.from(catalogSkus).map(sku => ({
        skuId: sku
      }));

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved catalog products`, {
        itemsCount: productItems.length,
        storeName: params.storeName
      });

      return productItems;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get catalog products`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName: params.storeName
      });

      return [];
    }
  }

  /**
   * Get product IDs by a set of SKUs with pagination handling
   * @param params Request parameters
   * @param skuSet Set of SKUs to query
   * @returns Array of product IDs
   */
  public async getProductIdsBySkuSet(
    params: IDataSourceParams,
    skuSet: Set<string>
  ): Promise<string[]> {
    const METHOD = 'getProductIdsBySkuSet';
    const PAGE_SIZE = 10; // Maximum number of SKUs per API call

    try {
      if (skuSet.size === 0) {
        return [];
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Getting product IDs for SKUs`, {
        skuCount: skuSet.size,
        storeName: params.storeName
      });

      const skuArray = Array.from(skuSet);
      const productIds: string[] = [];

      // Process SKUs in batches to handle pagination
      for (let i = 0; i < skuArray.length; i += PAGE_SIZE) {
        const skuBatch = skuArray.slice(i, i + PAGE_SIZE);

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Processing SKU batch`, {
          batchSize: skuBatch.length,
          batchNumber: Math.floor(i / PAGE_SIZE) + 1,
          totalBatches: Math.ceil(skuArray.length / PAGE_SIZE)
        });

        try {
          // Search for products using SKUs
          const searchParams = {
            storeDomain: params.storeName,
            query: skuBatch.map(sku => `sku:${sku}`).join(' OR '),
            companyLocationId: params.companyLocationId,
            first: PAGE_SIZE
          };

          const searchResults = await shopifyProductService.searchProducts(searchParams);

          if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
            // Extract product IDs from the response
            const batchProductIds = searchResults
              .filter((product) => product && typeof product === 'object' && 'id' in product)
              .map((product) => product.id as string);

            productIds.push(...batchProductIds);

            loggerService.info(`${this.CLASS_NAME}.${METHOD}: Got product IDs from batch`, {
              skuBatchSize: skuBatch.length,
              productIdsFound: batchProductIds.length
            });
          }
        } catch (batchError) {
          loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error processing SKU batch`, {
            error: batchError instanceof Error ? batchError.message : 'Unknown error',
            batchNumber: Math.floor(i / PAGE_SIZE) + 1,
            batchSize: skuBatch.length
          });
          // Continue with next batch even if current one fails
        }
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Completed getting product IDs`, {
        totalSkus: skuArray.length,
        totalProductIdsFound: productIds.length
      });

      return [...new Set(productIds)]; // Return unique product IDs
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get product IDs by SKU set`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        skuCount: skuSet.size,
        storeName: params.storeName
      });

      return [];
    }
  }
}

/**
 * Singleton instance of the data source service
 */
export const subscriptionRecommendationDataSourceService = new SubscriptionRecommendationDataSourceService();