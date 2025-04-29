import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Schema for a selling plan line
 */
export const sellingPlanLineSchema = z.object({
  variantId: z.string().min(1, 'Product variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer').default(1)
});

/**
 * Schema for a selling plan line with ID
 */
export const sellingPlanLineWithIdSchema = sellingPlanLineSchema.extend({
  id: z.number().int().positive('Line ID must be a positive integer')
});

/**
 * Schema for a delivery policy
 */
export const deliveryPolicySchema = z.object({
  offerDiscount: z.boolean().default(false),
  intervalValue: z.number().int().positive('Interval value must be a positive integer'),
  intervalUnit: z.enum(['daily', 'weekly', 'monthly', 'annually'], {
    errorMap: () => ({ message: 'Interval unit must be one of: daily, weekly, monthly, annually' })
  }),
  discountType: z.enum(['percentage', 'fixed_amount', 'fixed_price'], {
    errorMap: () => ({ message: 'Discount type must be one of: percentage, fixed_amount, fixed_price' })
  }).optional(),
  discountValue: z.number().optional(),
  deliveryAnchor: z.number().int().min(1).max(31).optional()
});

/**
 * Schema for a delivery policy with ID
 */
export const deliveryPolicyWithIdSchema = deliveryPolicySchema.extend({
  id: z.number().int().positive('Policy ID must be a positive integer')
});

/**
 * Schema for product variant information
 */
export const productVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  sku: z.string(),
  customerPartnerNumber: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  metafield: z.any().nullable()
});

/**
 * Schema for product information
 */
export const productInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  handle: z.string(),
  image: z.array(z.any()),
  variant: productVariantSchema.nullable()
});

/**
 * Schema for company data
 */
export const companySchema = z.object({
  id: z.string()
});

/**
 * Schema for company location data
 */
export const companyLocationDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  externalId: z.string().nullable(),
  company: companySchema
});

// ============================================================================
// Database Model Schemas
// ============================================================================

/**
 * Schema for database selling plan model
 */
export const dbSellingPlanSchema = z.object({
  id: z.union([z.bigint(), z.number()]),
  name: z.string(),
  description: z.string().nullable(),
  currencyCode: z.string(),
  isDeleted: z.boolean(),
  storeName: z.string(),
  createdById: z.string().nullable(),
  companyLocationId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  deletedById: z.string().nullable()
});

/**
 * Schema for database selling plan line model
 */
export const dbSellingPlanLineSchema = z.object({
  id: z.union([z.bigint(), z.number()]),
  sellingPlanId: z.union([z.bigint(), z.number()]),
  variantId: z.string(),
  sku: z.string(),
  quantity: z.number(),
  storeName: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

/**
 * Schema for database delivery policy model
 */
export const dbSellingPlanDeliveryPolicySchema = z.object({
  id: z.union([z.bigint(), z.number()]),
  sellingPlanId: z.union([z.bigint(), z.number()]),
  offerDiscount: z.boolean(),
  intervalValue: z.number(),
  intervalUnit: z.string(),
  discountType: z.string().nullable(),
  discountValue: z.number().nullable(),
  deliveryAnchor: z.number().nullable(),
  storeName: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// ============================================================================
// Repository Operation Schemas
// ============================================================================

/**
 * Schema for repository create operation parameters
 */
export const createSellingPlanRepoParamsSchema = z.object({
  plan: z.object({
    name: z.string(),
    description: z.string().optional(),
    currencyCode: z.string(),
    storeName: z.string(),
    createdById: z.string().optional(),
    companyLocationId: z.string().optional()
  }),
  lines: z.array(sellingPlanLineSchema),
  deliveryPolicies: z.array(deliveryPolicySchema)
});

/**
 * Schema for repository create operation result
 */
export const createSellingPlanRepoResultSchema = z.object({
  sellingPlan: dbSellingPlanSchema,
  sellingPlanLines: z.array(dbSellingPlanLineSchema),
  deliveryPolicies: z.array(dbSellingPlanDeliveryPolicySchema)
});

/**
 * Schema for repository get by ID parameters
 */
export const getByIdRepoParamsSchema = z.object({
  id: z.union([z.number(), z.string()]),
  storeName: z.string()
});

/**
 * Schema for repository get by ID result
 */
export const getByIdRepoResultSchema = z.object({
  sellingPlan: dbSellingPlanSchema,
  sellingPlanLines: z.array(dbSellingPlanLineSchema),
  deliveryPolicies: z.array(dbSellingPlanDeliveryPolicySchema)
});

/**
 * Schema for repository find many parameters
 */
export const findManyRepoParamsSchema = z.object({
  storeName: z.string(),
  customerId: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  sort: z.array(
    z.object({
      field: z.string(),
      order: z.enum(['asc', 'desc'])
    })
  ).optional(),
  filters: z.object({
    name: z.string().optional(),
    status: z.string().optional(),
    companyLocationId: z.string().optional(),
    createdById: z.string().optional(),
    createdFrom: z.date().optional(),
    createdTo: z.date().optional()
  }).optional()
});

/**
 * Schema for repository find many result
 */
export const findManyRepoResultSchema = z.object({
  plans: z.array(dbSellingPlanSchema),
  totalCount: z.number(),
  page: z.number(),
  pageSize: z.number()
});

/**
 * Schema for repository update operation parameters
 */
export const updateSellingPlanRepoParamsSchema = z.object({
  id: z.number(),
  plan: z.object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    currencyCode: z.string().optional(),
    storeName: z.string(),
    updatedById: z.string().optional(),
    companyLocationId: z.string().nullable().optional()
  }),
  lines: z.array(
    z.object({
      id: z.number().optional(),
      variantId: z.string(),
      sku: z.string(),
      quantity: z.number()
    })
  ).optional(),
  deliveryPolicies: z.array(
    z.object({
      id: z.number().optional(),
      offerDiscount: z.boolean(),
      intervalValue: z.number(),
      intervalUnit: z.string(),
      discountType: z.string().optional(),
      discountValue: z.number().optional(),
      deliveryAnchor: z.number().optional()
    })
  ).optional(),
  linesToDelete: z.array(z.number()).optional(),
  policiesToDelete: z.array(z.number()).optional()
});

/**
 * Schema for repository update operation result
 */
export const updateSellingPlanRepoResultSchema = createSellingPlanRepoResultSchema;

// ============================================================================
// Service Internal Schemas
// ============================================================================

/**
 * Schema for line matching based on business keys
 */
export const lineTypeSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  sku: z.string(),
  variantId: z.string(),
  quantity: z.number()
}).passthrough();

/**
 * Schema for policy matching based on business keys
 */
export const policyTypeSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  intervalUnit: z.string(),
  intervalValue: z.number(),
  offerDiscount: z.boolean().optional()
}).passthrough();

/**
 * Schema for data changes calculation parameters
 */
export const dataChangesParamsSchema = z.object({
  lines: z.array(
    z.object({
      id: z.union([z.number(), z.bigint()]),
      variantId: z.string(),
      sku: z.string(),
      quantity: z.number()
    }).passthrough()
  ),
  policies: z.array(
    z.object({
      id: z.union([z.number(), z.bigint()]),
      intervalUnit: z.string(),
      intervalValue: z.number()
    }).passthrough()
  )
});

/**
 * Schema for data changes calculation result
 */
export const dataChangesResultSchema = z.object({
  linesToUpdate: z.array(lineTypeSchema),
  linesToCreate: z.array(lineTypeSchema),
  linesToDelete: z.array(z.number()),
  policiesToUpdate: z.array(policyTypeSchema),
  policiesToCreate: z.array(policyTypeSchema),
  policiesToDelete: z.array(z.number())
});

// ============================================================================
// Common Utility Schemas
// ============================================================================

/**
 * Schema for sort direction
 */
export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Schema for selling plan sort fields
 */
export const sellingPlanSortFieldSchema = z.enum([
  'id',
  'name',
  'currencyCode',
  'createdAt',
  'updatedAt'
]);

/**
 * Schema for sorting options
 */
export const sortSchema = z.object({
  field: sellingPlanSortFieldSchema,
  direction: sortDirectionSchema
});

/**
 * Schema for pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10)
});

/**
 * Schema for selling plan filters
 */
export const sellingPlanFilterSchema = z.object({
  name: z.string().optional(),
  companyLocationId: z.string().optional(),
  createdById: z.string().optional(),
  createdFrom: z.date().optional(),
  createdTo: z.date().optional()
});

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Schema for creating a selling plan
 */
export const createSellingPlanSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(255, 'Name must not exceed 255 characters'),
  description: z.string().optional(),
  currencyCode: z.string().length(3, 'Currency code must be 3 characters'),
  lines: z.array(sellingPlanLineSchema).min(1, 'At least one product line is required'),
  deliveryPolicies: z.array(deliveryPolicySchema).min(1, 'At least one delivery policy is required'),
  createdById: z.string().optional(),
  companyLocationId: z.string().optional()
});

/**
 * Schema for fetching selling plans
 */
export const fetchSellingPlansSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  customerId: z.string().optional(),
  pagination: paginationSchema.optional(),
  sort: z.array(sortSchema).optional(),
  filters: sellingPlanFilterSchema.optional()
});

/**
 * Schema for getting a selling plan by ID
 */
export const getSellingPlanByIdSchema = z.object({
  id: z.number(),
  storeName: z.string(),
  customerId: z.string().optional(),
}).strict();

/**
 * Schema for deleting a selling plan
 */
export const deleteSellingPlanSchema = z.object({
  id: z.number().int().positive('Selling plan ID must be a positive integer'),
  storeName: z.string().min(1, 'Store name is required'),
  customerId: z.string().min(1, 'Customer ID is required')
}).strict();

/**
 * Schema for updating a selling plan
 */
export const updateSellingPlanSchema = z.object({
  id: z.number().int().positive('Selling plan ID must be a positive integer'),
  storeName: z.string().min(1, 'Store name is required'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(255, 'Name must not exceed 255 characters').optional(),
  description: z.string().optional(),
  currencyCode: z.string().length(3, 'Currency code must be 3 characters').optional(),
  lines: z.array(sellingPlanLineSchema).optional(),
  deliveryPolicies: z.array(deliveryPolicySchema).optional(),
  linesToDelete: z.array(z.number().int().positive()).optional(),
  policiesToDelete: z.array(z.number().int().positive()).optional(),
  updatedById: z.string().optional(),
  companyLocationId: z.string().optional()
}).strict();

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Schema for a selling plan list item
 */
export const sellingPlanListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  currencyCode: z.string(),
  lineCount: z.number(),
  frequencyCount: z.number(),
  deliveryPolicies: z.array(deliveryPolicyWithIdSchema).optional(),
  discountDisplay: z.string(),
  pricing: z.string().optional(),
  createdById: z.string().optional(),
  // @deprecated Use companyLocation.id instead
  companyLocationId: z.string().optional(),
  companyLocation: z.object({
    id: z.string(),
    name: z.string(),
    externalId: z.string().nullable()
  }).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

/**
 * Schema for selling plan with lines and delivery policies
 */
export const sellingPlanWithLinesSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  currencyCode: z.string(),
  lines: z.array(productInfoSchema),
  deliveryPolicies: z.array(deliveryPolicyWithIdSchema),
  createdById: z.string().optional(),
  companyLocationId: z.string().nullable().optional(),
  companyLocation: companyLocationDataSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

/**
 * Schema for create selling plan response
 */
export const createSellingPlanResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  currencyCode: z.string(),
  lines: z.array(sellingPlanLineWithIdSchema),
  deliveryPolicies: z.array(deliveryPolicyWithIdSchema),
  createdById: z.string().optional(),
  companyLocationId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

/**
 * Schema for delete selling plan response
 */
export const deleteSellingPlanResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

/**
 * Schema for fetch selling plans response
 */
export const fetchSellingPlansResponseSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  sellingPlans: z.array(sellingPlanListItemSchema)
});

/**
 * Schema for update selling plan response
 */
export const updateSellingPlanResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  currencyCode: z.string(),
  lines: z.array(sellingPlanLineWithIdSchema),
  deliveryPolicies: z.array(deliveryPolicyWithIdSchema),
  updatedById: z.string().optional(),
  companyLocationId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// ============================================================================
// Type Exports
// ============================================================================

// Base Types
export type SellingPlanLine = z.infer<typeof sellingPlanLineSchema>;
export type SellingPlanLineWithId = z.infer<typeof sellingPlanLineWithIdSchema>;
export type DeliveryPolicy = z.infer<typeof deliveryPolicySchema>;
export type DeliveryPolicyWithId = z.infer<typeof deliveryPolicyWithIdSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type ProductInfo = z.infer<typeof productInfoSchema>;
export type CompanyLocationData = z.infer<typeof companyLocationDataSchema>;

// Type for delivery policy interval unit and discount type
export type IntervalUnit = z.infer<typeof deliveryPolicySchema>['intervalUnit'];
export type DiscountType = NonNullable<z.infer<typeof deliveryPolicySchema>['discountType']>;

// Database Model Types
export type DbSellingPlan = z.infer<typeof dbSellingPlanSchema>;
export type DbSellingPlanLine = z.infer<typeof dbSellingPlanLineSchema>;
export type DbSellingPlanDeliveryPolicy = z.infer<typeof dbSellingPlanDeliveryPolicySchema>;

// Repository Operation Types
export type CreateSellingPlanRepoParams = z.infer<typeof createSellingPlanRepoParamsSchema>;
export type CreateSellingPlanRepoResult = z.infer<typeof createSellingPlanRepoResultSchema>;
export type GetByIdRepoParams = z.infer<typeof getByIdRepoParamsSchema>;
export type GetByIdRepoResult = z.infer<typeof getByIdRepoResultSchema>;
export type FindManyRepoParams = z.infer<typeof findManyRepoParamsSchema>;
export type FindManyRepoResult = z.infer<typeof findManyRepoResultSchema>;
export type UpdateSellingPlanRepoParams = z.infer<typeof updateSellingPlanRepoParamsSchema>;
export type UpdateSellingPlanRepoResult = z.infer<typeof updateSellingPlanRepoResultSchema>;

// Service Internal Types
export type LineType = z.infer<typeof lineTypeSchema>;
export type PolicyType = z.infer<typeof policyTypeSchema>;
export type DataChangesParams = z.infer<typeof dataChangesParamsSchema>;
export type DataChangesResult = z.infer<typeof dataChangesResultSchema>;

// Utility Types
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type SellingPlanSortField = z.infer<typeof sellingPlanSortFieldSchema>;
export type Sort = z.infer<typeof sortSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type SellingPlanFilter = z.infer<typeof sellingPlanFilterSchema>;

// Request Types
export type CreateSellingPlanRequest = z.infer<typeof createSellingPlanSchema>;
export type FetchSellingPlansRequest = z.infer<typeof fetchSellingPlansSchema>;
export type GetSellingPlanByIdRequest = z.infer<typeof getSellingPlanByIdSchema>;
export type DeleteSellingPlanRequest = z.infer<typeof deleteSellingPlanSchema>;
export type UpdateSellingPlanRequest = z.infer<typeof updateSellingPlanSchema>;

// Response Types
export type SellingPlanListItem = z.infer<typeof sellingPlanListItemSchema>;
export type SellingPlanWithLines = z.infer<typeof sellingPlanWithLinesSchema>;
export type CreateSellingPlanResponse = z.infer<typeof createSellingPlanResponseSchema>;
export type DeleteSellingPlanResponse = z.infer<typeof deleteSellingPlanResponseSchema>;
export type FetchSellingPlansResponse = z.infer<typeof fetchSellingPlansResponseSchema>;
export type UpdateSellingPlanResponse = z.infer<typeof updateSellingPlanResponseSchema>;