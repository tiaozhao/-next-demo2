import { z } from 'zod';
import { isoDateSchema } from '~/types/quotes/quote-base.schema';

/**
 * Schema for subscription scheduling request
 */
export const subscriptionContractScheduleSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
}).strict();

/**
 * Type for subscription scheduling request
 */
export type SubscriptionContractScheduleRequest = z.infer<typeof subscriptionContractScheduleSchema>;

/**
 * Type for subscription schedule failure record
 */
export interface SubscriptionScheduleFailure {
  subscriptionContractId: number;
  reason: string;
}

/**
 * Type for subscription scheduling response
 */
export interface SubscriptionContractScheduleResponse {
  success: boolean;
  summary: {
    total: number;
    scheduled: number;
    skipped: number;
    failed: SubscriptionScheduleFailure[];
  };
  details?: {
    completedDueToEndDate: number;
    ordersCreated: number;
    markedCompletedAfterOrder: number;
  };
}

/**
 * Log status enum
 */
export enum SubscriptionScheduleLogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Interface for subscription data
 */
export interface SubscriptionData {
  id: bigint;
  intervalValue: number;
  intervalUnit: string;
  startDate: string | Date;
  endDate?: string | Date;
  currencyCode: string;
  orderTotal: number;
  deliveryAnchor?: number;
  status: string;
  // Next order date
  nextOrderCreationDate?: string | Date;
  // B2B fields
  customerId?: string;
  companyId?: string;
  companyLocationId: string;
  poNumber?: string;
  // Shipping fields
  shippingMethodId?: string;
  shippingMethodName?: string;
  shippingCost?: number;
  // Approval fields
  approvedById?: string;
  approvedByName?: string;
}

/**
 * Interface for subscription line data
 */
export interface SubscriptionLineData {
  id: number;
  productId: string;
  quantity: number;
  price: number;
  sku: string;
  variantId: string;
}

/**
 * Command object representing a subscription processing task
 */
export interface SubscriptionCommand {
  subscription: SubscriptionData;
  lines: SubscriptionLineData[];
  storeName: string;
  status: 'pending' | 'validated' | 'skipped' | 'failed' | 'completed';
  result?: {
    success: boolean;
    message: string;
    nextOrderDate?: Date;
    orderId?: string;
    orderNumber?: string;
  };
  error?: unknown;
  reason?: string;
}