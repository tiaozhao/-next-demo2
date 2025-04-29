import { z } from 'zod';

/**
 * Schema for validating assign customer to company request
 */
export const assignCustomerSchema = z.object({
  customerId: z.string(),
  storeName: z.string(),
});

export type AssignCustomerRequest = z.infer<typeof assignCustomerSchema>; 