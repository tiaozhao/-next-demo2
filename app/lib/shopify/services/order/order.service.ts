import { loggerService } from '~/lib/logger';
import { ShopifyClientManager } from '~/lib/shopify/client';
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { GET_RECENT_ORDER_ITEMS_QUERY } from './order.graphql';
import { handleGraphQLErrors } from './order.utils';
import type { 
  RecentOrderItemsRequest, 
  RecentOrderItemsResponse,
  RecentOrdersResponse
} from './order.types';

/**
 * Service for order-related operations
 */
export class ShopifyOrderService {
  private readonly CLASS_NAME = 'OrderService';
  private readonly tracer = trace.getTracer('order-service');
  
  /**
   * Get recent order items for recommendations
   * @param params Request parameters
   * @returns List of recent orders with their items
   */
  public async getRecentOrderItems(params: RecentOrderItemsRequest): Promise<RecentOrdersResponse> {
    return this.tracer.startActiveSpan('order.getRecentOrderItems', async (span) => {
      const METHOD = 'getRecentOrderItems';
      const start = Date.now();
      
      try {
        span.setAttribute('store.domain', params.storeDomain);
        span.setAttribute('company_location.id', params.companyLocationId);
        
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Fetching recent order items`, {
          storeDomain: params.storeDomain,
          companyLocationId: params.companyLocationId
        });

        const client = await ShopifyClientManager.getClient(params.storeDomain);
        
        const response = await client.request(GET_RECENT_ORDER_ITEMS_QUERY, {
          variables: {
            companyLocationId: `company_location_id:${params.companyLocationId.split('/').pop()}`,
            first: 10
          }
        });

        if (response.errors) {
          handleGraphQLErrors(response.errors, this.CLASS_NAME);
        }

        if (!response?.data?.orders?.edges) {
          loggerService.warn(`${this.CLASS_NAME}.${METHOD}: No orders found`, {
            storeDomain: params.storeDomain
          });
          return {
            orders: []
          };
        }

        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Orders`, {
          orders: response.data.orders.edges
        });

        const orders = response.data.orders.edges.map((orderEdge: any) => {
          const order = orderEdge.node;
          const items = order.lineItems.edges.map((lineItemEdge: any) => {
            const lineItem = lineItemEdge.node;
            return {
              id: lineItem.id,
              name: lineItem.name,
              sku: lineItem.sku,
              quantity: lineItem.quantity,
              product: lineItem.product ? {
                id: lineItem.product.id,
                title: lineItem.product.title
              } : undefined,
              orderCreatedAt: order.createdAt
            };
          }).filter((item: any) => item.sku && item.product?.id);

          return {
            id: order.id,
            tags: order.tags,
            createdAt: order.createdAt,
            items
          };
        });

        const totalItemsCount = orders.reduce((total: number, order: RecentOrderItemsResponse) => total + order.items.length, 0);
        span.setAttribute('orders.count', orders.length);
        span.setAttribute('items.total', totalItemsCount);
        span.setStatus({ code: SpanStatusCode.OK });

        const duration = Date.now() - start;
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Order items fetched successfully`, {
          storeDomain: params.storeDomain,
          ordersCount: orders.length,
          totalItemsCount,
          duration
        });

        return {
          orders
        };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        span.recordException(error as Error);

        const duration = Date.now() - start;
        loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to fetch recent order items`, {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : 'Unknown error',
          storeDomain: params.storeDomain,
          duration
        });
        
        throw error;
      } finally {
        span.end();
      }
    });
  }
} 