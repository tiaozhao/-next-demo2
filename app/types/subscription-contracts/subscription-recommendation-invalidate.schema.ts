import { z } from 'zod';

/**
 * Schema for invalidating subscription recommendations cache
 */
export const invalidateRecommendationsCacheSchema = z.object({
  /**
   * Shopify store name
   */
  storeName: z.string().min(1, 'Store name is required'),
  
  /**
   * Shopify customer ID
   */
  customerId: z.string().min(1, 'Customer ID is required'),
  
  /**
   * Shopify company location ID
   */
  companyLocationId: z.string().min(1, 'Company location ID is required'),
  
  /**
   * Optional line items from the order
   * Used to check if all SKUs are already in the recommendations
   */
  lineItems: z.array(
    z.object({
      /**
       * Product SKU
       */
      sku: z.string().min(1, 'SKU is required')
    })
  ).optional()
});

/**
 * Schema for invalidate recommendations cache response
 */
export const invalidateRecommendationsCacheResponseSchema = z.object({
  /**
   * Whether the operation was successful
   */
  success: z.boolean(),
  
  /**
   * Status message
   */
  message: z.string()
});

/**
 * Type definition for invalidate recommendations cache request
 */
export type InvalidateRecommendationsCacheRequest = z.infer<typeof invalidateRecommendationsCacheSchema>;

/**
 * Type definition for invalidate recommendations cache response
 */
export type InvalidateRecommendationsCacheResponse = z.infer<typeof invalidateRecommendationsCacheResponseSchema>;
