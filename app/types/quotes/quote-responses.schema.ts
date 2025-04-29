import { z } from 'zod';
import { QuoteStatus, quoteItemSchema } from './quote-base.schema';

/**
 * Schema for Quote response
 */
export const quoteResponseSchema = z.object({
  id: z.number(),
  customerId: z.string(),
  companyLocationId: z.string().nullable(),
  subtotal: z.number(),
  currencyCode: z.string(),
  status: z.enum([QuoteStatus.SUBMITTED, QuoteStatus.APPROVED, QuoteStatus.DECLINED, QuoteStatus.CANCELLED, QuoteStatus.EXPIRED, QuoteStatus.ORDERED]),
  poNumber: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  updatedBy: z.string().nullable(),
  actionBy: z.string().nullable(),
  quoteItems: z.array(quoteItemSchema),
  itemCount: z.number(),
  metafield: z.object({
    value: z.string()
  }).nullable()
});

/**
 * Schema for Quote response with customer information
 */
export const quoteWithCustomerSchema = quoteResponseSchema
  .omit({ customerId: true })
  .extend({
    customer: z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      phone: z.string().nullable(),
      state: z.string().nullable()
    }).nullable(),
    companyLocationDetails: z.object({
      id: z.string(),
      name: z.string(),
      externalId: z.string().nullable(),
      company: z.object({
        id: z.string(),
        name: z.string()
      }),
      shippingAddress: z.any().nullable(),
      billingAddress: z.any().nullable()
    }).nullable(),
    quoteItems: z.array(z.object({
      quantity: z.number(),
      originalPrice: z.number(),
      offerPrice: z.number(),
      description: z.string().nullable().optional(),
      variant: z.object({
        id: z.string(),
        title: z.string(),
        sku: z.string().nullable(),
        inventoryQuantity: z.number().nullable(),
        customerPartnerNumber: z.string().nullable(),
        price: z.any().nullable(),
        quantityRule: z.any().nullable(),
        image: z.any().nullable(),
        product: z.object({
          id: z.string(),
          title: z.string(),
          handle: z.string().nullable(),
          images: z.array(z.any()).nullable()
        }).nullable()
      }).nullable()
    }))
  });

/**
 * Schema for paginated Quote response
 */
export const quoteListResponseSchema = z.object({
  quotes: z.array(quoteWithCustomerSchema),
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number()
});

/**
 * Schema for expire quote response
 */
export const expireQuoteResponseSchema = z.object({
  code: z.number(),
  message: z.string()
}).strict();

/**
 * Schema for convert quote to order response
 */
export const convertQuoteToOrderResponseSchema = z.object({
  code: z.number(),
  message: z.string()
}).strict();

// TypeScript types derived from Zod schemas
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
export type QuoteWithCustomer = z.infer<typeof quoteWithCustomerSchema>;
export type QuoteListResponse = z.infer<typeof quoteListResponseSchema>;
export type ExpireQuoteResponse = z.infer<typeof expireQuoteResponseSchema>;
export type ConvertQuoteToOrderResponse = z.infer<typeof convertQuoteToOrderResponseSchema>;
