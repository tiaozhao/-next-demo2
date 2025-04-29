import {
  type CreateSellingPlanRequest,
  type CreateSellingPlanResponse,
  type FetchSellingPlansRequest,
  type FetchSellingPlansResponse,
  type SellingPlanWithLines,
  type GetSellingPlanByIdRequest,
  type CompanyLocationData,
  type UpdateSellingPlanRequest,
  type UpdateSellingPlanResponse,
  type DeleteSellingPlanRequest,
  type DeleteSellingPlanResponse,
  type ProductInfo,
  type LineType,
  type PolicyType,
  type DataChangesParams,
  type DataChangesResult,
  type IntervalUnit,
  type DiscountType
} from '~/types/selling-plans/selling-plan.schema';
import { sellingPlanRepository } from '~/repositories/selling-plans/selling-plan.repository';
import { loggerService } from '~/lib/logger';
import { ShopifyClientManager } from '~/lib/shopify/client';
import { SEARCH_PRODUCTS } from '~/lib/shopify/queries/product-variant';
import { GET_COMPANY_LOCATION_WITH_COMPANY } from '~/lib/shopify/queries/company-location';
import { BATCG_GET_COMPANYLOCATIONS } from '~/lib/shopify/queries/batch';
import { storeCompanyMappingRepository } from '~/repositories/product-variant/store-company-mapping.repository';
import { SellingPlanError } from '~/lib/errors/selling-plan-errors';
import getSymbolFromCurrency from 'currency-symbol-map';
import { sellingPlanDeliveryPolicyRepository } from '~/repositories/selling-plans/selling-plan-delivery-policy.repository';
import { sellingPlanLineRepository } from '~/repositories/selling-plans/selling-plan-line.repository';

export class SellingPlanService {
  private readonly repository = sellingPlanRepository;
  private readonly lineRepository = sellingPlanLineRepository;
  private readonly policyRepository = sellingPlanDeliveryPolicyRepository;

  /**
   * Create a new selling plan with items and delivery policies
   */
  public async createSellingPlan(params: CreateSellingPlanRequest): Promise<CreateSellingPlanResponse> {
    const start = Date.now();

    loggerService.info('Starting selling plan creation', {
      name: params.name,
      storeName: params.storeName,
      isB2B: !!params.companyLocationId
    });

    try {
      // Use repository method to create selling plan with items and policies
      const result = await this.repository.createWithLinesAndPolicies({
        plan: {
          name: params.name,
          description: params.description,
          currencyCode: params.currencyCode,
          storeName: params.storeName,
          createdById: params.createdById,
          companyLocationId: params.companyLocationId
        },
        lines: params.lines,
        deliveryPolicies: params.deliveryPolicies
      });

      // Format response data
      const { sellingPlan, sellingPlanLines, deliveryPolicies } = result;

      const response = {
        id: Number(sellingPlan.id),
        name: sellingPlan.name,
        description: sellingPlan.description || '',
        currencyCode: sellingPlan.currencyCode,
        lines: sellingPlanLines.map(line => ({
          id: Number(line.id),
          variantId: line.variantId,
          sku: line.sku,
          quantity: line.quantity
        })),
        deliveryPolicies: deliveryPolicies.map(policy => ({
          id: Number(policy.id),
          offerDiscount: policy.offerDiscount,
          intervalValue: policy.intervalValue,
          intervalUnit: policy.intervalUnit as IntervalUnit,
          discountType: policy.discountType as DiscountType | undefined,
          discountValue: policy.discountValue || undefined,
          deliveryAnchor: policy.deliveryAnchor || undefined
        })),
        createdById: sellingPlan.createdById || undefined,
        companyLocationId: sellingPlan.companyLocationId === null ? undefined : sellingPlan.companyLocationId,
        createdAt: sellingPlan.createdAt.toISOString(),
        updatedAt: sellingPlan.updatedAt.toISOString()
      };

      const duration = Date.now() - start;
      loggerService.info('Selling plan created successfully', {
        id: response.id,
        name: response.name,
        lineCount: response.lines.length,
        policyCount: response.deliveryPolicies.length,
        duration
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      loggerService.error('Error creating selling plan', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        params,
        duration
      });
      throw error;
    }
  }

  /**
   * Delete a selling plan (soft delete)
   */
  public async deleteSellingPlan(params: DeleteSellingPlanRequest): Promise<DeleteSellingPlanResponse> {
    const start = Date.now();

    loggerService.info('Deleting selling plan', {
      id: params.id,
      storeName: params.storeName,
      deletedById: params.customerId
    });

    try {
      const result = await this.repository.softDelete(BigInt(params.id), params.storeName, params.customerId);

      const response: DeleteSellingPlanResponse = {
        success: result,
        message: result ? 'Selling plan deleted successfully' : 'Selling plan not found or already deleted'
      };

      const duration = Date.now() - start;
      loggerService.info('Selling plan deletion completed', {
        id: params.id,
        storeName: params.storeName,
        deletedById: params.customerId,
        success: result,
        duration
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      loggerService.error('Error deleting selling plan', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        id: params.id,
        storeName: params.storeName,
        deletedById: params.customerId,
        duration
      });
      throw error;
    }
  }

  /**
   * Fetch selling plans with pagination, sorting and filtering
   */
  public async fetchSellingPlans(params: FetchSellingPlansRequest): Promise<FetchSellingPlansResponse> {
    const start = Date.now();

    loggerService.info('Fetching selling plans', {
      storeName: params.storeName,
      customerId: params.customerId,
      page: params.pagination?.page || 1,
      pageSize: params.pagination?.pageSize || 10,
      sortCount: params.sort?.length || 0,
      hasFilters: !!params.filters
    });

    try {
      // Convert sort parameters to repository format
      const sort = params.sort?.map(item => ({
        field: item.field,
        order: item.direction
      }));

      // Prepare date filters if they exist
      const dateFilters: Record<string, Date> = {};
      if (params.filters?.createdFrom) {
        dateFilters.createdFrom = params.filters.createdFrom;
      }
      if (params.filters?.createdTo) {
        dateFilters.createdTo = params.filters.createdTo;
      }

      // Fetch selling plans using repository
      const result = await this.repository.findMany({
        storeName: params.storeName,
        customerId: params.customerId,
        page: params.pagination?.page,
        pageSize: params.pagination?.pageSize,
        sort,
        filters: {
          name: params.filters?.name,
          companyLocationId: params.filters?.companyLocationId,
          createdById: params.filters?.createdById,
          ...dateFilters
        }
      });

      // Collect all non-null companyLocationIds
      const companyLocationIds = result.plans
        .map(plan => plan.companyLocationId)
        .filter(id => id !== null && id !== undefined) as string[];

      // Create a map to store companyLocation information
      let companyLocationMap: Record<string, { id: string; name: string; externalId: string | null }> = {};

      // Fetch company location details if there are any companyLocationIds
      if (companyLocationIds.length > 0) {
        // Use Set to remove duplicates
        const uniqueIds = [...new Set(companyLocationIds)];

        try {
          loggerService.info('Fetching company location details', {
            locationIds: uniqueIds,
            count: uniqueIds.length
          });

          // Batch query company locations
          const locationsResponse = await ShopifyClientManager.query(
            BATCG_GET_COMPANYLOCATIONS,
            params.storeName,
            {
              variables: {
                companyLocationIds: uniqueIds
              }
            }
          );

          // Process response and build the map
          if (locationsResponse?.data?.nodes) {
            const locations = locationsResponse.data.nodes;
            locations.forEach((location: any) => {
              if (location) {
                companyLocationMap[location.id] = {
                  id: location.id,
                  name: location.name,
                  externalId: location.externalId || null
                };
              }
            });

            loggerService.info('Successfully fetched company location details', {
              count: Object.keys(companyLocationMap).length
            });
          }
        } catch (error) {
          loggerService.error('Error fetching company location details', {
            error: error instanceof Error ? error.message : 'Unknown error',
            locationIds: uniqueIds
          });
          // Continue processing even if company location fetch fails
        }
      }

      // Get additional details for each plan
      const enhancedPlans = await Promise.all(
        result.plans.map(async (plan: any) => {
          // Get line count and delivery policy count
          const [lines, policies] = await Promise.all([
            this.lineRepository.count({
              where: {
                sellingPlanId: plan.id
              }
            }),
            this.policyRepository.findMany({
              where: {
                sellingPlanId: plan.id
              }
            })
          ]);

          // Calculate pricing information from policies
          const { discountDisplay, pricing } = this.calculatePricingInfo(policies, plan.currencyCode);

          // Format delivery policies to match the expected response format
          const formattedPolicies = policies.map(policy => ({
            id: Number(policy.id),
            offerDiscount: policy.offerDiscount,
            intervalValue: policy.intervalValue,
            intervalUnit: policy.intervalUnit as IntervalUnit,
            discountType: policy.discountType as DiscountType | undefined,
            discountValue: policy.discountValue || undefined,
            deliveryAnchor: policy.deliveryAnchor || undefined
          }));

          // Get company location information if available
          const companyLocation = plan.companyLocationId && companyLocationMap[plan.companyLocationId]
            ? {
                id: companyLocationMap[plan.companyLocationId].id,
                name: companyLocationMap[plan.companyLocationId].name,
                externalId: companyLocationMap[plan.companyLocationId].externalId
              }
            : null;

          return {
            id: Number(plan.id),
            name: plan.name,
            description: plan.description || undefined,
            currencyCode: plan.currencyCode,
            lineCount: lines,
            frequencyCount: policies.length, // Keep the existing count for backward compatibility
            deliveryPolicies: formattedPolicies, // Add the formatted policy details
            discountDisplay,
            pricing,
            createdById: plan.createdById || undefined,
            // Keep companyLocationId for backward compatibility
            companyLocationId: plan.companyLocationId || null,
            companyLocation, // Add company location details
            createdAt: plan.createdAt.toISOString(),
            updatedAt: plan.updatedAt.toISOString()
          };
        })
      );

      // Format the response
      const response: FetchSellingPlansResponse = {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        sellingPlans: enhancedPlans
      };

      const duration = Date.now() - start;
      loggerService.info('Selling plans fetched successfully', {
        plansCount: response.sellingPlans.length,
        totalCount: response.totalCount,
        page: response.page,
        pageSize: response.pageSize,
        totalPoliciesCount: enhancedPlans.reduce((acc, plan) => acc + plan.deliveryPolicies.length, 0),
        locationCount: Object.keys(companyLocationMap).length,
        duration
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      loggerService.error('Error fetching selling plans', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        params,
        duration
      });
      throw error;
    }
  }

  /**
   * Calculate pricing information based on delivery policies
   */
  private calculatePricingInfo(
    policies: Array<{
      offerDiscount: boolean;
      discountType?: string | null;
      discountValue?: number | null;
      [key: string]: any;
    }>,
    currencyCode: string
  ): { discountDisplay: string; pricing: string | undefined } {
    // Initialize default result
    const result = {
      discountDisplay: 'No discount',
      pricing: undefined as string | undefined
    };

    // Filter policies that offer discounts
    const discountPolicies = policies.filter(policy =>
      policy.offerDiscount &&
      policy.discountType &&
      policy.discountValue !== null &&
      policy.discountValue !== undefined
    );

    // Return default if no discount policies found
    if (discountPolicies.length === 0) {
      return result;
    }

    // Get discount values and sort them
    const discountValues = discountPolicies.map(policy => policy.discountValue as number).sort((a, b) => a - b);
    const uniqueValues = [...new Set(discountValues)];

    // Skip if no unique values (this shouldn't happen logically, but defensive coding)
    if (uniqueValues.length === 0) {
      return result;
    }

    // Get discount type and currency symbol
    const type = discountPolicies[0].discountType as string;
    const currencySymbol = getSymbolFromCurrency(currencyCode) || currencyCode;

    // Format based on discount type and number of values
    if (type === 'percentage') {
      // Percentage discount formatting
      if (uniqueValues.length === 1) {
        const value = uniqueValues[0];
        result.discountDisplay = `${value}% off`;
        result.pricing = `${value}% off`;
      } else {
        const min = uniqueValues[0];
        const max = uniqueValues[uniqueValues.length - 1];
        result.discountDisplay = `${min}-${max}% off`;
        result.pricing = `${min}-${max}% off`;
      }
    } else if (type === 'fixed_amount') {
      // Fixed amount discount formatting
      if (uniqueValues.length === 1) {
        const value = uniqueValues[0];
        result.discountDisplay = `${currencySymbol}${value.toFixed(2)} off`;
        result.pricing = `${value.toFixed(2)} ${currencyCode} off`;
      } else {
        const min = uniqueValues[0];
        const max = uniqueValues[uniqueValues.length - 1];
        result.discountDisplay = `${currencySymbol}${min.toFixed(2)}-${currencySymbol}${max.toFixed(2)} off`;
        result.pricing = `${min.toFixed(2)}-${max.toFixed(2)} ${currencyCode} off`;
      }
    } else if (type === 'fixed_price') {
      // Fixed price formatting
      if (uniqueValues.length === 1) {
        const value = uniqueValues[0];
        result.discountDisplay = `${currencySymbol}${value.toFixed(2)}`;
        result.pricing = `${value.toFixed(2)} ${currencyCode}`;
      } else {
        const min = uniqueValues[0];
        const max = uniqueValues[uniqueValues.length - 1];
        result.discountDisplay = `${currencySymbol}${min.toFixed(2)}-${currencySymbol}${max.toFixed(2)}`;
        result.pricing = `${min.toFixed(2)}-${max.toFixed(2)} ${currencyCode}`;
      }
    }

    return result;
  }

  /**
   * Get selling plan by ID with complete details
   */
  public async getSellingPlanById(params: GetSellingPlanByIdRequest): Promise<SellingPlanWithLines | null> {
    const start = Date.now();

    loggerService.info('Getting selling plan by ID', {
      id: params.id,
      storeName: params.storeName,
      customerId: params.customerId
    });

    try {
      const result = await this.repository.getById({
        id: params.id,
        storeName: params.storeName
      });

      if (!result) {
        loggerService.warn('Selling plan not found', {
          id: params.id,
          storeName: params.storeName
        });
        return null;
      }

      const { sellingPlan, sellingPlanLines, deliveryPolicies } = result;

      // Extract all SKUs from sellingPlanLines to query Shopify
      const skus = sellingPlanLines.map(line => line.sku);
      let skuQuery = '';

      // Only build SKU query if we have SKUs
      if (skus.length > 0) {
        skuQuery = skus.map(sku => `sku:${sku}`).join(' OR ');
      }

      // Get company location ID if available for B2B plans
      const companyLocationId = sellingPlan.companyLocationId;

      // Default empty values
      let enhancedLines: ProductInfo[] = [];
      let companyLocationData: CompanyLocationData | null = null;

      // Build query promises array for parallel execution
      const queryPromises: Promise<any>[] = [];

      // 1. Add product data query if we have SKUs
      if (skus.length > 0) {
        queryPromises.push(
          ShopifyClientManager.query(SEARCH_PRODUCTS, params.storeName, {
            variables: {
              query: skuQuery,
              companyLocationId: companyLocationId
            }
          })
        );
      } else {
        queryPromises.push(Promise.resolve(null));
      }

      // 2. Add customer partner numbers query if we have company location and SKUs
      if (companyLocationId && skus.length > 0) {
        queryPromises.push(
          this.getCustomerPartnerNumbersForSkus(
            params.storeName,
            companyLocationId,
            skus
          )
        );
      } else {
        queryPromises.push(Promise.resolve(new Map()));
      }

      // 3. Add company location query if we have company location ID
      if (companyLocationId) {
        queryPromises.push(
          ShopifyClientManager.query(
            GET_COMPANY_LOCATION_WITH_COMPANY,
            params.storeName,
            {
              variables: {
                companyLocationId: companyLocationId
              }
            }
          )
        );
      } else {
        queryPromises.push(Promise.resolve(null));
      }

      // Execute all queries in parallel
      const [productsResponse, customerPartnerNumbersResponse, companyLocationResponse] =
        await Promise.all(queryPromises);

      // Process product data
      if (skus.length > 0 && productsResponse) {
        enhancedLines = this.transformProductData(
          productsResponse,
          sellingPlanLines,
          customerPartnerNumbersResponse,
          companyLocationId
        );
      } else {
        // If no items, initialize with basic data from sellingPlanLines
        enhancedLines = sellingPlanLines.map(line => ({
          id: '',
          title: 'Product information not available',
          description: '',
          handle: '',
          image: [],
          variant: {
            id: line.variantId,
            title: 'Variant information not available',
            sku: line.sku || '',
            customerPartnerNumber: null,
            quantity: line.quantity || 0,
            price: 0,
            metafield: null
          }
        }));
      }

      // Process company location data
      if (companyLocationResponse?.data?.companyLocation) {
        companyLocationData = companyLocationResponse.data.companyLocation;
        loggerService.info('Retrieved company location data', {
          locationId: companyLocationData?.id,
          locationName: companyLocationData?.name,
          companyId: companyLocationData?.company?.id
        });
      }

      // Format response data
      const response: SellingPlanWithLines = {
        id: Number(sellingPlan.id),
        name: sellingPlan.name,
        description: sellingPlan.description || '',
        currencyCode: sellingPlan.currencyCode,
        lines: enhancedLines,
        deliveryPolicies: deliveryPolicies.map(policy => ({
          id: Number(policy.id),
          offerDiscount: policy.offerDiscount,
          intervalValue: policy.intervalValue,
          intervalUnit: policy.intervalUnit as IntervalUnit,
          discountType: policy.discountType as DiscountType | undefined,
          discountValue: policy.discountValue || undefined,
          deliveryAnchor: policy.deliveryAnchor || undefined
        })),
        createdById: sellingPlan.createdById || undefined,
        companyLocation: companyLocationData,
        createdAt: sellingPlan.createdAt.toISOString(),
        updatedAt: sellingPlan.updatedAt.toISOString()
      };

      const duration = Date.now() - start;
      loggerService.info('Selling plan details retrieved successfully', {
        id: response.id,
        name: response.name,
        lineCount: response.lines.length,
        policyCount: response.deliveryPolicies.length,
        hasCompanyLocation: !!response.companyLocation,
        duration
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      loggerService.error('Error getting selling plan details', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        params,
        duration
      });
      throw error;
    }
  }

  /**
   * Transform product data from Shopify response
   */
  private transformProductData(
    productsResponse: any,
    lineItems: any[],
    customerPartnerNumbers: Map<string, string>,
    companyLocationId?: string | null
  ): ProductInfo[] {
    const products = productsResponse?.data?.products?.nodes || [];

    return lineItems.map(lineItem => {
      // Find product for this line item
      const matchingSku = lineItem.sku;
      const matchingProduct = products.find((product: any) =>
        product.variants?.nodes?.some((v: any) => v.sku === matchingSku)
      );

      // Get customer partner number from our database
      const customerPartnerNumber = customerPartnerNumbers.get(matchingSku) || null;

      if (!matchingProduct) {
        return {
          id: '',
          title: 'Product not found',
          description: '',
          handle: '',
          image: [],
          variant: {
            id: lineItem.variantId || '',
            title: 'Variant not found',
            sku: lineItem.sku || '',
            customerPartnerNumber,
            quantity: lineItem.quantity || 0,
            price: 0,
            metafield: null
          }
        };
      }

      // Find the specific variant
      const matchingVariant = matchingProduct.variants?.nodes?.find((v: any) =>
        v.sku === matchingSku
      ) || null;

      // Get price information - first try contextual pricing, then fallback to regular price
      let price = 0;
      if (matchingVariant) {
        // First check if we have contextual pricing (B2B price)
        if (companyLocationId &&
            matchingVariant.contextualPricing &&
            matchingVariant.contextualPricing.price &&
            matchingVariant.contextualPricing.price.amount) {
          price = parseFloat(matchingVariant.contextualPricing.price.amount);
        }
        // Otherwise use standard price
        else if (matchingVariant.price) {
          price = parseFloat(matchingVariant.price);
        }
      }

      return {
        id: matchingProduct.id || '',
        title: matchingProduct.title || '',
        description: matchingProduct.description || '',
        handle: matchingProduct.handle || '',
        image: matchingProduct.images?.nodes || [],
        variant: matchingVariant ? {
          id: matchingVariant.id || '',
          title: matchingVariant.title || '',
          sku: matchingVariant.sku || '',
          customerPartnerNumber,
          metafield: matchingVariant.metafield || null,
          quantity: lineItem.quantity || 0,
          price: price
        } : null
      };
    });
  }

  /**
   * Get customer partner numbers for specified SKUs
   */
  private async getCustomerPartnerNumbersForSkus(
    storeName: string,
    companyId: string,
    skus: string[]
  ): Promise<Map<string, string>> {
    try {
      // Format company ID to match the expected format in repository
      const formattedCompanyId = companyId.startsWith('gid://')
        ? companyId
        : `gid://shopify/Company/${companyId}`;

      // Use batchFetchCustomerNumberDetails to get customer partner numbers
      const mappings = await storeCompanyMappingRepository.batchFetchCustomerNumberDetails({
        storeName,
        companyId: formattedCompanyId,
        skuIds: skus
      });

      // Create a map for quick lookup
      const skuToCPNMap = new Map<string, string>();

      // Process each mapping, checking for null values
      for (const mapping of mappings) {
        if (mapping.skuId && mapping.customerPartnerNumber) {
          skuToCPNMap.set(mapping.skuId, mapping.customerPartnerNumber);
        }
      }

      return skuToCPNMap;
    } catch (error) {
      loggerService.error('Failed to get customer partner numbers for SKUs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName,
        companyId,
        skuCount: skus.length
      });
      return new Map(); // Return empty map on error to avoid breaking main flow
    }
  }

  /**
   * Updates an existing selling plan
   * @param params - Update selling plan request parameters
   * @returns Updated selling plan with its lines and delivery policies
   */
  public async updateSellingPlan(params: UpdateSellingPlanRequest): Promise<UpdateSellingPlanResponse> {
    const start = Date.now();

    try {
      loggerService.info('Updating selling plan', {
        id: params.id,
        storeName: params.storeName
      });

      // Verify selling plan exists and belongs to the store
      const existingPlan = await this.repository.getById({
        id: params.id,
        storeName: params.storeName
      });

      if (!existingPlan) {
        throw SellingPlanError.notFound(params.id);
      }

      // Extract current lines and policies for comparison
      const { sellingPlanLines: existingLines, deliveryPolicies: existingPolicies } = existingPlan;

      // Prepare changes for lines and policies
      const {
        linesToUpdate,
        linesToCreate,
        linesToDelete,
        policiesToUpdate,
        policiesToCreate,
        policiesToDelete
      } = this.calculateDataChanges(
        { lines: existingLines, policies: existingPolicies },
        params
      );

      // Prepare data for repository
      const repoParams = {
        id: params.id,
        plan: {
          storeName: params.storeName,
          name: params.name,
          description: params.description,
          currencyCode: params.currencyCode,
          updatedById: params.updatedById,
          companyLocationId: params.companyLocationId
        },
        // Convert line IDs to numbers where needed
        lines: [...linesToUpdate, ...linesToCreate].map(line => ({
          id: line.id !== undefined ? Number(line.id) : undefined,
          variantId: line.variantId,
          sku: line.sku,
          quantity: line.quantity
        })),
        // Convert policy IDs to numbers and ensure required fields are present
        deliveryPolicies: [...policiesToUpdate, ...policiesToCreate].map(policy => ({
          id: policy.id !== undefined ? Number(policy.id) : undefined,
          offerDiscount: Boolean(policy.offerDiscount), // Ensure it's always a boolean
          intervalValue: policy.intervalValue,
          intervalUnit: policy.intervalUnit,
          discountType: typeof policy.discountType === 'string' ? policy.discountType : undefined,
          discountValue: typeof policy.discountValue === 'number' ? policy.discountValue : undefined,
          deliveryAnchor: typeof policy.deliveryAnchor === 'number' ? policy.deliveryAnchor : undefined
        })),
        linesToDelete,
        policiesToDelete
      };

      const result = await this.repository.updateWithLinesAndPolicies(repoParams);

      const response: UpdateSellingPlanResponse = {
        id: Number(result.sellingPlan.id),
        name: result.sellingPlan.name,
        description: result.sellingPlan.description,
        currencyCode: result.sellingPlan.currencyCode,
        lines: result.sellingPlanLines.map(line => ({
          id: Number(line.id),
          variantId: line.variantId,
          sku: line.sku,
          quantity: line.quantity
        })),
        deliveryPolicies: result.deliveryPolicies.map(policy => ({
          id: Number(policy.id),
          offerDiscount: policy.offerDiscount,
          intervalValue: policy.intervalValue,
          intervalUnit: policy.intervalUnit as IntervalUnit,
          discountType: policy.discountType as DiscountType | undefined,
          discountValue: policy.discountValue || undefined,
          deliveryAnchor: policy.deliveryAnchor || undefined
        })),
        updatedById: params.updatedById,
        companyLocationId: result.sellingPlan.companyLocationId === null ? undefined : result.sellingPlan.companyLocationId,
        createdAt: result.sellingPlan.createdAt.toISOString(),
        updatedAt: result.sellingPlan.updatedAt.toISOString()
      };

      const duration = Date.now() - start;
      loggerService.info('Selling plan updated successfully', {
        id: response.id,
        name: response.name,
        lineCount: response.lines.length,
        policyCount: response.deliveryPolicies.length,
        duration
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      loggerService.error('Error updating selling plan', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        params,
        duration
      });
      throw error;
    }
  }

  /**
   * Calculate the differences between existing data and update request data
   * using business keys for matching instead of relying solely on IDs
   */
  private calculateDataChanges(
    existingData: DataChangesParams,
    params: UpdateSellingPlanRequest
  ): DataChangesResult {
    // Log input to help debug
    loggerService.info('Calculating data changes', {
      existingLineCount: existingData.lines.length,
      existingPolicyCount: existingData.policies.length,
      newLineCount: params.lines?.length || 0,
      newPolicyCount: params.deliveryPolicies?.length || 0
    });

    // Create maps for existing data using business keys
    const existingLineMap = new Map<string, any>();
    existingData.lines.forEach(line => {
      // Use SKU + variantId as a business key
      const businessKey = `${line.sku}:${line.variantId}`;
      existingLineMap.set(businessKey, line);
    });

    const existingPolicyMap = new Map<string, any>();
    existingData.policies.forEach(policy => {
      // Use intervalUnit + intervalValue as a business key
      const businessKey = `${policy.intervalUnit}:${policy.intervalValue}`;
      existingPolicyMap.set(businessKey, policy);
    });

    // Track which existing items are matched to avoid deleting them
    const matchedLineIds = new Set<number>();
    const matchedPolicyIds = new Set<number>();

    // Initialize result arrays
    const linesToUpdate: LineType[] = [];
    const linesToCreate: LineType[] = [];
    const policiesToUpdate: PolicyType[] = [];
    const policiesToCreate: PolicyType[] = [];

    // Process lines using business key matching
    if (params.lines && params.lines.length > 0) {
      params.lines.forEach((newLine: LineType) => {
        // Create business key for the line
        const businessKey = `${newLine.sku}:${newLine.variantId}`;
        const existingLine = existingLineMap.get(businessKey);

        if (existingLine) {
          // Found match by business key - prepare for update
          const lineId = Number(existingLine.id);
          matchedLineIds.add(lineId);

          // Preserve the ID from the existing line
          linesToUpdate.push({
            ...newLine,
            id: lineId
          });

          loggerService.info('Matched line by business key for update', {
            businessKey,
            existingId: lineId,
            providedId: newLine.id,
            sku: newLine.sku
          });
        } else {
          // No match found - prepare for create
          linesToCreate.push(newLine);

          loggerService.info('No match for line, will create new', {
            businessKey,
            sku: newLine.sku
          });
        }
      });
    }

    // Process delivery policies using business key matching
    if (params.deliveryPolicies && params.deliveryPolicies.length > 0) {
      params.deliveryPolicies.forEach((newPolicy: PolicyType) => {
        // Create business key for the policy
        const businessKey = `${newPolicy.intervalUnit}:${newPolicy.intervalValue}`;
        const existingPolicy = existingPolicyMap.get(businessKey);

        if (existingPolicy) {
          // Found match by business key - prepare for update
          const policyId = Number(existingPolicy.id);
          matchedPolicyIds.add(policyId);

          // Preserve the ID from the existing policy
          policiesToUpdate.push({
            ...newPolicy,
            id: policyId
          });

          loggerService.info('Matched policy by business key for update', {
            businessKey,
            existingId: policyId,
            providedId: newPolicy.id,
            intervalUnit: newPolicy.intervalUnit
          });
        } else {
          // No match found - prepare for create
          policiesToCreate.push(newPolicy);

          loggerService.info('No match for policy, will create new', {
            businessKey,
            intervalUnit: newPolicy.intervalUnit
          });
        }
      });
    }

    // Determine items to delete - those that were not matched
    const linesToDelete = existingData.lines
      .filter(line => !matchedLineIds.has(Number(line.id)))
      .map(line => Number(line.id));

    const policiesToDelete = existingData.policies
      .filter(policy => !matchedPolicyIds.has(Number(policy.id)))
      .map(policy => Number(policy.id));

    // Log calculated changes
    loggerService.info('Data changes calculated using business keys', {
      linesToUpdate: linesToUpdate.length,
      linesToCreate: linesToCreate.length,
      linesToDelete: linesToDelete.length,
      policiesToUpdate: policiesToUpdate.length,
      policiesToCreate: policiesToCreate.length,
      policiesToDelete: policiesToDelete.length
    });

    return {
      linesToUpdate,
      linesToCreate,
      linesToDelete,
      policiesToUpdate,
      policiesToCreate,
      policiesToDelete
    };
  }
}

export const sellingPlanService = new SellingPlanService();