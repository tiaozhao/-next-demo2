import prisma from '../../db.server';
import { loggerService } from '../../lib/logger';
import type { Prisma } from '@prisma/client';
import { SubscriptionContractStatus } from '../../types/subscription-contracts/subscription-contract.schema';

/**
 * Repository for subscription scheduling operations
 */
class SubscriptionScheduleRepository {
  /**
   * Fetch subscription contracts that are eligible for order creation
   * @param storeName Store to fetch eligible subscriptions for
   */
  public async fetchEligibleSubscriptions(storeName: string): Promise<any[]> {
    try {
      // Get current date
      const currentDate = new Date();
      // Remove time part, keep only date
      const currentDateOnly = new Date(
        Date.UTC(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          0, 0, 0, 0
        )
      );
      
      loggerService.info('Fetching eligible subscriptions for scheduling', {
        storeName,
        currentDate: currentDate.toISOString(),
        currentDateOnly: currentDateOnly.toISOString()
      });

      const statusValue = SubscriptionContractStatus.ACTIVE.toString();
      loggerService.info('Checking status value', { statusValue });

      const whereClause: Prisma.SubscriptionContractWhereInput = {
        storeName,
        // Only process subscriptions with ACTIVE status
        status: SubscriptionContractStatus.ACTIVE,
        // Only process subscriptions that are due for order creation
        nextOrderCreationDate: {
          lte: currentDateOnly,
        },
        // Only process subscriptions that have started
        startDate: {
          lte: currentDateOnly,
        },
        // Only process subscriptions that haven't ended, or end date is today/future
        OR: [
          // No end date
          { endDate: {} },
          // End date is in the future (excluding today)
          { endDate: { gt: currentDateOnly } },
          // Special case: End date is today AND next order creation date is also today
          // This ensures we create the final order on the last day of the subscription
          { 
            endDate: { equals: currentDateOnly },
            nextOrderCreationDate: { lte: currentDateOnly }
          }
        ],
      };
      
      loggerService.info('Prisma where clause for eligible subscriptions', {
        whereClause: JSON.stringify(whereClause),
      });

      const results = await prisma.subscriptionContract.findMany({
        where: whereClause,
        select: {
          id: true,
          intervalValue: true,
          intervalUnit: true,
          startDate: true,
          endDate: true,
          currencyCode: true,
          orderTotal: true,
          deliveryAnchor: true,
          status: true,
          customerId: true,
          companyId: true,
          companyLocationId: true,
          poNumber: true,
          shippingMethodId: true,
          shippingMethodName: true,
          shippingCost: true,
          approvedById: true,
          approvedByName: true,
          nextOrderCreationDate: true,
        }
      });
      
      // Log found eligible subscriptions
      if (results.length > 0) {
        loggerService.info('Found eligible subscriptions for order creation', {
          count: results.length,
          subscriptions: results.map(s => ({
            id: s.id.toString(),
            endDate: s.endDate?.toISOString(),
            nextOrderCreationDate: s.nextOrderCreationDate?.toISOString()
          }))
        });
      }

      // Filter out any records with invalid dates, just as a safeguard
      return results.filter(subscription => {
        // Validate dates to avoid issues with Invalid Date
        const hasValidStartDate = subscription.startDate && !isNaN(new Date(subscription.startDate).getTime());
        const hasValidDeliveryAnchor = subscription.deliveryAnchor && !isNaN(new Date(subscription.deliveryAnchor).getTime());
        
        if (!hasValidStartDate || !hasValidDeliveryAnchor) {
          loggerService.warn('Found eligible subscription with invalid date(s), skipping', {
            subscriptionId: subscription.id.toString(),
            startDate: subscription.startDate,
            deliveryAnchor: subscription.deliveryAnchor,
            hasValidStartDate,
            hasValidDeliveryAnchor
          });
          return false;
        }
        
        return true;
      });
    } catch (error) {
      loggerService.error('Error fetching eligible subscriptions', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : 'Unknown error',
        storeName,
      });
      throw error;
    }
  }

  /**
   * Fetch subscription contracts that have completed on the current date
   * These are subscriptions that:
   * 1. Have an end date equal to the current date
   * 2. Next order creation date is in the future OR already processed
   * @param storeName Store to fetch completed subscriptions for
   */
  public async fetchCompletedSubscriptions(storeName: string): Promise<any[]> {
    try {
      // Get current date
      const currentDate = new Date();
      // Remove time part, keep only date
      const currentDateOnly = new Date(
        Date.UTC(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          0, 0, 0, 0
        )
      );
      
      loggerService.info('Fetching completed subscriptions', {
        storeName,
        currentDate: currentDate.toISOString(),
        currentDateOnly: currentDateOnly.toISOString()
      });

      // Find subscriptions that end today and have future nextOrderCreationDate
      // These won't be processed by fetchEligibleSubscriptions but need to be marked as completed
      const whereClause: Prisma.SubscriptionContractWhereInput = {
        storeName,
        // Only process subscriptions with ACTIVE status
        status: SubscriptionContractStatus.ACTIVE,
        // Only process subscriptions where end date is today
        endDate: {
          equals: currentDateOnly,
        },
        // Next order is scheduled for future date, so we don't need to create an order
        // but we do need to mark the subscription as completed
        nextOrderCreationDate: {
          gt: currentDateOnly,
        },
      };
      
      loggerService.info('Prisma where clause for completed subscriptions', {
        whereClause: JSON.stringify(whereClause),
      });

      const results = await prisma.subscriptionContract.findMany({
        where: whereClause,
        select: {
          id: true,
          intervalValue: true,
          intervalUnit: true,
          startDate: true,
          endDate: true,
          currencyCode: true,
          orderTotal: true,
          deliveryAnchor: true,
          status: true,
          customerId: true,
          companyId: true,
          companyLocationId: true,
          nextOrderCreationDate: true,
        }
      });
      
      if (results.length > 0) {
        loggerService.info('Found completed subscriptions to mark as COMPLETED', {
          count: results.length,
          subscriptions: results.map(s => ({
            id: s.id.toString(),
            endDate: s.endDate?.toISOString(),
            nextOrderCreationDate: s.nextOrderCreationDate?.toISOString()
          }))
        });
      }

      return results;
    } catch (error) {
      loggerService.error('Error fetching completed subscriptions', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : 'Unknown error',
        storeName,
      });
      throw error;
    }
  }

  /**
   * Fetch subscription contract lines for a given subscription
   * @param subscriptionContractId Subscription contract ID
   * @param storeName Store name
   */
  public async fetchSubscriptionLines(subscriptionContractId: bigint, storeName: string): Promise<any[]> {
    try {
      return await prisma.subscriptionContractLine.findMany({
        where: {
          subscriptionContractId,
          storeName,
        },
      });
    } catch (error) {
      loggerService.error('Error fetching subscription lines', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : 'Unknown error',
        subscriptionContractId: subscriptionContractId.toString(),
        storeName,
      });
      throw error;
    }
  }

  /**
   * Update subscription contract with new nextOrderCreationDate and optionally status
   * @param subscriptionContractId Subscription contract ID
   * @param storeName Store name
   * @param nextOrderCreationDate Next order creation date
   * @param status Optional new status
   */
  public async updateSubscriptionNextDate(
    subscriptionContractId: bigint,
    storeName: string,
    nextOrderCreationDate: Date,
    status?: string
  ): Promise<any> {
    try {
      const updateData: Prisma.SubscriptionContractUpdateInput = {
        nextOrderCreationDate,
      };

      if (status) {
        // Use explicit string for status rather than enum
        updateData.status = status === SubscriptionContractStatus.COMPLETED ? 'COMPLETED' : status;
      }

      loggerService.info('Updating subscription next date', {
        subscriptionContractId: subscriptionContractId.toString(),
        storeName,
        nextOrderCreationDate: nextOrderCreationDate.toISOString(),
        status: updateData.status,
      });

      return await prisma.subscriptionContract.update({
        where: {
          id: subscriptionContractId,
          storeName,
        },
        data: updateData,
      });
    } catch (error) {
      loggerService.error('Error updating subscription next order date', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : 'Unknown error',
        subscriptionContractId: subscriptionContractId.toString(),
        storeName,
        nextOrderCreationDate: nextOrderCreationDate.toISOString(),
        status,
      });
      throw error;
    }
  }

  /**
   * Create a schedule log entry in the database
   */
  public async createScheduleLog(logEntry: {
    storeName: string;
    subscriptionContractId: number;
    scheduledAt: Date;
    status: string;
    message?: string;
  }): Promise<any> {
    try {

      return await prisma.subscriptionScheduleLog.create({
        data: {
          storeName: logEntry.storeName,
          subscriptionContractId: BigInt(logEntry.subscriptionContractId),
          scheduledAt: logEntry.scheduledAt,
          status: logEntry.status,
          message: logEntry.message,
        },
      });
    } catch (error) {
      loggerService.error('Error creating subscription schedule log', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : 'Unknown error',
        logEntry: {
          ...logEntry,
          scheduledAt: logEntry.scheduledAt.toISOString(),
          subscriptionContractId: logEntry.subscriptionContractId.toString(),
        },
      });
      throw error;
    }
  }

  /**
   * Create multiple schedule log entries in batch
   */
  public async createScheduleLogBulk(logEntries: Array<{
    storeName: string;
    subscriptionContractId: number;
    scheduledAt: Date;
    status: string;
    message?: string;
  }>): Promise<any> {
    try {

      return await prisma.$transaction(
        logEntries.map((entry) =>
          prisma.subscriptionScheduleLog.create({
            data: {
              storeName: entry.storeName,
              subscriptionContractId: BigInt(entry.subscriptionContractId),
              scheduledAt: entry.scheduledAt,
              status: entry.status,
              message: entry.message,
            },
          })
        )
      );
    } catch (error) {
      loggerService.error('Error creating subscription schedule logs in bulk', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : 'Unknown error',
        logEntriesCount: logEntries.length,
      });
      throw error;
    }
  }

  /**
   * Create a subscription order record
   */
  public async createSubscriptionOrderRecord(orderData: {
    subscriptionContractId: bigint;
    shopifyOrderId: string;
    orderNumber: string;
    poNumber?: string;
    storeName: string;
    orderTotal: number;
    status: string;
    orderedDate: Date;
    approvedById?: string;
    approvedByName?: string;
    createdById?: string;
    createdByName?: string;
  }): Promise<any> {
    try {
      loggerService.info('Creating subscription order record', {
        subscriptionContractId: orderData.subscriptionContractId.toString(),
        shopifyOrderId: orderData.shopifyOrderId,
        storeName: orderData.storeName,
      });

      return await prisma.subscriptionOrder.create({
        data: {
          subscriptionContractId: orderData.subscriptionContractId,
          shopifyOrderId: orderData.shopifyOrderId,
          orderNumber: orderData.orderNumber,
          poNumber: orderData.poNumber,
          storeName: orderData.storeName,
          orderTotal: orderData.orderTotal,
          status: orderData.status,
          orderedDate: orderData.orderedDate,
          approvedById: orderData.approvedById,
          approvedByName: orderData.approvedByName,
          createdById: orderData.createdById,
          createdByName: orderData.createdByName,
        },
      });
    } catch (error) {
      loggerService.error('Error creating subscription order record', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : 'Unknown error',
        orderData: {
          ...orderData,
          subscriptionContractId: orderData.subscriptionContractId.toString(),
          orderedDate: orderData.orderedDate.toISOString(),
        },
      });
      throw error;
    }
  }

  /**
   * Update subscription status to COMPLETED for completed subscriptions
   * @param subscriptionIds Array of subscription IDs to update
   * @returns Number of updated subscriptions
   */
  public async updateCompletedSubscriptionStatus(subscriptionIds: string[]): Promise<number> {
    if (!subscriptionIds.length) {
      return 0;
    }

    try {
      loggerService.info('Updating subscription status to COMPLETED', {
        subscriptionCount: subscriptionIds.length,
        subscriptionIds,
      });

      const result = await prisma.subscriptionContract.updateMany({
        where: {
          id: {
            in: subscriptionIds.map(id => BigInt(id)),
          },
          status: SubscriptionContractStatus.ACTIVE,
        },
        data: {
          status: SubscriptionContractStatus.COMPLETED,
          updatedAt: new Date(),
        },
      });

      loggerService.info('Successfully updated subscription status to COMPLETED', {
        count: result.count,
      });

      return result.count;
    } catch (error) {
      loggerService.error('Error updating subscription status to COMPLETED', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : 'Unknown error',
        subscriptionIds,
      });
      throw error;
    }
  }
}

export const subscriptionScheduleRepository = new SubscriptionScheduleRepository();
