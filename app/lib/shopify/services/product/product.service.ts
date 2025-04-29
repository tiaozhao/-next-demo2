import { loggerService } from '~/lib/logger';
import { ShopifyClientManager } from '~/lib/shopify/client';
import { trace, SpanStatusCode } from "@opentelemetry/api";
import {
  GET_PRODUCTS_BY_SKUS,
  GET_SINGLE_PRODUCT_RECOMMENDATION,
  GET_VARIANT_WEIGHT,
  SEARCH_PRODUCTS,
  GET_COMPANY_LOCATION_VISIBLE_PRODUCTS,
  GET_PRODUCTS_BY_SKU_SET
} from './product.graphql';
import { handleGraphQLErrors } from './product.utils';
import type {
  IProduct,
  IProductRecommendation,
  ProductRequest,
  ProductVariantWeightParams,
  IProductVariantWeightResponse,
  ProductsBySkuSetRequest,
  IProductsBySkuSetResponse
} from './product.types';


/**
 * Service for product-related operations
 */
export class ShopifyProductService {
  private readonly CLASS_NAME = 'ProductService';
  private readonly tracer = trace.getTracer('product-service');


    /**
   * Get recommendations for a single product
   * @param params Request parameters
   * @returns List of recommended products
   */
    public async getSingleProductRecommendation(params: {
        storeDomain: string;
        productId: string;
        companyLocationId: string;
        intent: 'COMPLEMENTARY' | 'RELATED';
        productHandle?: string;
      }): Promise<IProductRecommendation[]> {
        return this.tracer.startActiveSpan('shopify.product.getSingleProductRecommendation', async (span) => {
          const METHOD = 'getSingleProductRecommendation';
          const start = Date.now();

          try {
            span.setAttribute('store.domain', params.storeDomain);
            span.setAttribute('product.id', params.productId);
            span.setAttribute('company_location.id', params.companyLocationId);

            loggerService.info(`${this.CLASS_NAME}.${METHOD}: Fetching single product recommendations`, {
              storeDomain: params.storeDomain,
              productId: params.productId,
              companyLocationId: params.companyLocationId,
              intent: params.intent
            });


            const storefrontClient = await ShopifyClientManager.getStorefrontClient(params.storeDomain);

            const response = await storefrontClient.request(
              GET_SINGLE_PRODUCT_RECOMMENDATION,
              {
                variables: {
                  productId: params.productId,
                  companyLocationId: params.companyLocationId,
                  intent: params.intent,
                  productHandle: params.productHandle
                }
              }
            );

            loggerService.info(`${this.CLASS_NAME}.${METHOD}: Single product recommendations response`, {
              response
            });

            if (response?.errors) {
              handleGraphQLErrors(response.errors, this.CLASS_NAME);
            }

            const recommendations = response.data?.productRecommendations || [];

            loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved single product recommendations`, {
              storeDomain: params.storeDomain,
              productId: params.productId,
              recommendationCount: recommendations.length,
              duration: Date.now() - start
            });

            span.setStatus({ code: SpanStatusCode.OK });
            return recommendations;

          } catch (error) {
            loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get single product recommendations`, {
              error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
              } : 'Unknown error',
              params,
              duration: Date.now() - start
            });
            throw error;
          }
        });
      }



      /**
   * Get products by query
   * @param params Request parameters with query
   * @returns List of products matching the query
   */
  public async searchProducts(params: ProductRequest): Promise<IProduct[]> {
    return this.tracer.startActiveSpan('shopify.product.searchProducts', async (span) => {
      const METHOD = 'searchProducts';
      const start = Date.now();

      try {
        if (!params.query) {
          throw new Error('Search query is required');
        }

        span.setAttribute('store.domain', params.storeDomain);
        span.setAttribute('search.query', params.query);
        if (params.companyLocationId) {
          span.setAttribute('company_location.id', params.companyLocationId);
        }

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Searching products`, {
          storeDomain: params.storeDomain,
          query: params.query,
          companyLocationId: params.companyLocationId
        });

        const response = await ShopifyClientManager.query(
          GET_PRODUCTS_BY_SKUS,  // We can reuse this query for general search
          params.storeDomain,
          {
            variables: {
              query: params.query,
              first: params.first || 20,
              companyLocationId: params.companyLocationId
            }
          }
        );

        if (response.errors) {
            handleGraphQLErrors(response.errors, this.CLASS_NAME);
        }

        if (!response?.data?.products?.nodes) {
          loggerService.warn(`${this.CLASS_NAME}.${METHOD}: No products found for the search query`, {
            storeDomain: params.storeDomain,
            query: params.query
          });
          return [];
        }

        const products = response.data.products.nodes;

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute('products.count', products.length);

        const duration = Date.now() - start;
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Products search completed successfully`, {
          storeDomain: params.storeDomain,
          query: params.query,
          productsFound: products.length,
          duration
        });

        return products;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        span.recordException(error as Error);

        const duration = Date.now() - start;
        loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to search products`, {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : 'Unknown error',
          storeDomain: params.storeDomain,
          query: params.query,
          duration
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get products by SKU set
   * @param params Request parameters with skuSet
   * @returns Products and page information
   */
  public async getProductsBySkuSet(params: ProductsBySkuSetRequest): Promise<IProductsBySkuSetResponse> {
    return this.tracer.startActiveSpan('shopify.product.getProductsBySkuSet', async (span) => {
      const METHOD = 'getProductsBySkuSet';
      const start = Date.now();

      try {
        if (!params.skuSet || params.skuSet.length === 0) {
          throw new Error('SKU set is required and cannot be empty');
        }

        span.setAttribute('store.domain', params.storeDomain);
        span.setAttribute('sku_set.count', params.skuSet.length);
        if (params.after) {
          span.setAttribute('pagination.after', params.after);
        }

        // Build the query string from the SKU set
        const queryString = params.skuSet.map((sku: string) => `sku:${sku}`).join(' OR ');

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Fetching products by SKU set`, {
          storeDomain: params.storeDomain,
          skuCount: params.skuSet.length,
          first: params.first || 50,
          after: params.after
        });

        const client = await ShopifyClientManager.getClient(params.storeDomain);

        const response = await client.request(GET_PRODUCTS_BY_SKU_SET, {
          variables: {
            query: queryString,
            first: params.first || 50,
            after: params.after
          }
        });

        if (response.errors) {
          handleGraphQLErrors(response.errors, this.CLASS_NAME);
        }

        if (!response?.data?.products?.edges) {
          loggerService.warn(`${this.CLASS_NAME}.${METHOD}: No products found for the provided SKUs`, {
            storeDomain: params.storeDomain,
            skuCount: params.skuSet.length
          });
          return {
            products: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false
            }
          };
        }

        const products = response.data.products.edges;
        const pageInfo = response.data.products.pageInfo;

        span.setAttribute('products.count', products.length);
        span.setAttribute('products.has_next_page', pageInfo.hasNextPage);
        span.setStatus({ code: SpanStatusCode.OK });

        const duration = Date.now() - start;
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Products by SKU set fetched successfully`, {
          storeDomain: params.storeDomain,
          skuCount: params.skuSet.length,
          productsCount: products.length,
          hasNextPage: pageInfo.hasNextPage,
          duration
        });

        return {
          products,
          pageInfo
        };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        span.recordException(error as Error);

        const duration = Date.now() - start;
        loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to fetch products by SKU set`, {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : 'Unknown error',
          storeDomain: params.storeDomain,
          skuCount: params.skuSet ? params.skuSet.length : 0,
          duration
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get product variants weight information
   * @param params Request parameters
   * @returns List of products with variant weight information
   */
  public async getVariantWeights(params: ProductVariantWeightParams): Promise<IProductVariantWeightResponse> {
    return this.tracer.startActiveSpan('shopify.product.getVariantWeights', async (span) => {
      const METHOD = 'getVariantWeights';
      const start = Date.now();

      try {
        span.setAttribute('store.domain', params.storeDomain);
        if (params.after) span.setAttribute('pagination.after', params.after);
        if (params.query) span.setAttribute('search.query', params.query);

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Fetching product variant weights`, {
          storeDomain: params.storeDomain,
          first: params.first || 50,
          after: params.after,
          query: params.query
        });

        const client = await ShopifyClientManager.getStorefrontClient(params.storeDomain);

        // Build variables object with optional query parameter
        const variables: any = {
          first: params.first || 50,
          after: params.after
        };

        // Add query parameter if provided
        if (params.query) {
          variables.query = params.query;
        }

        const response = await client.request(GET_VARIANT_WEIGHT, {
          variables
        });

        if (response.errors) {
          handleGraphQLErrors(response.errors, this.CLASS_NAME);
        }

        if (!response?.data?.products?.edges) {
          loggerService.warn(`${this.CLASS_NAME}.${METHOD}: No products found`, {
            storeDomain: params.storeDomain
          });
          return {
            products: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false
            }
          };
        }

        const products = response.data.products.edges.map((edge: any) => edge.node);
        const pageInfo = response.data.products.pageInfo;

        span.setAttribute('products.count', products.length);
        span.setAttribute('products.has_next_page', pageInfo.hasNextPage);
        span.setStatus({ code: SpanStatusCode.OK });

        const duration = Date.now() - start;
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Product variant weights fetched successfully`, {
          storeDomain: params.storeDomain,
          productsCount: products.length,
          hasNextPage: pageInfo.hasNextPage,
          duration
        });

        return {
          products,
          pageInfo
        };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        span.recordException(error as Error);

        const duration = Date.now() - start;
        loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to fetch product variant weights`, {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : 'Unknown error',
          storeDomain: params.storeDomain,
          duration
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Fetch products by search query
   * @param params Search parameters including query, store name, and company location ID
   * @returns List of products matching the search criteria
   */
  public async fetchProductsByQuery(params: {
    query: string;
    storeName: string;
    companyLocationId: string;
    first?: number;
  }): Promise<any> {
    return this.tracer.startActiveSpan('shopify.product.fetchProductsByQuery', async (span) => {
      const METHOD = 'fetchProductsByQuery';
      const start = Date.now();

      try {
        span.setAttribute('store.domain', params.storeName);
        span.setAttribute('company_location.id', params.companyLocationId);
        span.setAttribute('search.query', params.query);

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Fetching products by query`, {
          storeName: params.storeName,
          query: params.query,
          companyLocationId: params.companyLocationId,
          first: params.first || 100
        });

        const response = await ShopifyClientManager.query(
          SEARCH_PRODUCTS,
          params.storeName,
          {
            variables: {
              query: params.query,
              companyLocationId: params.companyLocationId,
              first: params.first || 100
            }
          }
        );

        if (response.errors) {
          handleGraphQLErrors(response.errors, this.CLASS_NAME);
        }

        const products = response.data?.products?.nodes || [];

        span.setAttribute('products.count', products.length);
        span.setStatus({ code: SpanStatusCode.OK });

        const duration = Date.now() - start;
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Products fetched successfully`, {
          storeName: params.storeName,
          query: params.query,
          productsCount: products.length,
          duration
        });

        return products;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        span.recordException(error as Error);

        const duration = Date.now() - start;
        loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to fetch products by query`, {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          storeName: params.storeName,
          query: params.query,
          duration
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Fetch visible product IDs for a company location
   * @param params Parameters containing store name and company location ID
   * @returns Response data containing company location catalogs and visible products
   */
  public async fetchVisibleProductIds(params: {
    storeName: string;
    companyLocationId: string;
  }): Promise<any> {
    return this.tracer.startActiveSpan('shopify.product.fetchVisibleProductIds', async (span) => {
      const METHOD = 'fetchVisibleProductIds';
      const start = Date.now();

      try {
        span.setAttribute('store.domain', params.storeName);
        span.setAttribute('company_location.id', params.companyLocationId);

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Fetching visible product IDs`, {
          storeName: params.storeName,
          companyLocationId: params.companyLocationId
        });

        const response = await ShopifyClientManager.query(
          GET_COMPANY_LOCATION_VISIBLE_PRODUCTS,
          params.storeName,
          { variables: { companyLocationId: params.companyLocationId } }
        );

        if (response.errors) {
          handleGraphQLErrors(response.errors, this.CLASS_NAME);
        }

        const catalogs = response.data?.companyLocation?.catalogs?.edges || [];
        let visibleProductCount = 0;

        catalogs.forEach((catalog: any) => {
          const products = catalog.node.publication?.products?.edges || [];
          visibleProductCount += products.length;
        });

        span.setAttribute('catalogs.count', catalogs.length);
        span.setAttribute('visible_products.count', visibleProductCount);
        span.setStatus({ code: SpanStatusCode.OK });

        const duration = Date.now() - start;
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Visible product IDs fetched successfully`, {
          storeName: params.storeName,
          companyLocationId: params.companyLocationId,
          catalogCount: catalogs.length,
          visibleProductCount,
          duration
        });

        return response.data;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        span.recordException(error as Error);

        const duration = Date.now() - start;
        loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to fetch visible product IDs`, {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          storeName: params.storeName,
          companyLocationId: params.companyLocationId,
          duration
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }
}
