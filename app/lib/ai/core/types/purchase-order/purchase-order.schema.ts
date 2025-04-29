import { z } from 'zod';

/**
 * Definition of Purchase Order data structure
 */
export const PurchaseOrderSchema = z.object({
  orderNumber: z.string().nullable().optional()
    .transform(val => {
      if (val) return val;
      return null;
    }),
  date: z.string().nullable()
    .transform(val => {
      if (!val) {
        // If date is null, use current date
        return new Date().toISOString().split('T')[0];
      }
      // Try to parse and format the date
      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          return new Date().toISOString().split('T')[0];
        }
        return date.toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    }),
  customerName: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  billingAddress: z.object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    company: z.string().nullable(),
    address1: z.string().nullable(),
    address2: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    zip: z.string().nullable(),
    country: z.string().nullable(),
    phone: z.string().nullable().optional(),
    countryCode: z.string().nullable().optional(),
    provinceCode: z.string().nullable().optional(),
  }),
  shippingAddress: z.object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    company: z.string().nullable(),
    address1: z.string().nullable(),
    address2: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    zip: z.string().nullable(),
    country: z.string().nullable(),
    phone: z.string().nullable().optional(),
    countryCode: z.string().nullable().optional(),
    provinceCode: z.string().nullable().optional(),
  }),
  items: z.array(z.object({
    customerPartNumber: z.string().nullable(),
    sku: z.string().nullable(),
    name: z.string(),
    quantity: z.number().positive(),
    price: z.number(),
    taxable: z.boolean().nullable().default(false),
    properties: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })).optional(),
  }))
    .transform(items => {
      return items.map(item => {
        // Handle product code splitting if applicable
        if (item.sku && item.sku.includes(' ') && !item.customerPartNumber) {
          const [partNumber, sku] = item.sku.split(' ');
          return {
            ...item,
            customerPartNumber: partNumber,
            sku: sku
          };
        }

        // Handle case where customerPartNumber exists but sku is empty or null
        if ((!item.sku || item.sku === '') && item.customerPartNumber) {
          return {
            ...item,
            sku: item.customerPartNumber
          };
        }

        return item;
      });
    }),
  currency: z.string().nullable().default('USD'),
  taxExempt: z.boolean().nullable().default(false),
  poNumber: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  shippingMethod: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  subtotalPrice: z.number().nullable().optional()
    .transform(val => val ?? 0),
  totalTax: z.number().default(0),
  totalShipping: z.number().default(0),
  totalDiscounts: z.number().nullable().default(0),
  totalPrice: z.number(),
}).transform(data => {
  // Ensure shippingAddress defaults to billingAddress if empty
  const emptyShippingAddress = !data.shippingAddress.address1 &&
    !data.shippingAddress.city &&
    !data.shippingAddress.company;

  if (data.billingAddress && emptyShippingAddress) {
    data.shippingAddress = { ...data.billingAddress };
  }

  // Calculate subtotalPrice if not provided
  if (!data.subtotalPrice && data.items && data.items.length > 0) {
    data.subtotalPrice = data.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
  }

  return data;
}); 