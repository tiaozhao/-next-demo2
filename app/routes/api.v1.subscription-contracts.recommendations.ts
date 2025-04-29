import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError, z } from 'zod';
import { subscriptionRecommendationService } from '~/services/subscription-contracts/subscription-recommendation.service';

const ROUTE_PATH = '/api/v1/subscription-contracts/recommendations';

/**
 * Validate and parse request data for getting subscription recommendations
 */
const recommendationsRequestSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  storeName: z.string().min(1, 'Store name is required'),
  companyLocationId: z.string().min(1, 'Company location ID is required'),
});

/**
 * POST /api/v1/subscription-contracts/recommendations
 * Get personalized subscription recommendations for a customer
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'subscription-contracts.recommendations';
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

      const params = await request.json();
      loggerService.info(`${METHOD} processing request`, {
        customerId: params.customerId,
        storeName: params.storeName,
        companyLocationId: params.companyLocationId,
      });

      // Validate request data against schema
      try {
        const validatedParams = recommendationsRequestSchema.parse(params);

        // Get recommendations
        const result = await subscriptionRecommendationService.getRecommendations(validatedParams);


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
export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  return new Response(null, { status: HttpStatusCode.OK });
})); 