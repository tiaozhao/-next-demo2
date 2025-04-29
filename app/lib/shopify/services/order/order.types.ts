import { z } from 'zod';

/**
 * Recent order items request schema
 */
export const recentOrderItemsRequestSchema = z.object({
  storeDomain: z.string(),
  companyLocationId: z.string()
});

export type RecentOrderItemsRequest = z.infer<typeof recentOrderItemsRequestSchema>;

/**
 * Recent order item schema
 */
export const recentOrderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  quantity: z.number(),
  product: z.object({
    id: z.string(),
    title: z.string()
  }).optional(),
  orderCreatedAt: z.string()
});

export type RecentOrderItem = z.infer<typeof recentOrderItemSchema>;

/**
 * Recent order items response schema
 */
export const recentOrderItemsResponseSchema = z.object({
  id: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  items: z.array(recentOrderItemSchema)
});

export type RecentOrderItemsResponse = z.infer<typeof recentOrderItemsResponseSchema>;

/**
 * Recent orders response schema - contains multiple orders
 */
export const recentOrdersResponseSchema = z.object({
  orders: z.array(recentOrderItemsResponseSchema)
});

export type RecentOrdersResponse = z.infer<typeof recentOrdersResponseSchema>;