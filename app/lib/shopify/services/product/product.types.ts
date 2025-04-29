import { z } from "zod";

/**
 * Base product information schema
 */
export const baseProductSchema = z.object({
  id: z.string(),
});

/**
 * Product price schema
 */
export const productPriceSchema = z.object({
  amount: z.string(),
  currencyCode: z.string(),
});

/**
 * Product variant base schema
 */
export const baseProductVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string(),
});

/**
 * Product variant schema with additional fields
 */
export const productVariantSchema = baseProductVariantSchema.extend({
  title: z.string().optional(),
  price: z.string().optional(),
  inventoryQuantity: z.number().optional(),
  availableForSale: z.boolean().optional(),
  sellableOnlineQuantity: z.number().optional(),
  contextualPricing: z.object({
    price: productPriceSchema,
    quantityRule: z.object({
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      increment: z.number().optional(),
    }).optional(),
  }).nullable().optional(),
  metafield: z.object({
    id: z.string(),
    namespace: z.string(),
    key: z.string(),
    value: z.string(),
  }).nullable().optional(),
});

/**
 * Minimal product variant schema for SKU set query
 */
export const minimalProductVariantSchema = z.object({
  sku: z.string(),
});

/**
 * Product image schema
 */
export const productImageSchema = z.object({
  id: z.string(),
  url: z.string(),
});

/**
 * Full product schema
 */
export const productSchema = baseProductSchema.extend({
  title: z.string(),
  description: z.string().optional(),
  handle: z.string().optional(),
  onlineStoreUrl: z.string().optional(),
  updatedAt: z.string().optional(),
  images: z.object({
    nodes: z.array(productImageSchema),
  }).optional(),
  variants: z.object({
    nodes: z.array(productVariantSchema),
  }),
});

/**
 * Minimal product schema for SKU set query
 */
export const minimalProductSchema = baseProductSchema.extend({
  variants: z.object({
    nodes: z.array(minimalProductVariantSchema),
  }),
});

/**
 * Product recommendation variant schema
 */
export const productRecommendationVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  sku: z.string(),
  contextualPricing: z.object({
    price: productPriceSchema,
  }).optional(),
});

/**
 * Product recommendation schema
 */
export const productRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  handle: z.string(),
  variants: z.object({
    edges: z.array(z.object({
      node: productRecommendationVariantSchema,
    })),
  }),
});

/**
 * Page information schema
 */
export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  endCursor: z.string().optional(),
  startCursor: z.string().optional(),
});

/**
 * Product with cursor schema for SKU set query
 */
export const productWithCursorSchema = z.object({
  cursor: z.string(),
  node: minimalProductSchema,
});

/**
 * Products by SKU set response schema
 */
export const productsBySkuSetResponseSchema = z.object({
  products: z.array(productWithCursorSchema),
  pageInfo: pageInfoSchema,
});

/**
 * Product variant weight schema
 */
export const productVariantWeightSchema = z.object({
  sku: z.string(),
  weight: z.number(),
  weightUnit: z.string(),
});

/**
 * Product with variant weights schema
 */
export const productWithVariantWeightsSchema = z.object({
  title: z.string(),
  variants: z.object({
    nodes: z.array(productVariantWeightSchema),
  }),
});

/**
 * Product variant weight response schema
 */
export const productVariantWeightResponseSchema = z.object({
  products: z.array(productWithVariantWeightsSchema),
  pageInfo: pageInfoSchema,
});

// Request schemas
/**
 * Product by SKU set request schema
 */
export const productsBySkuSetRequestSchema = z.object({
  storeDomain: z.string(),
  skuSet: z.array(z.string()),
  first: z.number().optional().default(50),
  after: z.string().optional(),
});

/**
 * Product request schema
 */
export const productRequestSchema = z.object({
  storeDomain: z.string(),
  companyLocationId: z.string().optional(),
  productId: z.string().optional(),
  skus: z.array(z.string()).optional(),
  query: z.string().optional(),
  first: z.number().optional().default(20),
  after: z.string().optional(),
});

/**
 * Product variant weight query parameters schema
 */
export const productVariantWeightParamsSchema = z.object({
  storeDomain: z.string(),
  first: z.number().optional(),
  after: z.string().optional(),
  query: z.string().optional(), // Add optional query parameter for SKU filtering
});

// Type exports from schemas
export type IProductPrice = z.infer<typeof productPriceSchema>;
export type IProductVariant = z.infer<typeof productVariantSchema>;
export type IMinimalProductVariant = z.infer<typeof minimalProductVariantSchema>;
export type IProductImage = z.infer<typeof productImageSchema>;
export type IProduct = z.infer<typeof productSchema>;
export type IMinimalProduct = z.infer<typeof minimalProductSchema>;
export type IProductRecommendationVariant = z.infer<typeof productRecommendationVariantSchema>;
export type IProductRecommendation = z.infer<typeof productRecommendationSchema>;
export type IPageInfo = z.infer<typeof pageInfoSchema>;
export type IProductWithCursor = z.infer<typeof productWithCursorSchema>;
export type IProductsBySkuSetResponse = z.infer<typeof productsBySkuSetResponseSchema>;
export type IProductVariantWeight = z.infer<typeof productVariantWeightSchema>;
export type IProductWithVariantWeights = z.infer<typeof productWithVariantWeightsSchema>;
export type IProductVariantWeightResponse = z.infer<typeof productVariantWeightResponseSchema>;

// Request types
export type ProductsBySkuSetRequest = z.infer<typeof productsBySkuSetRequestSchema>;
export type ProductRequest = z.infer<typeof productRequestSchema>;
export type ProductVariantWeightParams = z.infer<typeof productVariantWeightParamsSchema>;