import { z } from "zod";
import { isoDateSchema } from '~/types/quotes/quote-base.schema';

// Schema for the subscription order item returned in the response
export const SubscriptionOrderListItemSchema = z.object({
  id: z.number().or(z.bigint()),
  subscriptionContractId: z.number().or(z.bigint()),
  shopifyOrderId: z.string(),
  orderNumber: z.string().describe("Order number (e.g., #1110)"),
  orderTotal: z.string().or(z.number()).describe("Total amount of the order"),
  status: z.string().describe("Status of the order (e.g., Open)"),
  poNumber: z.string().nullable().describe("Purchase Order number if available"),
  createdById: z.string().nullable(),
  createdByName: z.string().describe("Name of the person who created the order"),
  approvedById: z.string().nullable(),
  approvedByName: z.string().describe("Name of the person who approved the order"),
  orderedDate: isoDateSchema.describe("Date when the order was placed"),
  createdAt: isoDateSchema.describe("Date when the order record was created"),
});

// Pagination schema for request
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().min(1).max(100).default(10),
});

// Filter schema
export const SubscriptionOrdersFilterSchema = z.object({
  status: z.array(z.string()).optional(),
  poNumber: z.string().optional(),
  orderNumber: z.string().optional(),
  approvedByName: z.string().optional(),
  createdFrom: isoDateSchema.optional(),
  createdTo: isoDateSchema.optional(),
});

// Sort schema
export const SubscriptionOrdersSortSchema = z.object({
  field: z.enum([
    "createdAt",
    "orderNumber",
    "poNumber",
    "orderTotal",
    "status",
    "orderedDate",
    "createdByName",
    "approvedByName"
  ]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// Request schema for POST /api/v1/subscription-orders/fetch-all
export const FetchSubscriptionOrdersSchema = z.object({
  storeName: z.string(),
  companyLocationId: z.string().optional(),
  customerId: z.string(),
  subscriptionContractId: z.number().optional(),
  filter: SubscriptionOrdersFilterSchema.optional(),
  pagination: PaginationSchema.optional().default({
    page: 1,
    pageSize: 10,
  }),
  sort: SubscriptionOrdersSortSchema.optional().default({
    field: "createdAt",
    order: "desc",
  }),
});

// Response schema - flattened structure
export const SubscriptionOrdersResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  data: z.array(SubscriptionOrderListItemSchema),
});

// Type exports
export type SubscriptionOrderListItem = z.infer<typeof SubscriptionOrderListItemSchema>;
export type FetchSubscriptionOrdersRequest = z.infer<typeof FetchSubscriptionOrdersSchema>;
export type SubscriptionOrdersResponse = z.infer<typeof SubscriptionOrdersResponseSchema>;
export type SubscriptionOrdersFilter = z.infer<typeof SubscriptionOrdersFilterSchema>;
export type SubscriptionOrdersSort = z.infer<typeof SubscriptionOrdersSortSchema>;