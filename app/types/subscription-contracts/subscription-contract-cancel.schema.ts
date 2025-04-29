import { z } from 'zod';

/**
 * Schema for subscription contract cancel request
 */
export const subscriptionContractCancelSchema = z.object({
  /**
   * Store name in format "store-name.myshopify.com"
   */
  storeName: z.string().min(1),
  
  /**
   * Shopify customer ID
   */
  customerId: z.string().min(1),
  
  /**
   * Company location ID associated with the subscription
   */
  companyLocationId: z.string().min(1),

  /**
   * Subscription contract ID to cancel
   */
  subscriptionContractId: z.number(),

  /**
   * ID of the approver (company contact ID)
   */
  approvedById: z.string().min(1),

  /**
   * Name of the approver
   */
  approvedByName: z.string().min(1),

  /**
   * Note to be added to the subscription contract
   */
  note: z.string().optional(),
});

/**
 * Type definition for subscription contract cancel request
 */
export type SubscriptionContractCancelRequest = z.infer<typeof subscriptionContractCancelSchema>;

/**
 * Schema for subscription contract cancel response
 */
export const subscriptionContractCancelResponseSchema = z.object({
  /**
   * Whether the cancel operation was successful
   */
  success: z.boolean(),
  
  /**
   * Message describing the result of the operation
   */
  message: z.string(),
});

/**
 * Type definition for subscription contract cancel response
 */
export type SubscriptionContractCancelResponse = z.infer<typeof subscriptionContractCancelResponseSchema>; 