import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError } from 'zod';
import { subscriptionRecommendationService } from '~/services/subscription-contracts/subscription-recommendation.service';
import {
  invalidateRecommendationsCacheSchema,
  type InvalidateRecommendationsCacheRequest,
  type InvalidateRecommendationsCacheResponse
} from '~/types/subscription-contracts/subscription-recommendation-invalidate.schema';

const ROUTE_PATH = '/api/v1/subscription-contracts/recommendations/invalidate';

// Schema is imported from types file

/**
 * POST /api/v1/subscription-contracts/recommendations/invalidate
 * Invalidate cached subscription recommendations for a customer
 * This endpoint is designed to be called by Shopify Flow when an order is created
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'subscription-contracts.recommendations.invalidate';
    const start = Date.now();

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

      // Parse request body
      let params;
      try {
        params = await request.json();
      } catch (error) {
        loggerService.warn(`${METHOD} invalid JSON in request body`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          routePath: ROUTE_PATH,
        });
        return ErrorHandler.createErrorResponse ('Invalid JSON in request body');
      }

      // Validate request data against schema
      try {
        // Validate and parse request data against schema
        const validatedParams: InvalidateRecommendationsCacheRequest = invalidateRecommendationsCacheSchema.parse(params);

        // Log request parameters
        loggerService.info(`${METHOD} processing request with parameters`, {
          storeName: validatedParams.storeName,
          customerId: validatedParams.customerId,
          companyLocationId: validatedParams.companyLocationId,
          lineItemsCount: validatedParams.lineItems?.length || 0,
          lineItemsSample: validatedParams.lineItems?.slice(0, 3).map((item: { sku: string }) => item.sku).join(', ') +
            (validatedParams.lineItems && validatedParams.lineItems.length > 3 ? '...' : '')
        });

        // Invalidate recommendations cache
        const result = await subscriptionRecommendationService.invalidateRecommendationCache({
          storeName: validatedParams.storeName,
          customerId: validatedParams.customerId,
          companyLocationId: validatedParams.companyLocationId,
          lineItems: validatedParams.lineItems
        });

        loggerService.info(`${METHOD} handler completed`, {
          status: HttpStatusCode.OK,
          cacheInvalidated: result,
          routePath: ROUTE_PATH,
          duration: Date.now() - start,
          storeName: validatedParams.storeName,
          customerId: validatedParams.customerId,
          lineItemsCount: validatedParams.lineItems?.length || 0
        });

        // Create response using the defined type and the detailed result
        const response: InvalidateRecommendationsCacheResponse = {
          success: result.invalidated,
          message: result.reason
        };

        return new Response(
          JSON.stringify(response),
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
            duration: Date.now() - start
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
        duration: Date.now() - start
      });

      // Use the ErrorHandler to create a standardized error response
      return ErrorHandler.createErrorResponse(error);
    }
  })
);

/**
 * GET method handler - returns HTTP 200 for health check/OPTIONS preflight
 */
export const loader = withTracing(withCors(async (_: ActionFunctionArgs) => {
  return new Response(null, { status: HttpStatusCode.OK });
}));
