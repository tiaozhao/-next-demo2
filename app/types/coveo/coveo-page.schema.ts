import { z } from 'zod';

/**
 * Schema for raw Shopify page data
 */
export const shopifyPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  handle: z.string(),
  isPublished: z.boolean()
}).strict();

/**
 * Schema for Shopify page response
 */
export const shopifyPageResponseSchema = z.object({
  data: z.object({
    pages: z.object({
      edges: z.array(z.object({
        node: shopifyPageSchema
      })),
      pageInfo: z.object({
        endCursor: z.string().nullable(),
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        startCursor: z.string().nullable()
      })
    })
  }).optional()
}).strict();

/**
 * Schema for transformed Coveo page data
 */
export const coveoPageSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  ec_page_id: z.string(),
  body: z.string().describe('Plain text content (HTML tags removed)'),
  ec_body: z.string().describe('Original HTML content'),
  ec_handle: z.string(),
  objecttype: z.literal('Page'),
  ec_is_published: z.boolean()
}).strict();

/**
 * Schema for Coveo configuration
 */
export const coveoConfigSchema = z.object({
  organizationId: z.string(),
  apiKey: z.string(),
  productSource: z.object({
    name: z.string(),
    pushSourceId: z.string()
  }),
  pageSource: z.object({
    name: z.string(),
    pushSourceId: z.string()
  })
}).strict(); 