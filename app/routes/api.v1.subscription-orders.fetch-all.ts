import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { subscriptionOrderService } from '~/services/subscription-contracts/subscription-order.service';
import { loggerService } from '~/lib/logger';
import { FetchSubscriptionOrdersSchema } from '~/types/subscription-contracts/subscription-orders-list.schema';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError } from 'zod';

const ROUTE_PATH = '/api/v1/subscription-orders/fetch-all';

/**
 * POST /api/v1/subscription-orders/fetch-all
 * Fetch all subscription orders with filtering, pagination, and sorting
 * 
 * Supports:
 * - Filtering by status, poNumber, orderNumber, approvedByName, date range
 * - Pagination (page, pageSize)
 * - Sorting (field, order)
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'subscription-orders.fetch-all';
    try {
      loggerService.info(`${METHOD} handler started`, {
        url: request.url,
        method: request.method,
        routePath: ROUTE_PATH,
      });

      // Check if request method is POST
      if (request.method !== 'POST') {
        return ErrorHandler.createMethodNotAllowedResponse();
      }

      const params = await request.json();
      loggerService.info(`${METHOD} processing request`, {
        storeName: params.storeName,
        companyLocationId: params.companyLocationId,
        subscriptionContractId: params.subscriptionContractId,
      });

      // Validate request data against schema
      try {
        const validatedParams = FetchSubscriptionOrdersSchema.parse(params);
        
        // Fetch subscription orders
        const result = await subscriptionOrderService.fetchAll(validatedParams);

        loggerService.info(`${METHOD} handler completed`, {
          status: HttpStatusCode.OK,
          total: result.total,
          routePath: ROUTE_PATH,
        });

        return new Response(
          JSON.stringify(result),
          {
            status: HttpStatusCode.OK,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (validationError) {
        // Handle Zod schema validation errors
        if (validationError instanceof ZodError) {
          loggerService.warn(`${METHOD} validation error`, {
            errors: validationError.errors,
            routePath: ROUTE_PATH,
          });
          
          return ErrorHandler.createValidationErrorResponse(validationError);
        }
        
        // Re-throw other errors
        throw validationError;
      }
    } catch (error) {
      // Log error details
      loggerService.error(`${METHOD} error processing request`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
        routePath: ROUTE_PATH,
      });

      // Use the ErrorHandler to create a standardized error response
      return ErrorHandler.createErrorResponse(error);
    }
  })
);

/**
 * Handle OPTIONS requests for CORS preflight
 */
export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  return new Response(null, { status: HttpStatusCode.OK });
})); 