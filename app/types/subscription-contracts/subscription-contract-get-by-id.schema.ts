import { z } from 'zod';
import { isoDateSchema } from '~/types/quotes/quote-base.schema';

/**
 * Schema for getting a subscription contract by ID
 */
export const getSubscriptionContractByIdSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  id: z.number().int().positive('Subscription contract ID must be a positive integer'),
  customerId: z.string().optional(),
});

/**
 * Get subscription contract by ID request type
 */
export type GetSubscriptionContractByIdRequest = z.infer<typeof getSubscriptionContractByIdSchema>;

/**
 * Customer information schema
 */
export const customerInfoSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  state: z.string().nullable(),
  createdAt: isoDateSchema.nullable(),
  updatedAt: isoDateSchema.nullable(),
});

/**
 * Address information schema
 */
export const addressInfoSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  address1: z.string().nullable(),
  address2: z.string().nullable(),
  city: z.string().nullable(),
  companyName: z.string().nullable(),
  country: z.string().nullable(),
  countryCode: z.string().nullable(),
  province: z.string().nullable(),
  zip: z.string().nullable(),
  recipient: z.string().nullable(),
  zoneCode: z.string().nullable(),
  phone: z.string().nullable(),
});

/**
 * Payment terms information schema
 */
export const paymentTermsInfoSchema = z.object({
  id: z.string(),
  description: z.string(),
  dueInDays: z.number(),
  name: z.string(),
  paymentTermsType: z.string(),
  translatedName: z.string().nullable(),
});

/**
 * Company location information schema
 */
export const companyLocationInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  externalId: z.string().nullable(),
  paymentTerms: paymentTermsInfoSchema.nullable(),
  billingAddress: addressInfoSchema.nullable(),
  shippingAddress: addressInfoSchema.nullable(),
});

/**
 * Product variant information schema
 */
export const productVariantInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  sku: z.string().nullable(),
  customerPartnerNumber: z.string().nullable(),
  quantity: z.number().optional(),
  price: z.number().optional(),
  metafield: z.any().nullable(),
});

/**
 * Product information schema
 */
export const productInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  handle: z.string(),
  image: z.array(z.any()),
  variant: productVariantInfoSchema.nullable(),
});



export const sellingPlanInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
});

/**
 * Subscription contract response schema
 */
export const subscriptionContractResponseSchema = z.object({
  // Basic information
  id: z.number(),
  name: z.string(),
  status: z.string(),
  currencyCode: z.string(),

  // Time information
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  nextOrderDate: isoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,

  // Subscription information
  intervalValue: z.number(),
  intervalUnit: z.string(),
  shippingCost: z.number(),
  shippingMethodName: z.string(),
  shippingMethodId: z.string(),
  discountType: z.string(),
  discountValue: z.number(),

  // Business information
  note: z.string().nullable(),
  poNumber: z.string().nullable(),
  approvedById: z.string().nullable(),
  approvedByName: z.string().nullable(),
  customer: customerInfoSchema.nullable(),
  companyLocation: companyLocationInfoSchema.nullable(),

  // Line items information
  lines: z.array(productInfoSchema),

  // Selling plan information
  sellingPlan: sellingPlanInfoSchema.optional().nullable(),
});



/**
 * Get subscription contract by ID response schema
 */
export const getSubscriptionContractByIdResponseSchema = z.object({
  subscriptionContract: subscriptionContractResponseSchema,
});

/**
 * Type definitions
 */
export type CustomerInfo = z.infer<typeof customerInfoSchema>;
export type AddressInfo = z.infer<typeof addressInfoSchema>;
export type PaymentTermsInfo = z.infer<typeof paymentTermsInfoSchema>;
export type CompanyLocationInfo = z.infer<typeof companyLocationInfoSchema>;
export type ProductVariantInfo = z.infer<typeof productVariantInfoSchema>;
export type ProductInfo = z.infer<typeof productInfoSchema>;
export type GetSubscriptionContractByIdResponse = z.infer<typeof getSubscriptionContractByIdResponseSchema>;