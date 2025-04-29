import { subscriptionOrderRepository } from "~/repositories/subscription-contracts/subscription-order.repository";
import type { 
  FetchSubscriptionOrdersRequest, 
  SubscriptionOrdersResponse,
  SubscriptionOrderListItem
} from "~/types/subscription-contracts/subscription-orders-list.schema";
import { formatPrice } from "~/lib/utils";

/**
 * Service for managing subscription orders
 */
export class SubscriptionOrderService {
  /**
   * Fetch subscription orders with filtering, pagination, and sorting
   */
  public async fetchAll(params: FetchSubscriptionOrdersRequest): Promise<SubscriptionOrdersResponse> {
    // Fetch orders from repository
    const result = await subscriptionOrderRepository.fetchSubscriptionOrders(params);
    
    // Format the response data - preserve original ID types
    const formattedRecords: SubscriptionOrderListItem[] = result.records.map(order => ({
      ...order,
      // Format currency if it's a number
      orderTotal: this.formatOrderTotal(order.orderTotal),
    }));
    
    // Return formatted response according to API specification - flat structure
    return {
      total: result.pagination.total,
      page: result.pagination.page,
      pageSize: result.pagination.pageSize,
      data: formattedRecords,
    };
  }

  /**
   * Format order total as currency string
   */
  private formatOrderTotal(total: string | number): string {
    if (!total) return "";
    
    const numericTotal = typeof total === "string" ? parseFloat(total) : total;
    
    if (isNaN(numericTotal)) return total.toString();
    
    // Format as USD currency by default
    return formatPrice(numericTotal, "USD");
  }
}

export const subscriptionOrderService = new SubscriptionOrderService(); 