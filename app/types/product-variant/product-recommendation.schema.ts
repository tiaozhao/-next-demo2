import { z } from 'zod';

/**
 * Schema for product recommendation request
 */
export const productRecommendationRequestSchema = z.object({
  storeName: z.string({
    required_error: 'Store name is required',
    invalid_type_error: 'Store name must be a string'
  }),
  customerId: z.string({
    required_error: 'Customer ID is required',
    invalid_type_error: 'Customer ID must be a string'
  }),
  companyLocationId: z.string({
    required_error: 'Company location ID is required',
    invalid_type_error: 'Company location ID must be a string'
  }),
  productId: z.string().optional()
});

/**
 * Schema for product recommendation item in response
 */
export const productRecommendationItemSchema = z.object({
  variantId: z.string(),
  sku: z.string(),
  price: z.number(),
  currencyCode: z.string(),
  variantTitle: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  description: z.string().nullable(),
  vendor: z.string(),
  productType: z.string(),
  tags: z.array(z.string()),
  handle: z.string(),
  sourceType: z.enum(['wishlist', 'order', 'recommendation']),
  quantity: z.number().optional()
});

/**
 * Schema for product recommendation response
 */
export const productRecommendationResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    recommendations: z.array(productRecommendationItemSchema)
  }).optional()
});

/**
 * Type definitions derived from schemas
 */
export type ProductRecommendationRequest = z.infer<typeof productRecommendationRequestSchema>;
export type ProductRecommendationResponse = z.infer<typeof productRecommendationResponseSchema>;
export type ProductRecommendationItem = z.infer<typeof productRecommendationItemSchema>; 