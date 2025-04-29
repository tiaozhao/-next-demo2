import { loggerService } from '../../lib/logger';
import { SubscriptionContractError } from '../../lib/errors/subscription-contract-error';
import { subscriptionScheduleRepository } from '../../repositories/subscription-contracts/subscription-schedule.repository';
import { subscriptionContractService } from './subscription-contract.service';
import { orderService } from '../order-management/order.service';
import { SubscriptionScheduleLogStatus } from '../../types/subscription-contracts/subscription-contract-schedule.schema';
import type {
  SubscriptionContractScheduleRequest,
  SubscriptionContractScheduleResponse,
  SubscriptionScheduleFailure,
  SubscriptionData,
  SubscriptionLineData
} from '../../types/subscription-contracts/subscription-contract-schedule.schema';
import { ShopifyClientManager } from '~/lib/shopify/client';
import { DRAFT_ORDER_COMPLETE } from '~/lib/shopify/mutation/draft-order';

export class SubscriptionScheduleService {
  private readonly CLASS_NAME = 'SubscriptionScheduleService';

  public async scheduleSubscriptions(
    params: SubscriptionContractScheduleRequest
  ): Promise<SubscriptionContractScheduleResponse> {
    const METHOD = 'scheduleSubscriptions';
    loggerService.info(`${this.CLASS_NAME}.${METHOD}: Start`, { storeName: params.storeName });

    try {
      // Step 1: First, process and mark completed all subscriptions where endDate <= currentDate
      // This is crucial to do first to avoid processing subscriptions that should be marked as completed
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Step 1 - Processing subscriptions that need to be marked as completed`, {
        storeName: params.storeName
      });
      const completedResults = await this.processCompletedSubscriptions(params.storeName);
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Step 1 completed - Marked ${completedResults.length} subscriptions as completed`, {
        storeName: params.storeName
      });

      // Step 2: Only after marking completed subscriptions, process active subscriptions that need orders
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Step 2 - Processing active subscriptions that need orders`, {
        storeName: params.storeName
      });
      const activeResults = await this.processActiveSubscriptions(params.storeName);
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Step 2 completed - Processed ${activeResults.length} active subscriptions`, {
        storeName: params.storeName
      });

      // Combine results from both processes
      const combinedResults = [...completedResults, ...activeResults];

      if (combinedResults.length === 0) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No subscriptions processed`, {
          storeName: params.storeName
        });
        return this.createEmptyResponse();
      }

      // Build and return the final response
      const response = this.buildResponse(combinedResults);
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Processing complete`, {
        storeName: params.storeName,
        summary: response.summary,
        details: response.details
      });

      return response;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error`, { error });
      throw SubscriptionContractError.creationFailed(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Process subscriptions that have ended and need to be marked as completed
   */
  private async processCompletedSubscriptions(storeName: string): Promise<Array<{ status: string; subscription: SubscriptionData; reason?: string }>> {
    const METHOD = 'processCompletedSubscriptions';
    loggerService.info(`${this.CLASS_NAME}.${METHOD}: Start`, { storeName });

    const completedSubscriptions = await subscriptionScheduleRepository.fetchCompletedSubscriptions(storeName);
    if (completedSubscriptions.length === 0) {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: No subscriptions found to mark as completed`, { storeName });
      return [];
    }

    loggerService.info(`${this.CLASS_NAME}.${METHOD}: Found ${completedSubscriptions.length} subscriptions to mark as completed`, {
      storeName,
      subscriptionIds: completedSubscriptions.map(s => s.id.toString())
    });

    const results = await Promise.all(
      completedSubscriptions.map(async (subscription) => {
        try {
          // Ensure subscription.id is a bigint type
          const subscriptionId = typeof subscription.id === 'string'
            ? BigInt(subscription.id)
            : subscription.id;

          // Use explicit 'COMPLETED' string instead of enum value
          await subscriptionScheduleRepository.updateSubscriptionNextDate(
            subscriptionId,
            storeName,
            new Date(),
            'COMPLETED' // Use explicit string
          );

          // Convert to standard SubscriptionData type
          const typedSubscription: SubscriptionData = {
            ...subscription,
            id: subscriptionId,
            intervalValue: Number(subscription.intervalValue),
            orderTotal: Number(subscription.orderTotal || 0)
          };

          await this.logResult('skipped', typedSubscription, storeName, 'Marked as completed due to end date reached');
          return { status: 'skipped', subscription: typedSubscription, reason: 'Subscription end date reached' };
        } catch (error) {
          loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error marking subscription ${subscription.id} as completed`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            subscriptionId: subscription.id.toString(),
          });

          // Convert to standard SubscriptionData type for logging
          const typedSubscription: SubscriptionData = {
            ...subscription,
            id: typeof subscription.id === 'string' ? BigInt(subscription.id) : subscription.id,
            intervalValue: Number(subscription.intervalValue),
            orderTotal: Number(subscription.orderTotal || 0)
          };

          return await this.logResult(
            'failed',
            typedSubscription,
            storeName,
            error instanceof Error ? error.message : 'Error marking as completed'
          );
        }
      })
    );

    return results;
  }

  /**
   * Process active subscriptions that need orders created
   */
  private async processActiveSubscriptions(storeName: string): Promise<Array<{ status: string; subscription: SubscriptionData; reason?: string }>> {
    const METHOD = 'processActiveSubscriptions';
    loggerService.info(`${this.CLASS_NAME}.${METHOD}: Start`, { storeName });

    const activeSubscriptions = await subscriptionScheduleRepository.fetchEligibleSubscriptions(storeName);
    if (activeSubscriptions.length === 0) {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: No active subscriptions found for order creation`, { storeName });
      return [];
    }

    loggerService.info(`${this.CLASS_NAME}.${METHOD}: Found ${activeSubscriptions.length} active subscriptions for order creation`, {
      storeName,
      subscriptionIds: activeSubscriptions.map(s => s.id.toString())
    });

    const currentDate = new Date();

    const results = await Promise.all(
      activeSubscriptions.map(async (subscription) => {
        // As an extra safety check, don't process subscriptions that should be completed
        // This is a failsafe in case the first step missed some records
        // Use strict "less than" instead of "less than or equal" to handle the edge case
        // when endDate = currentDate = nextOrderCreationDate
        const endDateObj = subscription.endDate ?
          (typeof subscription.endDate === 'string' ? new Date(subscription.endDate) : subscription.endDate)
          : null;

        if (endDateObj && endDateObj < currentDate) {
          loggerService.warn(`${this.CLASS_NAME}.${METHOD}: Skipping subscription ${subscription.id} as it should be marked as completed (endDate < currentDate)`, {
            subscriptionId: subscription.id.toString(),
            endDate: endDateObj.toISOString(),
            currentDate: currentDate.toISOString()
          });

          // Mark as completed here as well (redundant safety)
          try {
            const subscriptionId = typeof subscription.id === 'string'
              ? BigInt(subscription.id)
              : subscription.id;

            await subscriptionScheduleRepository.updateSubscriptionNextDate(
              subscriptionId,
              storeName,
              new Date(),
              'COMPLETED' // Use explicit string
            );

            const typedSubscription: SubscriptionData = {
              ...subscription,
              id: subscriptionId,
              intervalValue: Number(subscription.intervalValue),
              orderTotal: Number(subscription.orderTotal || 0)
            };

            await this.logResult('skipped', typedSubscription, storeName, 'Marked as completed due to end date reached (during active processing)');
            return { status: 'skipped', subscription: typedSubscription, reason: 'Subscription end date reached (during active processing)' };
          } catch (error) {
            loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error marking subscription ${subscription.id} as completed`, {
              error: error instanceof Error ? error.message : 'Unknown error',
              subscriptionId: subscription.id.toString(),
            });

            // Still skip processing, even if we failed to mark it completed
            const typedSubscription: SubscriptionData = {
              ...subscription,
              id: typeof subscription.id === 'string' ? BigInt(subscription.id) : subscription.id,
              intervalValue: Number(subscription.intervalValue),
              orderTotal: Number(subscription.orderTotal || 0)
            };

            return {
              status: 'skipped',
              subscription: typedSubscription,
              reason: 'Subscription should be completed but update failed'
            };
          }
        }

        // If subscription is truly active, process it normally
        // Ensure subscription.id is a bigint type
        const typedSubscription: SubscriptionData = {
          ...subscription,
          id: typeof subscription.id === 'string' ? BigInt(subscription.id) : subscription.id,
          intervalValue: Number(subscription.intervalValue),
          orderTotal: Number(subscription.orderTotal || 0)
        };

        return this.processSubscription({ subscription: typedSubscription, storeName });
      })
    );

    return results;
  }

  private async processSubscription(context: { subscription: SubscriptionData; storeName: string }) {
    const { subscription, storeName } = context;
    const METHOD = 'processSubscription';

    try {
      const lines = await subscriptionScheduleRepository.fetchSubscriptionLines(subscription.id, storeName);
      if (!this.validate(subscription, lines)) {
        return await this.logResult('failed', subscription, storeName, 'Invalid subscription data: missing required fields');
      }

      const orderResult = await this.createOrder(subscription, lines, storeName);
      loggerService.info(`Order created for subscription ${subscription.id}`, {
        orderId: orderResult.data?.orderId,
        draftOrderId: orderResult.data?.draftOrderId
      });

      let shopifyOrderId: string | undefined;
      let orderTotal: number | undefined;
      let orderNumber: string = '';
      let createdById: string | undefined;
      let createdByName: string | undefined;
      let orderStatus: string | null = null;

      if (orderResult.data?.draftOrderId) {
        const completeResponse = await ShopifyClientManager.mutation(
          DRAFT_ORDER_COMPLETE,
          storeName,
          {
            variables: { id: orderResult.data.draftOrderId }
          }
        );

        const draftOrderComplete = completeResponse?.data?.draftOrderComplete;
        const order = draftOrderComplete?.draftOrder?.order;

        if (order) {
          shopifyOrderId = order.id;
          orderNumber = order.name;
          if (order.totalPriceSet?.presentmentMoney?.amount) {
            orderTotal = parseFloat(order.totalPriceSet.presentmentMoney.amount);
          }
          createdById = order.customer?.id;
          createdByName = order.customer?.displayName;
          orderStatus = orderService.determineOrderStatus({ closed: order.closed, cancelledAt: order.cancelledAt });
        } else {
          shopifyOrderId = orderResult.data.draftOrderId;
        }
      } else if (orderResult.data?.orderId) {
        shopifyOrderId = orderResult.data.orderId;
        orderTotal = orderResult.data.order?.totalPriceSet?.presentmentMoney?.amount;
        orderNumber = orderResult.data.order?.name || '';
        createdById = orderResult.data.order?.customer?.id;
        createdByName = orderResult.data.order?.customer?.displayName;
        orderStatus = orderService.determineOrderStatus({
          closed: orderResult?.data.order?.closed ?? false,
          cancelledAt: orderResult?.data.order?.cancelledAt ?? null
        });
      }

      if (!shopifyOrderId) {
        return await this.logResult('failed', subscription, storeName, 'Failed to create order: no order ID returned');
      }

      // Create a record of the subscription order
      await subscriptionScheduleRepository.createSubscriptionOrderRecord({
        subscriptionContractId: subscription.id,
        shopifyOrderId,
        orderNumber,
        poNumber: subscription.poNumber,
        storeName,
        orderTotal: orderTotal || parseFloat(subscription.orderTotal.toString()),
        status: orderStatus ?? '',
        orderedDate: new Date(),
        approvedById: subscription.approvedById,
        approvedByName: subscription.approvedByName,
        createdById,
        createdByName
      });

      // Calculate next order date
      const nextOrderDate = this.calculateNextDate(subscription);

      // Handle the special case: if today is the endDate, this should be the final order
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      const endDateObj = subscription.endDate ?
        (typeof subscription.endDate === 'string' ? new Date(subscription.endDate) : subscription.endDate)
        : null;

      const shouldMarkAsCompleted = !!endDateObj &&
        (nextOrderDate > endDateObj ||
        this.isSameDay(endDateObj, currentDate));

      if (shouldMarkAsCompleted && endDateObj) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Marking subscription as completed after this order`, {
          subscriptionId: subscription.id.toString(),
          reason: this.isSameDay(endDateObj, currentDate)
            ? "Today is the subscription end date"
            : "Next order date exceeds end date",
          endDate: endDateObj.toISOString(),
          nextOrderDate: nextOrderDate.toISOString(),
          currentDate: currentDate.toISOString()
        });

        // Mark the subscription as completed after processing this final order
        await subscriptionScheduleRepository.updateSubscriptionNextDate(
          subscription.id,
          storeName,
          nextOrderDate,
          'COMPLETED' // Use explicit string instead of enum value
        );

        await this.logResult('completed', subscription, storeName,
          `Final order scheduled and subscription marked as completed`
        );
      } else {
        // Normal case - just update the next order date
        await subscriptionScheduleRepository.updateSubscriptionNextDate(
          subscription.id,
          storeName,
          nextOrderDate
        );
        await this.logResult('completed', subscription, storeName, 'Order scheduled successfully');
      }

      return {
        status: 'completed',
        subscription,
        reason: `Order created successfully with ID ${shopifyOrderId}` +
                (shouldMarkAsCompleted ? ' (final order)' : '') +
                `, next order date set to ${nextOrderDate.toISOString()}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing subscription';
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error processing subscription ${subscription.id}`, {
        error: errorMessage,
        subscriptionId: subscription.id.toString(),
        storeName
      });
      return await this.logResult('failed', subscription, storeName, errorMessage);
    }
  }

  private validate(subscription: SubscriptionData, lines: SubscriptionLineData[]): boolean {
    return !!(subscription.intervalValue && subscription.intervalUnit && lines.length && subscription.currencyCode);
  }

  private async createOrder(subscription: SubscriptionData, lines: SubscriptionLineData[], storeName: string) {
    if (!subscription.customerId) {
      throw new Error('Customer ID is required for creating subscription order');
    }

    const shippingLine = subscription.shippingCost ? {
      title: subscription.shippingMethodName || 'Subscription Shipping',
      priceWithCurrency: {
        amount: subscription.shippingCost,
        currencyCode: subscription.currencyCode
      }
    } : undefined;

    const orderPayload = {
      storeName,
      customerId: subscription.customerId,
      companyLocationId: subscription.companyLocationId,
      poNumber: subscription.poNumber,
      note: `Scheduled order for subscription ${subscription.id}`,
      items: lines.map(l => ({
        variantId: l.variantId,
        quantity: Number(l.quantity),
        price: Number(l.price)
      })),
      currencyCode: subscription.currencyCode,
      shippingLine,
      tags: ['subscription']
    };
    return await orderService.createOrder(orderPayload);
  }

  private calculateNextDate(subscription: SubscriptionData): Date {
    // Ensure startDate and endDate are Date objects
    const startDate = typeof subscription.startDate === 'string'
      ? new Date(subscription.startDate)
      : subscription.startDate;

    const endDate = subscription.endDate
      ? (typeof subscription.endDate === 'string' ? new Date(subscription.endDate) : subscription.endDate)
      : new Date(2099, 11, 31);

    // Get the current nextOrderCreationDate as the base date for calculation
    // This is the key change - using the existing nextOrderCreationDate instead of current date
    const baseDate = subscription.nextOrderCreationDate
      ? (typeof subscription.nextOrderCreationDate === 'string'
          ? new Date(subscription.nextOrderCreationDate)
          : new Date(subscription.nextOrderCreationDate))
      : startDate; // Fallback to startDate if nextOrderCreationDate is not available

    // Log the base date being used for calculation
    loggerService.info(`${this.CLASS_NAME}.calculateNextDate: Using nextOrderCreationDate as base for calculation`, {
      subscriptionId: subscription.id.toString(),
      baseDate: baseDate.toISOString(),
      intervalValue: subscription.intervalValue,
      intervalUnit: subscription.intervalUnit
    });

    // Use calculateNextSchedulingDate with the nextOrderCreationDate as the base
    // This ensures we're adding the interval to the previous nextOrderCreationDate
    const calculatedDate = subscriptionContractService.calculateNextSchedulingDate({
      startDate: startDate,
      endDate: endDate,
      intervalValue: subscription.intervalValue,
      intervalUnit: subscription.intervalUnit,
      currentDate: baseDate // Use nextOrderCreationDate as the base date
    });

    // Log the calculated next date
    loggerService.info(`${this.CLASS_NAME}.calculateNextDate: Calculated next order date`, {
      subscriptionId: subscription.id.toString(),
      baseDate: baseDate.toISOString(),
      calculatedDate: calculatedDate.toISOString()
    });

    return calculatedDate;
  }

  private async logResult(
    status: 'completed' | 'skipped' | 'failed',
    subscription: SubscriptionData,
    storeName: string,
    message: string
  ) {
    const statusMapping = {
      'completed': SubscriptionScheduleLogStatus.SUCCESS,
      'skipped': SubscriptionScheduleLogStatus.SKIPPED,
      'failed': SubscriptionScheduleLogStatus.FAILED
    };

    await subscriptionScheduleRepository.createScheduleLog({
      storeName,
      subscriptionContractId: Number(subscription.id),
      scheduledAt: new Date(),
      status: statusMapping[status],
      message
    });
    return { status, subscription, reason: message };
  }

  private createEmptyResponse(): SubscriptionContractScheduleResponse {
    return {
      success: true,
      summary: {
        total: 0,
        scheduled: 0,
        skipped: 0,
        failed: []
      },
      details: {
        completedDueToEndDate: 0,
        ordersCreated: 0,
        markedCompletedAfterOrder: 0
      }
    };
  }

  private buildResponse(results: Array<{ status: string; subscription: SubscriptionData; reason?: string }>): SubscriptionContractScheduleResponse {
    // Count subscriptions with end dates that were marked as completed
    const completedEndDate = results.filter(r =>
      r.status === 'skipped' &&
      r.reason?.includes('end date')
    ).length;

    // Count subscriptions that had orders created
    const ordersCreated = results.filter(r =>
      r.status === 'completed' &&
      r.reason?.includes('Order created')
    ).length;

    // Count subscriptions that were marked as completed after order creation
    // (because next order date exceeds end date)
    const markedCompletedAfterOrder = results.filter(r =>
      r.status === 'completed' &&
      r.reason?.includes('exceeds end date')
    ).length;

    // Collect all failed subscriptions with reasons
    const failed: SubscriptionScheduleFailure[] = results
      .filter(r => r.status === 'failed')
      .map(r => ({
        subscriptionContractId: Number(r.subscription.id),
        reason: r.reason || 'Unknown error'
      }));

    // Return detailed response
    return {
      success: true,
      summary: {
        total: results.length,
        scheduled: ordersCreated,
        skipped: completedEndDate,
        failed
      },
      details: {
        completedDueToEndDate: completedEndDate,
        ordersCreated: ordersCreated,
        markedCompletedAfterOrder: markedCompletedAfterOrder
      }
    };
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}

export const subscriptionScheduleService = new SubscriptionScheduleService();
