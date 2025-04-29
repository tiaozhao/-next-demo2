import { z } from 'zod';
import { PurchaseOrderSchema } from './purchase-order.schema';

/**
 * Purchase Order data type
 * Defines the purchase order data structure extracted from AI
 */
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>; 