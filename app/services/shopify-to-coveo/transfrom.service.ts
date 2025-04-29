import { DocumentBuilder, PushSource } from '@coveo/push-api-client';
import { loggerService } from '~/lib/logger';
import { ShopifyClientManager } from '~/lib/shopify/client';
import { shopifyProductService } from '~/lib/shopify/services/product';
import { storeCompanyMappingRepository } from '~/repositories/product-variant/store-company-mapping.repository';
import { GET_PRODUCTS } from '~/request/coveo';

/**
 * Weight information with unit
 */
interface WeightInfo {
  value: number;
  unit: 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS';
}

export class TransformService {
  private readonly CLASS_NAME = 'TransformService';
  private coveoProducts: any[] = [];
  private pushSource: PushSource;

  constructor(
    private storeName: string,
    private first: number,
  ) {
    this.pushSource = new PushSource(process.env.COVEO_PUSH_RDS_API_KEY!, process.env.COVEO_ORGANIZATION_ID!);
  }

  
  /**
   * Fetch all product variant weights from Shopify API
   * @returns A map of SKUs to weight information
   */
  private async fetchVariantWeights(): Promise<Record<string, WeightInfo>> {
    const METHOD = 'fetchVariantWeights';
    const weightMap: Record<string, WeightInfo> = {};
    let hasNextPage = true;
    let endCursor: string | null = null;
    
    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting variant weight fetching`, {
        storeName: this.storeName,
      });
      
      while (hasNextPage) {
        // Fetch weights using the ProductService
        const response = await shopifyProductService.getVariantWeights({
          storeDomain: this.storeName,
          first: 50,
          after: endCursor || undefined
        });
        
        // Map variant weights by SKU for easy lookup
        for (const product of response.products) {
          // Get variants from the response structure - handle both potential structures safely
          let variants = [];
          
          // First try to get nodes directly from ProductWithVariantWeights structure
          if (product.variants?.nodes && Array.isArray(product.variants.nodes)) {
            variants = product.variants.nodes;
          } 
          // If the structure is different and has edges instead (from raw GraphQL)
          else if ((product as any).variants?.edges && Array.isArray((product as any).variants.edges)) {
            variants = (product as any).variants.edges.map((edge: any) => edge.node);
          }
          
          for (const variant of variants) {
            if (variant.sku && typeof variant.weight === 'number' && variant.weightUnit) {
              // Validate that weightUnit is one of the expected values
              const unit = this.validateWeightUnit(variant.weightUnit);
              if (unit) {
                weightMap[variant.sku] = {
                  value: variant.weight,
                  unit
                };
                
                loggerService.info(`${this.CLASS_NAME}.${METHOD}: Mapped weight for variant`, {
                  sku: variant.sku,
                  weight: variant.weight,
                  unit: variant.weightUnit
                });
              }
            }
          }
        }
        
        // Prepare for next batch if more data exists
        hasNextPage = response.pageInfo.hasNextPage || false;
        endCursor = response.pageInfo.endCursor || null;
        
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Fetched weight batch`, {
          productsCount: response.products.length,
          totalWeights: Object.keys(weightMap).length,
          hasNextPage,
          endCursor,
        });
      }
      
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully fetched weights for ${Object.keys(weightMap).length} variants`);
      return weightMap;
    } catch (error: unknown) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error fetching variant weights`, {
        storeName: this.storeName,
        error: error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : 'Unknown error',
      });
      // Return empty map if error occurs to allow process to continue
      return {};
    }
  }

  /**
   * Validate the weight unit is one of the expected values
   * @param unit The weight unit to validate
   * @returns The validated unit or null if invalid
   */
  private validateWeightUnit(unit: string): WeightInfo['unit'] | null {
    const validUnits: WeightInfo['unit'][] = ['GRAMS', 'KILOGRAMS', 'OUNCES', 'POUNDS'];
    return validUnits.includes(unit as WeightInfo['unit']) 
      ? (unit as WeightInfo['unit']) 
      : null;
  }

  public async transformProducts(): Promise<any> {
    const METHOD = 'transformProducts';
    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting products transformation`, {
        storeName: this.storeName,
      });

      // Start fetching variant weights in parallel with products
      const weightPromise = this.fetchVariantWeights();
      
      // Fetch products (existing implementation)
      let allProducts: any[] = [];
      let hasNextPage = true;
      let endCursor = null;

      while (hasNextPage) {
        const coveoProducts: any = await ShopifyClientManager.query(GET_PRODUCTS, this.storeName, {
          variables: {
            first: 50,
            after: endCursor
          },
        });

        const currentProducts = coveoProducts?.data?.products?.nodes || [];
        allProducts = [...allProducts, ...currentProducts];

        hasNextPage = coveoProducts?.data?.products?.pageInfo?.hasNextPage || false;
        endCursor = coveoProducts?.data?.products?.pageInfo?.endCursor;

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Fetched batch`, {
          count: currentProducts.length,
          total: allProducts.length,
          hasNextPage,
        });
      }

      const products = allProducts;
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Found ${products.length} products to transform`);
      
      // Wait for weight data to be available
      const variantWeightMap = await weightPromise;
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Received weight data for ${Object.keys(variantWeightMap).length} variants`);

      this.coveoProducts = [];

      for (const product of products) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Processing product`, {
          productId: product.id,
          title: product.title,
        });

        // Transform variants with weight data
        const variantRecords = product.variants.nodes?.map((variant: any) => {
          loggerService.info(`${this.CLASS_NAME}.${METHOD}: Processing variant`, {
            variantId: variant.id,
            title: variant.title,
            sku: variant.sku,
          });

          // Get weight from map using SKU as key or create default weight info
          const variantWeightInfo = variant.sku && variantWeightMap[variant.sku] 
            ? variantWeightMap[variant.sku] 
            : {
                value: variant?.weight || Math.floor(Math.random() * 46) + 5,
                unit: 'GRAMS' as const
              };
            
          const originalPrice =
            Number(variant.metafields?.nodes?.find((metafield: any) => metafield.key === 'custom_original_price')?.value) / 100 || variant.price;

          const ec_availabilities = {
            '': variant?.inventoryQuantity,
            ...Object.fromEntries(
              variant?.inventoryItem?.inventoryLevels?.edges?.map(({ node }: any) => [node?.location?.id.split('/').pop(), node?.quantities?.find(({ name }: any) => name === 'available')?.quantity]),
            ),
          }

          return {
            documentId: `product://${variant.id.split('/').pop()}`,
            ec_name: variant.title,
            title: variant.title,
            ec_product_name: product.title,
            ec_product_id: product.id.split('/').pop(),
            objecttype: 'Product',
            ec_variant_id: variant.id.split('/').pop(),
            ec_price: originalPrice,
            ec_weight: this.formatWeight(variantWeightInfo),
            ec_brand: product.vendor,
            ec_catalog_id: product.resourcePublicationsV2.nodes.map((publication: any) => `catalog_${publication.publication.catalog.id.split('/').pop()}`),
            ec_category: product?.category?.fullName?.replaceAll(' > ', ' ; ').replaceAll(' ', ''),
            ec_price_dict: {
              '': Number(variant.price),
              ...Object.fromEntries(
                product?.resourcePublicationsV2?.nodes?.map(({ publication }: any) => {
                  const catalogId = publication.catalog?.id.split('/').pop();
                  const price = (
                    publication.catalog?.priceList?.parent?.adjustment?.type?.includes('DECREASE')
                      ? ((100 - publication.catalog?.priceList?.parent?.adjustment?.value) / 100) * originalPrice
                      : ((100 + publication.catalog?.priceList?.parent?.adjustment?.value) / 100) * originalPrice
                  ).toFixed(2);

                  loggerService.info(`${this.CLASS_NAME}.${METHOD}: Calculated catalog price`, {
                    catalogId,
                    originalPrice: variant.price,
                    calculatedPrice: price,
                  });

                  return [catalogId, Number(price)];
                }),
              ),
            },
            ec_sku: variant.sku,
            ec_uom: variant.metafields?.nodes?.find((metafield: any) => metafield.key === 'custom_uom')?.value,
            ec_color: variant.metafields?.nodes?.find((metafield: any) => metafield.key === 'color')?.value,
            ec_material: (() => {
              const materialValue = variant.metafields?.nodes?.find((metafield: any) => metafield.key === 'material')?.value;
              if (!materialValue) return undefined;
              try {
                return JSON.parse(materialValue)?.primaryMaterial?.name;
              } catch {
                return undefined;
              }
            })(),
            ec_barcode: variant.barcode,
            ec_availabilities,
            ec_pdp_url: product.handle,
            ec_item_id: variant.id.split('/').pop(),
            ec_parent_item_id: product.id.split('/').pop(),
            ec_images: product.images.nodes.map((image: any) => image.url),
            ec_size: product.options.find((option: any) => option.name === 'Size') ? variant.title : undefined,
            availablelocations: Object.entries(ec_availabilities)
              .filter(([key]) => key !== '' && !isNaN(Number(key)))
              .map(([key]) => key)
              .join(';'),
          };
        });

        this.coveoProducts.push(...variantRecords);
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully transformed ${this.coveoProducts.length} records`, {
        productsCount: products.length,
        totalRecordsCount: this.coveoProducts.length,
      });

      return this.coveoProducts;
    } catch (error: unknown) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error transforming products`, {
        storeName: this.storeName,
        first: this.first,
        error:
          error instanceof Error
            ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
            : 'Unknown error',
      });
      throw error;
    }
  }

  public async pushProductsToCoveo() {
    await this.transformProducts();
    const METHOD = 'pushProductsToCoveo';

    const allProductSkus = this.coveoProducts.filter((item) => item.objecttype === 'Product').map((item) => item.ec_sku);
    const companyMappingList = await storeCompanyMappingRepository.findCompanyMappingsBySkuIds({
      storeName: this.storeName,
      skuIds: allProductSkus,
    });

    this.coveoProducts.forEach((product) => {
      const mapping = companyMappingList.filter((m) => m.skuId === product.ec_sku);
      if (mapping.length) {
        product.ec_customer_part_number_dict = {
          '': '',
          ...Object.fromEntries(mapping.map((m) => [m.companyId, m.customerPartnerNumber])),
        };
      }
    });

    try {
      const documents: any = this.coveoProducts.map((product) => {
        const metaData = { ...product };
        delete metaData.documentId;
        return new DocumentBuilder(product.documentId, product.title).withMetadata(metaData);
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting batch update`, {
        documentsCount: documents.length,
      });

      await this.pushSource.batchUpdateDocuments(process.env.COVEO_PUSH_SOURCE_ID!, {
        addOrUpdate: documents,
        delete: [],
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully pushed all documents`);
    } catch (error: unknown) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error in batch update`, {
        error:
          error instanceof Error
            ? {
              message: error.message,
              code: (error as any).code,
              syscall: (error as any).syscall,
              hostname: (error as any).hostname,
            }
            : 'Unknown error',
      });
      throw error;
    }
  }

  public async deleteAllProducts() {
    await this.transformProducts();
    const METHOD = 'deleteAllProducts';
    try {
      await this.pushSource.batchUpdateDocuments(process.env.COVEO_PUSH_SOURCE_ID!, {
        addOrUpdate: [],
        delete: this.coveoProducts.map((document: any) => ({
          documentId: document.documentId,
          deleteChildren: true,
        })),
      });
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully deleted all products`);
    } catch (error: unknown) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error in delete operation`, {
        error:
          error instanceof Error
            ? {
              message: error.message,
              code: (error as any).code,
              syscall: (error as any).syscall,
              hostname: (error as any).hostname,
            }
            : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Convert weight to all standard units
   * @param weightInfo Weight information with value and unit
   * @returns Formatted string with all weight units
   */
  private formatWeight(weightInfo: WeightInfo): string {
    // Convert to all standard units based on the source unit
    switch (weightInfo.unit) {
      case 'GRAMS': {
        const grams = weightInfo.value;
        const kg = grams / 1000;
        const lb = grams * 0.00220462;
        const oz = grams * 0.03527396;
        return this.formatWeightUnits(kg, grams, lb, oz);
      }
      case 'KILOGRAMS': {
        const kg = weightInfo.value;
        const grams = kg * 1000;
        const lb = kg * 2.20462;
        const oz = kg * 35.274;
        return this.formatWeightUnits(kg, grams, lb, oz);
      }
      case 'POUNDS': {
        const lb = weightInfo.value;
        const kg = lb * 0.453592;
        const grams = kg * 1000;
        const oz = lb * 16;
        return this.formatWeightUnits(kg, grams, lb, oz);
      }
      case 'OUNCES': {
        const oz = weightInfo.value;
        const lb = oz / 16;
        const kg = oz * 0.0283495;
        const grams = kg * 1000;
        return this.formatWeightUnits(kg, grams, lb, oz);
      }
      default:
        // Fallback to generate random weight if unit is not recognized
        const randomKg = Math.floor(Math.random() * 46) + 5;
        return this.generateWeightUnits(randomKg).join(' ');
    }
  }

  /**
   * Format weight units into string format
   */
  private formatWeightUnits(kg: number, g: number, lb: number, oz: number): string {
    return [
      `"${kg.toFixed(2)} kg"`,
      `"${g.toFixed(0)} g"`,
      `"${lb.toFixed(2)} lb"`,
      `"${oz.toFixed(2)} oz"`
    ].join(' ');
  }

  /**
   * @deprecated Use formatWeight with WeightInfo instead
   */
  private generateWeightUnits(kg: number): string[] {
    return [
      `"${kg} kg"`,
      `"${kg * 1000} g"`,
      `"${(kg * 2.20462).toFixed(2)} lb"`,
      `"${(kg * 35.274).toFixed(2)} oz"`
    ];
  }
}
