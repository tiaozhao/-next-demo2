import { z } from 'zod';
import {
  quoteBaseRequestSchema,
  quoteDataSchema,
  quoteFilterSchema,
  quoteIdentifierSchema,
  quoteItemSchema,
  quotePaginationSchema,
  quoteSortSchema,
  isoDateSchema
} from './quote-base.schema';

/**
 * Schema for creating a new Quote
 */
export const createQuoteSchema = quoteBaseRequestSchema.extend({
  quote: quoteDataSchema
}).strict();

/**
 * Schema for updating a Quote
 */
export const updateQuoteSchema = z.object({
  additionalNotes: z.string().nullable(),
  quoteItems: z.array(quoteItemSchema).optional(),
  status: z.enum(['Submitted', 'Approved', 'Declined', 'Cancelled', 'Expired', 'Ordered']).optional(),
  actionBy: z.string().optional()
}).strict();

/**
 * Schema for Quote status update
 */
export const updateQuoteStatusSchema = z.object({
  status: z.enum(['Submitted', 'Approved', 'Declined', 'Cancelled', 'Expired', 'Ordered']),
  actionBy: z.string()
}).strict();

/**
 * Schema for Quote search parameters
 */
export const quoteSearchSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  status: z.enum(['Submitted', 'Approved', 'Declined', 'Cancelled', 'Expired', 'Ordered']).optional(),
  customerId: z.string().optional(),
  companyLocationId: z.string().optional()
}).strict();

/**
 * Schema for fetching quotes
 */
export const fetchQuotesSchema = quoteBaseRequestSchema.extend({
  companyLocationId: z.string().optional(),
  pagination: quotePaginationSchema,
  filter: quoteFilterSchema,
  sort: quoteSortSchema
}).strict();

/**
 * Schema for getting quote details
 */
export const quoteDetailsRequestSchema = quoteBaseRequestSchema.extend({
  quoteId: z.number(),
  companyLocationId: z.string().optional(),
  customerId: z.string().optional()
}).strict();

/**
 * Schema for approving a quote
 */
export const approveQuoteSchema = quoteBaseRequestSchema.extend({
  ...quoteIdentifierSchema.shape,
  approveNote: z.string().optional().nullable()
}).strict();

/**
 * Schema for rejecting a quote
 */
export const rejectQuoteSchema = quoteBaseRequestSchema.extend({
  ...quoteIdentifierSchema.shape,
  rejectNote: z.string().min(1).max(500)
}).strict();

/**
 * Schema for cancelling a quote
 */
export const cancelQuoteSchema = quoteBaseRequestSchema.extend({
  ...quoteIdentifierSchema.shape,
  cancelNote: z.string().optional().nullable()
}).strict();

/**
 * Schema for expiring a quote
 */
export const expireQuoteSchema = quoteBaseRequestSchema.extend({
  quoteId: z.number().optional(),
  companyLocationId: z.string().optional(),
  customerId: z.string().optional(),
  expireNote: z.string().optional().nullable()
}).strict();

/**
 * Schema for bulk deleting quotes
 */
export const bulkDeleteQuotesSchema = quoteBaseRequestSchema.extend({
  companyLocationId: z.string(),
  customerId: z.string(),
  quoteIds: z.array(z.number()).min(1, 'At least one quote ID must be provided')
}).strict();

/**
 * Schema for quote item update operations
 */
export const quoteItemUpdateSchema = quoteItemSchema.strict();

/**
 * Schema for quote items update request
 */
export const updateQuoteItemsSchema = quoteBaseRequestSchema.extend({
  ...quoteIdentifierSchema.shape,
  quoteItems: z.array(quoteItemUpdateSchema).min(1, 'At least one quote item must be provided'),
  expirationDate: isoDateSchema.optional(),
  poNumber: z.string().optional(),
  note: z.object({
    id: z.number().optional(),
    content: z.string().optional().nullable()
  }).optional()
}).strict();

/**
 * Schema for converting a quote to order request
 */
export const convertQuoteToOrderSchema = quoteBaseRequestSchema.extend({
  ...quoteIdentifierSchema.shape,
  note: z.string().optional().nullable(),
  shippingLine: z.object({
    title: z.string(),
    priceWithCurrency: z.object({
      amount: z.number(),
      currencyCode: z.string()
    })
  }).optional()
}).strict();

// TypeScript types derived from Zod schemas
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;
export type QuoteSearchParams = z.infer<typeof quoteSearchSchema>;
export type FetchQuotesParams = z.infer<typeof fetchQuotesSchema>;
export type QuoteDetailsRequest = z.infer<typeof quoteDetailsRequestSchema>;
export type ApproveQuoteRequest = z.infer<typeof approveQuoteSchema>;
export type RejectQuoteRequest = z.infer<typeof rejectQuoteSchema>;
export type CancelQuoteRequest = z.infer<typeof cancelQuoteSchema>;
export type ExpireQuoteRequest = z.infer<typeof expireQuoteSchema>;
export type BulkDeleteQuotesRequest = z.infer<typeof bulkDeleteQuotesSchema>;
export type QuoteItemUpdate = z.infer<typeof quoteItemUpdateSchema>;
export type UpdateQuoteItemsRequest = z.infer<typeof updateQuoteItemsSchema>;
export type ConvertQuoteToOrderRequest = z.infer<typeof convertQuoteToOrderSchema>;
