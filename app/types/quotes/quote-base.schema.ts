import { z } from "zod";

/**
 * Validates that a string is a valid ISO 8601 date format
 * Accepts both full ISO 8601 (with time) and date-only formats
 */
const isValidISODate = (value: string) => {
  if (!value) return false;

  // Check for full ISO 8601 format (with time)
  // This includes standard format with two-digit hours: 2025-04-25T06:00:00.000Z
  // And also accepts single-digit hours: 2025-04-25T6:00:00.000Z
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

  // Check for date-only format (YYYY-MM-DD)
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (isoRegex.test(value) || dateOnlyRegex.test(value)) {
    // Additional validation: make sure it's a valid date
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  return false;
};

/**
 * Schema for date strings in ISO 8601 format
 */
export const isoDateSchema = z.string().refine(isValidISODate, {
  message: "Invalid date format. Must be ISO 8601 format (YYYY-MM-DDThh:mm:ss.sssZ) or date-only format (YYYY-MM-DD)"
});

/**
 * Quote status enum
 */
export const QuoteStatus = {
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  ORDERED: "Ordered",
} as const;

export type QuoteStatusType = (typeof QuoteStatus)[keyof typeof QuoteStatus];

/**
 * Quote note type enum
 */
export const QuoteNoteType = {
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  ORDERED: "Ordered",
} as const;

export type QuoteNoteTypeEnum =
  (typeof QuoteNoteType)[keyof typeof QuoteNoteType];

/**
 * Common fields for all quote-related requests
 */
export const quoteBaseRequestSchema = z.object({
  storeName: z.string(),
});

/**
 * Common fields for quote operations that require identification
 */
export const quoteIdentifierSchema = z.object({
  quoteId: z.number(),
  companyLocationId: z.string(),
  customerId: z.string(),
});

/**
 * Base schema for Quote items
 */
export const quoteItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  quantity: z.number().min(1),
  originalPrice: z.number().min(0),
  offerPrice: z.number().min(0),
  description: z.string().nullable().optional(),
});

/**
 * Schema for Quote data in create request
 */
export const quoteDataSchema = z.object({
  customerId: z.string(),
  companyLocationId: z.string().nullable(),
  currencyCode: z.string().default("USD"),
  requestNote: z.string().nullable().optional(),
  poNumber: z.string().nullable().optional(),
  quoteItems: z.array(quoteItemSchema),
  expirationDate: isoDateSchema.nullable().optional(),
});

/**
 * Base schema for Quote input
 */
export const quoteInputSchema = z.object({
  storeName: z.string(),
  quote: quoteDataSchema,
});

/**
 * Schema for pagination
 */
export const quotePaginationSchema = z
  .object({
    page: z.number().int().positive().optional().default(1),
    pageSize: z.number().int().positive().optional().default(10),
  })
  .optional()
  .default({
    page: 1,
    pageSize: 10,
  });

/**
 * Schema for quote filtering
 */
export const quoteFilterSchema = z
  .object({
    id: z.number().int().optional(),
    customer: z.string().optional(),
    customerIds: z.array(z.string()).optional(),
    companyLocationId: z.string().optional(),
    currencyCode: z.string().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
    actionBy: z.string().optional(),
    poNumber: z.string().optional(),
    status: z
      .enum([
        "Submitted",
        "Approved",
        "Declined",
        "Cancelled",
        "Expired",
        "Ordered",
      ])
      .optional(),

    // Date fields with ISO 8601 validation
    createdAt: isoDateSchema.optional(),
    updatedAt: isoDateSchema.optional(),
    expirationDate: isoDateSchema.optional(),
  })
  .optional()
  .default({});

/**
 * Schema for quote sort fields
 */
export const quoteSortFieldSchema = z.enum([
  "id",
  "customerId",
  "companyLocationId",
  "subtotal",
  "currencyCode",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
]);

/**
 * Schema for quote sort item
 */
export const quoteSortItemSchema = z.object({
  field: quoteSortFieldSchema,
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Schema for quote sorting
 */
export const quoteSortSchema = z
  .array(quoteSortItemSchema)
  .optional()
  .default([{ field: "createdAt", order: "desc" }]);

/**
 * Schema for quote note
 */
export const quoteNoteSchema = z.object({
  quoteId: z.number(),
  noteType: z.enum([
    QuoteNoteType.SUBMITTED,
    QuoteNoteType.APPROVED,
    QuoteNoteType.DECLINED,
    QuoteNoteType.CANCELLED,
    QuoteNoteType.EXPIRED,
    QuoteNoteType.ORDERED,
  ]),
  noteContent: z.string().optional().nullable(),
  createdBy: z.string(),
});

/**
 * Customer information type
 */
export type CustomerInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  state: string | null;
};

// TypeScript types derived from Zod schemas
export type QuoteItem = z.infer<typeof quoteItemSchema>;
export type QuoteData = z.infer<typeof quoteDataSchema>;
export type QuotePagination = z.infer<typeof quotePaginationSchema>;
export type QuoteFilter = z.infer<typeof quoteFilterSchema>;
export type QuoteSortField = z.infer<typeof quoteSortFieldSchema>;
export type QuoteSortItem = z.infer<typeof quoteSortItemSchema>;
export type QuoteNoteInput = z.infer<typeof quoteNoteSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
