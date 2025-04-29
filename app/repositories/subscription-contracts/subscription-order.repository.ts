import prisma from "~/db.server";
import type { FetchSubscriptionOrdersRequest, SubscriptionOrdersFilter, SubscriptionOrdersSort } from "~/types/subscription-contracts/subscription-orders-list.schema";

export class SubscriptionOrderRepository {
  /**
   * Get a paginated list of subscription orders with filters and sorting
   */
  public async fetchSubscriptionOrders(params: FetchSubscriptionOrdersRequest) {
    const { 
      storeName,
      companyLocationId,
      subscriptionContractId,
      filter = {},
      pagination = { page: 1, pageSize: 10 },
      sort = { field: "createdAt", order: "desc" }
    } = params;
    
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;
    
    // Build where conditions
    const where = this.buildWhereClause(storeName, companyLocationId, subscriptionContractId, filter);
    
    // Build orderBy condition
    const orderBy = this.buildOrderByClause(sort);
    
    // Fetch orders with pagination
    const orders = await prisma.subscriptionOrder.findMany({
      where,
      select: {
        id: true,
        shopifyOrderId: true,
        orderNumber: true,
        poNumber: true,
        subscriptionContractId: true,
        orderTotal: true,
        status: true,
        createdById: true,
        createdByName: true,
        approvedById: true,
        approvedByName: true,
        orderedDate: true,
        createdAt: true,
      },
      orderBy,
      skip,
      take: pageSize,
    });
    
    // Count total records for pagination
    const total = await this.countSubscriptionOrders(where);
    
    // Format result - convert BigInt to string for serialization
    const formattedOrders = orders.map(order => ({
      id: Number(order.id),
      subscriptionContractId: Number(order.subscriptionContractId),
      shopifyOrderId: order.shopifyOrderId,
      orderNumber: order.orderNumber,
      poNumber: order.poNumber,
      orderTotal: order.orderTotal?.toString() ?? "",
      status: order.status ?? "",
      createdById: order.createdById,
      createdByName: order.createdByName ?? "",
      approvedById: order.approvedById,
      approvedByName: order.approvedByName ?? "",
      orderedDate: order.orderedDate?.toISOString() ?? "",
      createdAt: order.createdAt.toISOString(),
    }));
    
    return {
      records: formattedOrders,
      pagination: {
        page,
        pageSize,
        total,
      }
    };
  }

  /**
   * Count subscription orders based on filters
   */
  private async countSubscriptionOrders(where: any) {
    return prisma.subscriptionOrder.count({ where });
  }

  /**
   * Build where clause for filtering subscription orders
   */
  private buildWhereClause(
    storeName: string,
    companyLocationId?: string,
    subscriptionContractId?: number,
    filter?: SubscriptionOrdersFilter
  ) {
    const where: any = { storeName };
    
    // Apply companyLocationId filter if provided
    if (companyLocationId) {
      // In a real implementation, this might need to join with SubscriptionContract model
      // to filter by the company location associated with the contract
      // For now we'll simply keep this placeholder
    }
    
    // Apply subscriptionContractId filter if provided
    if (subscriptionContractId) {
      where.subscriptionContractId = BigInt(subscriptionContractId);
    }
    
    // Apply additional filters if provided
    if (filter) {
      // Status filter (array of statuses)
      if (filter.status && filter.status.length > 0) {
        where.status = { in: filter.status };
      }
      
      // PO Number filter (fuzzy match)
      if (filter.poNumber) {
        where.poNumber = {
          contains: filter.poNumber,
          mode: 'insensitive'
        };
      }
      
      // Order Number filter (fuzzy match)
      if (filter.orderNumber) {
        where.orderNumber = {
          contains: filter.orderNumber,
          mode: 'insensitive'
        };
      }
      
      // Approved By Name filter (fuzzy match)
      if (filter.approvedByName) {
        where.approvedByName = {
          contains: filter.approvedByName,
          mode: 'insensitive'
        };
      }
      
      // Date range filters
      const dateFilters: any = {};
      
      if (filter.createdFrom) {
        dateFilters.gte = new Date(filter.createdFrom);
      }
      
      if (filter.createdTo) {
        dateFilters.lte = new Date(filter.createdTo);
      }
      
      if (Object.keys(dateFilters).length > 0) {
        where.createdAt = dateFilters;
      }
    }
    
    return where;
  }

  /**
   * Build orderBy clause for sorting subscription orders
   */
  private buildOrderByClause(sort: SubscriptionOrdersSort) {
    const { field, order } = sort;
    const direction = order === 'asc' ? 'asc' : 'desc';
    
    const orderBy: any = {};
    orderBy[field] = direction;
    
    return orderBy;
  }
}

export const subscriptionOrderRepository = new SubscriptionOrderRepository(); 