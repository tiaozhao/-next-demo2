/**
 * @file Subscription Recommendation Types
 * Contains all type definitions related to subscription recommendation services.
 */

import { z } from 'zod';

// --------------------
// Zod Schemas
// --------------------

/**
 * Zod schema for price
 */
export const priceSchema = z.object({
  amount: z.string(),
  currencyCode: z.string()
}).strict();

/**
 * Zod schema for image
 */
export const imageSchema = z.object({
  url: z.string(),
  altText: z.string().optional()
}).strict();

/**
 * Zod schema for interval
 */
export const intervalSchema = z.object({
  unit: z.string(),
  value: z.number()
}).strict();

/**
 * Zod schema for shopping list SKU info
 */
export const shoppingListSkuInfoSchema = z.object({
  id: z.string(),
  sku: z.string(),
  title: z.string(),
  variantId: z.string(),
  productId: z.string(),
  price: priceSchema.optional(),
  quantity: z.number().optional()
}).strict();

/**
 * Zod schema for data source parameters
 */
export const dataSourceParamsSchema = z.object({
  customerId: z.string(),
  customerName: z.string().optional(),
  customerType: z.string().optional(),
  storeId: z.string(),
  storeName: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  companyLocationId: z.string(),
  filters: z.object({
    limit: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).optional()
}).strict();

/**
 * Zod schema for subscription
 */
export const subscriptionSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  interval: intervalSchema.optional(),
  frequency: z.number().optional(),
  status: z.string(),
  title: z.string().optional(),
  price: priceSchema.optional(),
  lastOrderDate: z.date().optional()
}).strict();

/**
 * Zod schema for product source type
 */
export const productSourceTypeSchema = z.string();

/**
 * Zod schema for product display info
 */
export const productDisplayInfoSchema = z.object({
  featured: z.boolean().optional(),
  sortOrder: z.number().optional(),
  badge: z.string().optional(),
  highlight: z.boolean().optional(),
  shortReason: z.string().optional(),
  badgeText: z.string().optional(),
  primaryBenefit: z.string().optional(),
  callToAction: z.string().optional()
}).strict();

/**
 * Zod schema for product info
 */
export const productInfoSchema = z.object({
  id: z.string(),
  sku: z.string(),
  title: z.string(),
  sourceType: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: priceSchema.optional(),
  image: imageSchema.optional(),
  frequency: z.number().optional(),
  score: z.number().optional(),
  display: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
}).strict();

/**
 * Zod schema for Shopify recommendation
 */
export const shopifyRecommendationSchema = z.object({
  id: z.string(),
  sku: z.string(),
  title: z.string(),
  inventoryQuantity: z.number().optional(),
  price: priceSchema.optional(),
  recommendationSource: z.string().optional(),
  sourceProductIds: z.array(z.string()).optional(),
  rank: z.number().optional()
}).strict();

/**
 * Zod schema for historical product
 */
export const historicalProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  source: z.string(),
  lastAddedAt: z.date().optional(),
  quantity: z.number().optional(),
  price: priceSchema.optional(),
  purchaseCount: z.number().optional()
}).strict();

/**
 * Zod schema for rule context
 */
export const ruleContextSchema = z.object({
  historicalProducts: z.array(historicalProductSchema),
  shopifyRecommendations: z.array(shopifyRecommendationSchema),
  currentSubscriptions: z.array(subscriptionSchema),
  catalogSkus: z.instanceof(Set).optional()
}).strict();

/**
 * Zod schema for rule execution parameters
 */
export const ruleExecutionParamsSchema = z.object({
  customerId: z.string(),
  storeName: z.string(),
  companyLocationId: z.string(),
  subscriberType: z.string().optional(),
  context: ruleContextSchema
}).strict();

/**
 * Zod schema for rule result
 */
export const ruleResultSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  score: z.number(),
  metadata: z.record(z.any()).optional()
}).strict();

/**
 * Zod schema for rule execution results
 */
export const ruleExecutionResultsSchema = z.object({
  frequencyRuleResults: z.array(ruleResultSchema),
  subscriptionExtendRuleResults: z.array(ruleResultSchema),
  topSellingRuleResults: z.array(ruleResultSchema),
  wishlistRuleResults: z.array(ruleResultSchema)
}).strict();

/**
 * Zod schema for upsell opportunity
 */
export const upsellOpportunitySchema = z.object({
  type: z.string(),
  recommendedProduct: productInfoSchema,
  sourceProduct: productInfoSchema.optional(),
  confidence: z.number(),
  explanation: z.string().optional()
}).strict();

/**
 * Zod schema for recommendation response
 */
export const recommendationResponseSchema = z.object({
  recommendations: z.array(productInfoSchema),
  upsellOpportunities: z.array(upsellOpportunitySchema).optional(),
  llmRecommendations: z.array(productInfoSchema).optional(),
  metrics: z.object({
    totalTime: z.number(),
    dataSourceTime: z.number(),
    ruleExecutionTime: z.number(),
    llmEnhancementTime: z.number().optional(),
    cacheHit: z.boolean().optional()
  }).optional()
}).strict();

/**
 * Zod schema for get recommendations params
 */
export const getRecommendationsParamsSchema = z.object({
  customerId: z.string(),
  storeName: z.string(),
  companyLocationId: z.string(),
  subscriberType: z.string().optional(),
  customerName: z.string().optional(),
  companyId: z.string().optional()
}).strict();

/**
 * Zod schema for LLM score breakdown
 */
export const llmScoreBreakdownSchema = z.object({
  source_score: z.number().optional(),
  dimension_score: z.number().optional(),
  bonus_points: z.number().optional(),
  explanation: z.string().optional()
}).strict();

/**
 * Zod schema for LLM references
 */
export const llmReferencesSchema = z.object({
  sources: z.array(z.string()),
  dimensions: z.array(z.string())
}).strict();

/**
 * Zod schema for LLM recommendation
 */
export const llmRecommendationSchema = z.object({
  id: z.string().optional(),
  sku: z.string(),
  title: z.string().optional(),
  sourceType: z.string().optional(),
  score: z.number().optional(),
  reason: z.string().optional(),
  references: llmReferencesSchema.optional(),
  estimated_score: z.number().optional(),
  score_breakdown: llmScoreBreakdownSchema.optional(),
  isDuplicate: z.boolean().optional(),
  suggestedFrequency: z.number().optional(),
  confidenceLevel: z.enum(['high', 'medium', 'low']).optional(),
  display: productDisplayInfoSchema.optional(),
  metadata: z.record(z.any()).optional()
}).strict();

/**
 * Zod schema for LLM upsell opportunity
 */
export const llmUpsellOpportunitySchema = z.object({
  forProductId: z.string(),
  upsellProductId: z.string(),
  upsellReason: z.string()
}).strict();

/**
 * Zod schema for LLM recommendation response
 */
export const llmRecommendationResponseSchema = z.object({
  recommendations: z.array(llmRecommendationSchema),
  metadata: z.object({
    confidenceScore: z.number(),
    reasoningStrategy: z.string().optional(),
    additionalInsights: z.string().optional()
  }),
  upsellOpportunities: z.array(llmUpsellOpportunitySchema).optional()
}).strict();

/**
 * Zod schema for catalog product variant
 */
export const catalogProductVariantSchema = z.object({
  node: z.object({
    id: z.string(),
    sku: z.string()
  })
}).strict();

/**
 * Zod schema for catalog product
 */
export const catalogProductSchema = z.object({
  node: z.object({
    id: z.string(),
    title: z.string(),
    variants: z.object({
      edges: z.array(catalogProductVariantSchema)
    })
  })
}).strict();

/**
 * Zod schema for catalog publication
 */
export const catalogPublicationSchema = z.object({
  products: z.object({
    edges: z.array(catalogProductSchema)
  })
}).strict();

/**
 * Zod schema for catalog
 */
export const catalogSchema = z.object({
  node: z.object({
    id: z.string(),
    title: z.string(),
    publication: catalogPublicationSchema
  })
}).strict();

/**
 * Zod schema for catalogs response
 */
export const catalogsResponseSchema = z.object({
  catalogs: z.object({
    edges: z.array(catalogSchema)
  })
}).strict();

/**
 * Zod schema for optimized LLM recommendation
 */
export const optimizedLLMRecommendationSchema = z.object({
  sku: z.string(),
  score: z.number().min(0).max(10),
  rank: z.number().int().positive(),
  reason: z.string().max(100),
  reference: z.string().max(30),
  suggestedFrequency: z.number().optional(),
  confidenceLevel: z.enum(['high', 'medium', 'low']).optional()
}).strict();

/**
 * Zod schema for optimized LLM recommendation response
 */
export const optimizedLLMRecommendationResponseSchema = z.object({
  recommendations: z.array(optimizedLLMRecommendationSchema),
  metadata: z.object({
    confidenceScore: z.number().min(0).max(1),
    reasoningStrategy: z.string().optional(),
    additionalInsights: z.string().optional()
  })
}).strict();

// --------------------
// Type Definitions
// --------------------

/**
 * Price information structure
 */
export interface IPrice {
  /**
   * Price amount as string to preserve precision
   */
  amount: string;

  /**
   * Currency code (e.g., 'USD', 'CAD')
   */
  currencyCode: string;
}

/**
 * Image information structure
 */
export interface IImage {
  /**
   * Image URL
   */
  url: string;

  /**
   * Optional alt text for the image
   */
  altText?: string;
}

/**
 * Interval for subscriptions
 */
export interface IInterval {
  /**
   * Unit of time ('day', 'week', 'month')
   */
  unit: string;

  /**
   * Numeric value
   */
  value: number;
}


/**
 * Data structure for shopping list SKU information
 */
export interface IShoppingListSkuInfo {
  /**
   * SKU identifier
   */
  skuId: string;

  /**
   * Product identifier
   */
  productId: string;

  /**
   * Optional product title
   */
  productTitle?: string;

  /**
   * Date when the item was last added
   */
  lastAddedAt: Date;

  /**
   * Optional price information
   */
  price?: IPrice;

  /**
   * Quantity of the item
   */
  quantity?: number;
}

/**
 * Parameters for retrieving data from sources
 */
export interface IDataSourceParams {
  /**
   * Customer identifier
   */
  customerId: string;

  /**
   * Company location identifier
   */
  companyLocationId: string;

  /**
   * Store name
   */
  storeName: string;

  /**
   * Optional limit for results
   */
  limit?: number;
}

/**
 * Subscription information structure
 */
export interface ISubscription {
  /**
   * Product identifier
   */
  productId: string;

  /**
   * SKU identifier
   */
  sku: string;

  /**
   * Optional interval structure
   */
  interval?: IInterval;

  /**
   * Frequency in days, optional for backward compatibility
   */
  frequency?: number;

  /**
   * Subscription status
   */
  status: string;

  /**
   * Optional product title
   */
  title?: string;

  /**
   * Optional price information
   */
  price?: IPrice;

  /**
   * Optional last order date
   */
  lastOrderDate?: Date;
}

/**
 * Source types for product data
 * Allows both string and specific union type for backward compatibility
 */
export type ProductSourceType = string | 'WISHLIST' | 'ORDER_HISTORY' | 'SHOPIFY_RECOMMENDATION' | 'SUBSCRIPTION' | 'CATALOG';


/**
 * Product display information
 */
export interface IProductDisplayInfo {
  /**
   * Whether the product is featured
   */
  featured?: boolean;

  /**
   * Sort order for the product
   */
  sortOrder?: number;

  /**
   * Badge text to display
   */
  badge?: string;

  /**
   * Whether to highlight the product
   */
  highlight?: boolean;

  /**
   * Short reason for recommendation
   */
  shortReason?: string;

  /**
   * Badge text to display
   */
  badgeText?: string;

  /**
   * Primary benefit description
   */
  primaryBenefit?: string;

  /**
   * Call to action text
   */
  callToAction?: string;
}

/**
 * Interface for product recommendation information
 */
export interface IProductInfo {
  /**
   * Product identifier
   */
  id: string;

  /**
   * SKU identifier
   */
  sku: string;

  /**
   * Product title
   */
  title: string;

  /**
   * Data source type: 'SHOPPING_LIST', 'ORDER_HISTORY', 'SHOPIFY_RECOMMENDATION', 'WISHLIST', etc.
   */
  sourceType: ProductSourceType;

  /**
   * Optional product description
   */
  description?: string;

  /**
   * Optional product category
   */
  category?: string;

  /**
   * Optional price information
   */
  price?: IPrice;

  /**
   * Optional image information
   */
  image?: IImage;

  /**
   * Optional subscription frequency in days
   */
  frequency?: number;

  /**
   * Optional recommendation score (0-1)
   */
  score?: number;

  /**
   * Optional display information
   */
  display?: Record<string, any>;

  /**
   * Optional additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Shopify recommendation structure
 */
export interface IShopifyRecommendation {
  /**
   * Product identifier
   */
  id: string;

  /**
   * SKU identifier
   */
  sku: string;

  /**
   * Product title
   */
  title: string;

  /**
   * Optional inventory quantity
   */
  inventoryQuantity?: number;

  /**
   * Optional price information
   */
  price?: IPrice;

  /**
   * Optional source of the recommendation
   */
  recommendationSource?: ProductSourceType;

  /**
   * Optional array of product IDs that led to this recommendation
   */
  sourceProductIds?: string[];

  /**
   * Optional sales rank
   */
  rank?: number;
}


/**
 * Historical product data structure
 */
export interface IHistoricalProduct {
  /**
   * Product identifier
   */
  id: string;

  /**
   * SKU identifier
   */
  sku: string;

  /**
   * Source type (e.g., 'SHOPPING_LIST', 'ORDER_HISTORY', 'WISHLIST')
   */
  source: ProductSourceType;

  /**
   * Optional date when the product was last added/purchased
   */
  lastAddedAt?: Date;

  /**
   * Optional quantity
   */
  quantity?: number;

  /**
   * Optional price information
   */
  price?: IPrice;

  /**
   * Optional purchase count (for repeated purchases)
   */
  purchaseCount?: number;
}

/**
 * Context for rule engine
 */
export interface IRuleContext {
  /**
   * Historical product data
   */
  historicalProducts: IHistoricalProduct[];

  /**
   * Product recommendations from Shopify
   */
  shopifyRecommendations: IShopifyRecommendation[];

  /**
   * Current customer subscriptions
   */
  currentSubscriptions: ISubscription[];

  /**
   * Catalog SKUs for filtering
   */
  catalogSkus?: Set<string>;
}

/**
 * Interface for rule execution input parameters
 */
export interface IRuleExecutionParams {
  /**
   * Customer identifier
   */
  customerId: string;

  /**
   * Store name
   */
  storeName: string;

  /**
   * Company location identifier
   */
  companyLocationId: string;

  /**
   * Optional subscriber type
   */
  subscriberType?: string;

  /**
   * Context data for rules execution
   */
  context: IRuleContext;
}

/**
 * Interface for rule result with product information and score
 */
export interface IRuleResult {
  /**
   * Product identifier
   */
  productId: string;

  /**
   * Product SKU
   */
  sku: string;

  /**
   * Recommendation score between 0-1
   */
  score: number;

  /**
   * Additional rule-specific metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Interface for rule execution results
 */
export interface IRuleExecutionResults {
  /**
   * Results from frequency-based rules
   */
  frequencyRuleResults: IRuleResult[];

  /**
   * Results from subscription extension rules
   */
  subscriptionExtendRuleResults: IRuleResult[];

  /**
   * Results from top selling product rules
   */
  topSellingRuleResults: IRuleResult[];

  /**
   * Results from wishlist/saved items rules
   */
  wishlistRuleResults: IRuleResult[];
}

/**
 * Upsell opportunity structure
 */
export interface IUpsellOpportunity {
  /**
   * Type of upsell opportunity
   */
  type: string;

  /**
   * Recommended product information
   */
  recommendedProduct: IProductInfo;

  /**
   * Optional source product (what led to this recommendation)
   */
  sourceProduct?: IProductInfo;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Explanation for the recommendation
   */
  explanation?: string;
}

/**
 * Recommendation response structure
 */
export interface IRecommendationResponse {
  /**
   * Array of product recommendations
   */
  recommendations: IProductInfo[];

  /**
   * Optional upsell opportunities
   */
  upsellOpportunities?: IUpsellOpportunity[];

  /**
   * Optional LLM-enhanced recommendations
   */
  llmRecommendations?: IProductInfo[];

  /**
   * Performance metrics
   */
  metrics?: {
    /**
     * Total processing time in milliseconds
     */
    totalTime: number;

    /**
     * Time spent collecting data sources in milliseconds
     */
    dataSourceTime: number;

    /**
     * Time spent executing rules in milliseconds
     */
    ruleExecutionTime: number;

    /**
     * Time spent enhancing with LLM in milliseconds
     */
    llmEnhancementTime?: number;

    /**
     * Indicates if results were served from cache
     */
    cacheHit?: boolean;
  };
}

/**
 * Interface for recommendation service parameters
 */
export interface IGetRecommendationsParams {
  /**
   * Customer identifier
   */
  customerId: string;

  /**
   * Store name
   */
  storeName: string;

  /**
   * Company location identifier
   */
  companyLocationId: string;
}

/**
 * LLM Score Breakdown structure
 */
export interface ILLMScoreBreakdown {
  /**
   * Score from source relevance (0-1)
   */
  source_score?: number;

  /**
   * Score from recommendation dimensions (0-1)
   */
  dimension_score?: number;

  /**
   * Additional bonus points (-0.5 to 0.5)
   */
  bonus_points?: number;

  /**
   * Text explanation of the score calculation
   */
  explanation?: string;
}

/**
 * LLM References structure
 */
export interface ILLMReferences {
  /**
   * Data sources that influenced this recommendation
   */
  sources: string[];

  /**
   * Dimensions or aspects that apply to this recommendation
   */
  dimensions: string[];
}

/**
 * LLM Recommendation structure
 */
export interface ILLMRecommendation {
  /**
   * Product identifier
   */
  id?: string;

  /**
   * SKU identifier
   */
  sku: string;

  /**
   * Product title
   */
  title?: string;

  /**
   * Source type of recommendation
   */
  sourceType?: string;

  /**
   * Recommendation score
   */
  score?: number;

  /**
   * Business justification for recommendation
   */
  reason?: string;

  /**
   * Metadata about sources and dimensions for recommendation
   */
  references?: ILLMReferences;

  /**
   * LLM's estimated score for this recommendation (0-2 range)
   */
  estimated_score?: number;

  /**
   * Detailed breakdown of the score components
   */
  score_breakdown?: ILLMScoreBreakdown;

  /**
   * Flag indicating if this is a duplicate of a regular recommendation
   */
  isDuplicate?: boolean;

  /**
   * Suggested frequency in days
   */
  suggestedFrequency?: number;

  /**
   * Confidence level based on score
   */
  confidenceLevel?: 'high' | 'medium' | 'low';

  /**
   * Display information for UI
   */
  display?: IProductDisplayInfo;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * LLM Upsell Opportunity structure
 */
export interface ILLMUpsellOpportunity {
  /**
   * Product ID for which the upsell is recommended
   */
  forProductId: string;

  /**
   * Product ID being recommended as upsell
   */
  upsellProductId: string;

  /**
   * Reason for the upsell recommendation
   */
  upsellReason: string;
}

/**
 * LLM Recommendation Response structure
 */
export interface ILLMRecommendationResponse {
  /**
   * Array of recommendations
   */
  recommendations: ILLMRecommendation[];

  /**
   * Metadata about the recommendations
   */
  metadata: {
    /**
     * Overall confidence score
     */
    confidenceScore: number;

    /**
     * Strategy used for reasoning
     */
    reasoningStrategy?: string;

    /**
     * Additional insights about recommendations
     */
    additionalInsights: string;
  };

  /**
   * Optional upsell opportunities
   */
  upsellOpportunities?: ILLMUpsellOpportunity[];
}





/**
 * Interface for catalog product variant
 */
export interface ICatalogProductVariant {
  node: {
    id: string;
    sku: string;
  };
}

/**
 * Interface for catalog product
 */
export interface ICatalogProduct {
  node: {
    id: string;
    title: string;
    variants: {
      edges: ICatalogProductVariant[];
    };
  };
}

/**
 * Interface for catalog publication
 */
export interface ICatalogPublication {
  products: {
    edges: ICatalogProduct[];
  };
}

/**
 * Interface for catalog
 */
export interface ICatalog {
  node: {
    id: string;
    title: string;
    publication: ICatalogPublication;
  };
}

/**
 * Interface for catalogs response
 */
export interface ICatalogsResponse {
  catalogs: {
    edges: ICatalog[];
  };
}

/**
 * Interface for optimized LLM recommendation
 */
export interface IOptimizedLLMRecommendation {
  /**
   * SKU identifier
   */
  sku: string;

  /**
   * Recommendation score on a 10-point scale (0-10)
   */
  score: number;

  /**
   * Rank in the recommendation list (1-based)
   */
  rank: number;

  /**
   * Short, customer-friendly reason for the recommendation (max 100 chars)
   */
  reason: string;

  /**
   * Reference to the data source (e.g., "from your wishlist", "based on your orders")
   */
  reference: string;

  /**
   * Suggested frequency in days (optional)
   */
  suggestedFrequency?: number;

  /**
   * Confidence level (optional)
   */
  confidenceLevel?: 'high' | 'medium' | 'low';
}

/**
 * Interface for optimized LLM recommendation response
 */
export interface IOptimizedLLMRecommendationResponse {
  /**
   * Array of optimized recommendations
   */
  recommendations: IOptimizedLLMRecommendation[];

  /**
   * Response metadata
   */
  metadata: {
    /**
     * Overall confidence score (0-1)
     */
    confidenceScore: number;

    /**
     * Strategy used for reasoning (optional)
     */
    reasoningStrategy?: string;

    /**
     * Additional insights (optional)
     */
    additionalInsights?: string;
  };
}

// --------------------
// Optimized Data Source Layer Types
// --------------------

/**
 * Zod schema for order item
 */
export const orderItemSchema = z.object({
  skuId: z.string(),
  orderDate: z.string(), // ISO string
  quantity: z.number(),
  isSubscriptionOrder: z.boolean(),
  productId: z.string()
}).strict();

/**
 * Order item data from order history
 */
export interface IOrderItem extends z.infer<typeof orderItemSchema> {}

/**
 * Zod schema for subscription item
 */
export const subscriptionItemSchema = z.object({
  skuId: z.string(),
  quantity: z.number(),
  frequency: z.string(), // e.g., "monthly"
  nextDeliveryDate: z.string(),
  status: z.enum(['active', 'paused', 'cancelled'])
}).strict();

/**
 * Subscription item data from active subscriptions
 */
export interface ISubscriptionItem extends z.infer<typeof subscriptionItemSchema> {}

/**
 * Zod schema for wishlist item
 */
export const wishlistItemSchema = z.object({
  skuId: z.string(),
  addedDate: z.string(),
  productId: z.string()
}).strict();

/**
 * Wishlist item data from shopping lists/wishlists
 */
export interface IWishlistItem extends z.infer<typeof wishlistItemSchema> {}

/**
 * Zod schema for product catalog item
 */
export const productCatalogItemSchema = z.object({
  skuId: z.string()
}).strict();

/**
 * Product catalog item for filtering
 */
export interface IProductCatalogItem extends z.infer<typeof productCatalogItemSchema> {}



// --------------------
// Optimized Context Layer Types
// --------------------

/**
 * Zod schema for unified item context
 */
export const unifiedItemContextSchema = z.object({
  skuId: z.string(),
  storeName: z.string(),
  companyLocationId: z.string(),

  isInWishlist: z.boolean().optional(),
  isSubscribed: z.boolean().optional(),
  isTopSelling: z.boolean().optional(),
  isShopifyRecommendation: z.boolean().optional(),

  orderCount: z.number().optional(),
  totalQuantity: z.number().optional(),
  lastOrderDate: z.string().optional(),

  subscriptionFrequency: z.string().optional(),
  nextDeliveryDate: z.string().optional()
}).strict();

/**
 * Unified item context for rule engine input
 */
export interface IUnifiedItemContext extends z.infer<typeof unifiedItemContextSchema> {}

/**
 * Zod schema for rule evaluated item
 */
export const ruleEvaluatedItemSchema = unifiedItemContextSchema.extend({
  baseScore: z.number(),
  ruleMatched: z.array(z.string())
}).strict();

/**
 * Rule evaluation result
 */
export interface IRuleEvaluatedItem extends z.infer<typeof ruleEvaluatedItemSchema> {}

/**
 * Zod schema for LLM input product
 */
export const llmInputProductSchema = unifiedItemContextSchema.extend({
  title: z.string(),
  description: z.string(),
  category: z.string().optional(),
  inventoryQuantity: z.number().optional(),

  score: z.number(),
  matchedRules: z.array(z.string()),
  rulePrompts: z.array(z.string()).optional() // Custom prompts from matched rules
}).strict();

/**
 * LLM input product
 */
export interface ILLMInputProduct extends z.infer<typeof llmInputProductSchema> {}

/**
 * Zod schema for optimized recommendation
 */
export const optimizedRecommendationSchema = z.object({
  skuId: z.string(),
  reason: z.string(),
  score: z.number()
}).strict();

/**
 * Final recommendation output
 */
export interface IOptimizedRecommendation extends z.infer<typeof optimizedRecommendationSchema> {}

// --------------------
// Type Exports from Schemas
// --------------------

export type Price = z.infer<typeof priceSchema>;
export type Image = z.infer<typeof imageSchema>;
export type Interval = z.infer<typeof intervalSchema>;
export type ShoppingListSkuInfo = z.infer<typeof shoppingListSkuInfoSchema>;
export type DataSourceParams = z.infer<typeof dataSourceParamsSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type ProductDisplayInfo = z.infer<typeof productDisplayInfoSchema>;
export type ProductInfo = z.infer<typeof productInfoSchema>;
export type ShopifyRecommendation = z.infer<typeof shopifyRecommendationSchema>;
export type HistoricalProduct = z.infer<typeof historicalProductSchema>;
export type RuleContext = z.infer<typeof ruleContextSchema>;
export type RuleExecutionParams = z.infer<typeof ruleExecutionParamsSchema>;
export type RuleResult = z.infer<typeof ruleResultSchema>;
export type RuleExecutionResults = z.infer<typeof ruleExecutionResultsSchema>;
export type UpsellOpportunity = z.infer<typeof upsellOpportunitySchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type GetRecommendationsParams = z.infer<typeof getRecommendationsParamsSchema>;
export type LLMScoreBreakdown = z.infer<typeof llmScoreBreakdownSchema>;
export type LLMReferences = z.infer<typeof llmReferencesSchema>;
export type LLMRecommendation = z.infer<typeof llmRecommendationSchema>;
export type LLMUpsellOpportunity = z.infer<typeof llmUpsellOpportunitySchema>;
export type LLMRecommendationResponse = z.infer<typeof llmRecommendationResponseSchema>;
export type CatalogProductVariant = z.infer<typeof catalogProductVariantSchema>;
export type CatalogProduct = z.infer<typeof catalogProductSchema>;
export type CatalogPublication = z.infer<typeof catalogPublicationSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
export type CatalogsResponse = z.infer<typeof catalogsResponseSchema>;
export type OptimizedLLMRecommendation = z.infer<typeof optimizedLLMRecommendationSchema>;
export type OptimizedLLMRecommendationResponse = z.infer<typeof optimizedLLMRecommendationResponseSchema>;

// New optimized types
export type OrderItem = z.infer<typeof orderItemSchema>;
export type SubscriptionItem = z.infer<typeof subscriptionItemSchema>;
export type WishlistItem = z.infer<typeof wishlistItemSchema>;
export type ProductCatalogItem = z.infer<typeof productCatalogItemSchema>;
export type UnifiedItemContext = z.infer<typeof unifiedItemContextSchema>;
export type RuleEvaluatedItem = z.infer<typeof ruleEvaluatedItemSchema>;
export type LLMInputProduct = z.infer<typeof llmInputProductSchema>;
export type OptimizedRecommendation = z.infer<typeof optimizedRecommendationSchema>;