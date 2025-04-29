import { loggerService } from '~/lib/logger';
import type { ProductVariantSearchRequest, Product, Variant } from '~/types/product-variant/product-variant-search.schema';
import type { CatalogEdge } from '~/lib/shopify/types/catalog';
import { storeCompanyMappingRepository } from '~/repositories/product-variant/store-company-mapping.repository';
import { shopifyProductService } from '~/lib/shopify/services/product';

export class ProductVariantSearchService {
  private readonly CLASS_NAME = 'ProductVariantSearchService';

  /**
   * Search for products and their variants with filtering based on company location
   * The search can handle both single and multiple queries, supporting both SKUs and customer partner numbers
   */
  public async searchProducts(params: ProductVariantSearchRequest): Promise<Product[]> {
    const METHOD = 'searchProducts';
    const start = Date.now();

    try {
      // Log start of operation
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting product search`, {
        query: params.query,
        queryLength: params.query.length,
        storeName: params.storeName,
        companyLocationId: params.companyLocationId,
        companyId: params.companyId
      });

      // 1. Get customer partner number mappings based on search queries
      const customerPartnerNumberMappings = await this.getCustomerPartnerNumberMappings(params);

      // Log mapping results
      loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Retrieved customer partner number mappings`, {
        mappingsCount: customerPartnerNumberMappings.size,
        skuIds: Array.from(customerPartnerNumberMappings.keys()),
        hasMappings: customerPartnerNumberMappings.size > 0
      });

      // 2. Build search query from the original query or mapped SKUs
      const searchQuery = await this.buildSearchQuery(params, customerPartnerNumberMappings);

      loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Built search query`, {
        originalQueries: params.query,
        resultQuery: searchQuery
      });

      // 3. Execute both product search and visibility queries in parallel
      const [searchResults, visibilityData] = await Promise.all([
        // Fetch products matching the search query
        shopifyProductService.fetchProductsByQuery({
          query: searchQuery,
          storeName: params.storeName,
          companyLocationId: params.companyLocationId,
          first: params.first || 100
        }),
        // Fetch visibility information for products
        shopifyProductService.fetchVisibleProductIds({
          storeName: params.storeName,
          companyLocationId: params.companyLocationId
        })
      ]);

      // 4. Extract visible product IDs from the results
      const visibleProductIds = this.extractVisibleProductIds(visibilityData);

      // 5. Filter products by visibility
      const visibleProducts = searchResults.filter((product: Product) => {
        const isVisible = visibleProductIds.has(product.id);
        if (!isVisible) {
          loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Product not visible`, {
            productId: product.id,
            productTitle: product.title
          });
        }
        return isVisible;
      });

      loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Filtered products by visibility`, {
        searchedProductsCount: searchResults.length,
        visibleProductsCount: visibleProducts.length,
        filteredOutCount: searchResults.length - visibleProducts.length
      });

      // 6. Build SKU query string for weight information
      const skuQueryString = this.buildSkuQueryString(visibleProducts);

      // 7. Fetch weight information if we have products
      let weightMap = new Map<string, { weight: number, weightUnit: string }>();

      if (visibleProducts.length > 0 && skuQueryString) {
        try {
          // Fetch weight information from Storefront API
          const weightResponse = await shopifyProductService.getVariantWeights({
            storeDomain: params.storeName,
            first: 250, // Use larger value to reduce pagination
            query: skuQueryString
          });

          // Create SKU to weight information mapping
          weightMap = this.createWeightMap(weightResponse);

          loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved weight information`, {
            productCount: visibleProducts.length,
            weightInfoCount: weightMap.size
          });
        } catch (error) {
          // Log error but continue processing
          loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to retrieve weight information`, {
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack
            } : 'Unknown error',
            skuQueryStringLength: skuQueryString.length
          });
        }
      }

      // 8. Enrich products with customer partner numbers and weight information
      const enrichedProducts = visibleProducts.map((product: Product) => ({
        ...product,
        variants: {
          nodes: product.variants.nodes.map((variant: Variant) => {
            const customerPartnerNumber = customerPartnerNumberMappings.get(variant.sku);
            const weightInfo = variant.sku ? weightMap.get(variant.sku) : undefined;

            // Process metafields for backward compatibility
            const processedMetafields = this.processMetafields(variant);

            return {
              ...variant,
              contextualPricing: variant.contextualPricing || null,
              customerPartnerNumber: customerPartnerNumber || null,
              weight: weightInfo ? weightInfo.weight : null,
              weightUnit: weightInfo ? weightInfo.weightUnit : null,
              ...processedMetafields
            };
          })
        }
      }));

      // Log completion
      const duration = Date.now() - start;
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Product search completed`, {
        duration,
        totalSearched: searchResults.length,
        visibleProductsCount: visibleProductIds.size,
        filteredProductsCount: enrichedProducts.length,
        mappingsApplied: customerPartnerNumberMappings.size,
        weightDataApplied: weightMap.size
      });

      // 9. Return the enriched products
      return enrichedProducts;
    } catch (error) {
      // Handle and log any errors
      const duration = Date.now() - start;
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Product search failed`, {
        error,
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        duration,
        queryParams: {
          storeName: params.storeName,
          queryLength: params.query.length,
          companyLocationId: params.companyLocationId,
          companyId: params.companyId
        }
      });
      throw error;
    }
  }

  /**
   * Get customer partner number mappings for all queries
   * Maps SKU IDs to customer partner numbers based on search input
   * @param params Search request parameters
   * @returns Map of SKU IDs to customer partner numbers
   */
  private async getCustomerPartnerNumberMappings(params: ProductVariantSearchRequest): Promise<Map<string, string>> {
    const METHOD = 'getCustomerPartnerNumberMappings';
    const mappings = new Map<string, string>();

    try {
      // For single query, use fuzzy search
      if (params.query.length === 1) {
        loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Performing fuzzy search for customer partner number`, {
          query: params.query[0],
          storeName: params.storeName,
          companyId: params.companyId
        });

        const results = await storeCompanyMappingRepository.searchByCustomerPartnerNumber({
          storeName: params.storeName,
          query: params.query[0],
          companyId: params.companyId
        });

        results.forEach(result => {
          if (result.skuId) {
            mappings.set(result.skuId, result.customerPartnerNumber);
          }
        });

        loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Fuzzy search completed`, {
          resultsCount: results.length,
          mappingsCount: mappings.size
        });
      }
      // For multiple queries, use exact match search
      else {
        loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Performing exact search for customer partner numbers`, {
          queries: params.query,
          queriesCount: params.query.length,
          storeName: params.storeName,
          companyId: params.companyId
        });

        const results = await storeCompanyMappingRepository.searchByExactCustomerPartnerNumbers({
          storeName: params.storeName,
          customerPartnerNumbers: params.query,
          companyId: params.companyId
        });

        results.forEach(result => {
          if (result.skuId) {
            mappings.set(result.skuId, result.customerPartnerNumber);
          }
        });

        loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Exact search completed`, {
          resultsCount: results.length,
          mappingsCount: mappings.size
        });
      }

      return mappings;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get customer partner number mappings`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        storeName: params.storeName,
        queryLength: params.query.length,
        companyId: params.companyId
      });

      // Return empty map in case of error to allow the search to continue
      return new Map<string, string>();
    }
  }

  /**
   * Build search query based on input parameters
   * @param params Search request parameters
   * @param mappings SKU to customer partner number mappings
   * @returns Formatted search query string
   */
  private async buildSearchQuery(
    params: ProductVariantSearchRequest,
    mappings: Map<string, string>
  ): Promise<string> {
    const METHOD = 'buildSearchQuery';

    try {
      let query: string;

      // Process based on query count
      if (params.query.length === 1) {
        query = this.processSingleQuery(params, mappings);
      } else {
        query = this.processMultipleQueries(params, mappings);
      }

      loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Built search query`, {
        originalQueryCount: params.query.length,
        mappingsCount: mappings.size,
        resultQuery: query
      });

      return query;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error building search query`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        queryCount: params.query.length
      });

      // Fall back to original query on error
      return params.query.length === 1 ? params.query[0] : params.query.join(' OR ');
    }
  }

  /**
   * Process single query case
   * @param params Search request parameters
   * @param mappings SKU to customer partner number mappings
   * @returns Formatted search query string
   */
  private processSingleQuery(
    params: ProductVariantSearchRequest,
    mappings: Map<string, string>
  ): string {
    // If we have mappings, use the SKUs instead of the original query
    if (mappings.size > 0) {
      const skus = Array.from(mappings.keys());
      return skus.join(' OR ');
    }
    // Otherwise use the original query
    return params.query[0];
  }

  /**
   * Process multiple queries case
   * @param params Search request parameters
   * @param mappings SKU to customer partner number mappings
   * @returns Formatted search query string
   */
  private processMultipleQueries(
    params: ProductVariantSearchRequest,
    mappings: Map<string, string>
  ): string {
    // If we have mappings, use the SKUs instead of the original queries
    if (mappings.size > 0) {
      const skus = Array.from(mappings.keys());
      return skus.join(' OR ');
    }
    // Otherwise join the original queries with OR
    return params.query.join(' OR ');
  }

  /**
   * Extract visible product IDs from company location data
   * @param data Company location data with catalogs
   * @returns Set of visible product IDs
   */
  private extractVisibleProductIds(data: any): Set<string> {
    const METHOD = 'extractVisibleProductIds';
    const visibleProductIds = new Set<string>();

    try {
      if (!data || !data.companyLocation || !data.companyLocation.catalogs) {
        loggerService.warn(`${this.CLASS_NAME}.${METHOD}: No catalogs found in response`, {
          hasData: !!data,
          hasCompanyLocation: data && !!data.companyLocation,
        });
        return visibleProductIds;
      }

      const catalogs = data.companyLocation.catalogs.edges || [];
      let totalProducts = 0;

      catalogs.forEach((catalog: CatalogEdge) => {
        if (!catalog.node.publication || !catalog.node.publication.products) {
          return;
        }

        const products = catalog.node.publication.products.edges || [];
        totalProducts += products.length;

        products.forEach((product: any) => {
          if (product.node && product.node.id) {
            visibleProductIds.add(product.node.id);
          }
        });
      });

      loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Processed visible products`, {
        catalogCount: catalogs.length,
        totalProductsInCatalogs: totalProducts,
        uniqueVisibleProductCount: visibleProductIds.size
      });
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error extracting visible product IDs`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });
    }

    return visibleProductIds;
  }



  /**
   * Process metafields for backward compatibility
   * @param variant Product variant to process
   * @returns Object with processed metafield and metafields values
   */
  private processMetafields(variant: Variant): any {
    const result: any = {};

    // Find custom_uom metafield for backwards compatibility
    if (variant.metafields && variant.metafields.nodes && variant.metafields.nodes.length > 0) {
      // Find custom_uom metafield in the array
      const customUomMetafield = variant.metafields.nodes.find((m: { key: string }) => m.key === 'custom_uom');

      if (customUomMetafield) {
        // Set single metafield format for backward compatibility
        result.metafield = {
          key: customUomMetafield.key,
          value: customUomMetafield.value
        };
      }

      // Process custom_original_price if present (divide by 100)
      const processedNodes = variant.metafields.nodes.map((metafield: { key: string; value: string }) => {
        if (metafield.key === 'custom_original_price' && metafield.value) {
          try {
            const numericValue = parseFloat(metafield.value);
            if (!isNaN(numericValue)) {
              return {
                ...metafield,
                value: String(numericValue / 100)
              };
            }
          } catch (error) {
            loggerService.warn('Failed to process custom_original_price', {
              value: metafield.value,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        return metafield;
      });

      // Preserve the original metafields structure with processed nodes
      result.metafields = {
        nodes: processedNodes
      };
    }

    return result;
  }

  /**
   * Build SKU query string for weight information retrieval
   * @param products List of products to extract SKUs from
   * @returns Formatted query string for Shopify API
   */
  private buildSkuQueryString(products: Product[]): string {
    const METHOD = 'buildSkuQueryString';
    const skus: string[] = [];

    try {
      // Extract all SKUs from product variants
      products.forEach(product => {
        product.variants.nodes.forEach(variant => {
          if (variant.sku) {
            skus.push(`sku:${variant.sku}`);
          }
        });
      });

      // Join SKUs with OR operator for Shopify query
      const queryString = skus.join(' OR ');

      loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Built SKU query string`, {
        productCount: products.length,
        skuCount: skus.length,
        queryStringLength: queryString.length
      });

      return queryString;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error building SKU query string`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        productCount: products.length
      });

      // Return empty string on error
      return '';
    }
  }

  /**
   * Create a map of SKUs to weight information from API response
   * @param response Weight information response from Shopify API
   * @returns Map of SKUs to weight information
   */
  private createWeightMap(response: any): Map<string, { weight: number, weightUnit: string }> {
    const METHOD = 'createWeightMap';
    const weightMap = new Map<string, { weight: number, weightUnit: string }>();

    try {
      if (!response || !response.products || !Array.isArray(response.products)) {
        loggerService.warn(`${this.CLASS_NAME}.${METHOD}: Invalid response format`, {
          hasResponse: !!response,
          hasProducts: response && !!response.products
        });
        return weightMap;
      }

      // Process each product in the response
      response.products.forEach((product: any) => {
        // Handle different response structures
        let variants = [];

        if (product.variants?.nodes && Array.isArray(product.variants.nodes)) {
          variants = product.variants.nodes;
        } else if (product.variants?.edges && Array.isArray(product.variants.edges)) {
          variants = product.variants.edges.map((edge: any) => edge.node);
        }

        // Extract weight information from each variant
        variants.forEach((variant: any) => {
          if (variant.sku && typeof variant.weight === 'number' && variant.weightUnit) {
            weightMap.set(variant.sku, {
              weight: variant.weight,
              weightUnit: variant.weightUnit
            });

            loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Mapped weight for variant`, {
              sku: variant.sku,
              weight: variant.weight,
              weightUnit: variant.weightUnit
            });
          }
        });
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Created weight map`, {
        totalMappings: weightMap.size
      });

      return weightMap;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error creating weight map`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });

      // Return empty map on error
      return new Map<string, { weight: number, weightUnit: string }>();
    }
  }
}

export const productVariantSearchService = new ProductVariantSearchService();