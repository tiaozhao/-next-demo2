import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { loggerService } from '~/lib/logger';
import { 
  subscriptionContractScheduleSchema,
} from '~/types/subscription-contracts/subscription-contract-schedule.schema';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError } from 'zod';
import { subscriptionScheduleService } from '~/services/subscription-contracts/subscription-schedule.service';

const ROUTE_PATH = '/api/v1/subscription-contracts/schedule';

/**
 * POST /api/v1/subscription-contracts/schedule
 * Schedule orders for eligible subscription contracts
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'subscription-contracts.schedule';
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
      
      const requestBody = await request.json();
      
      // Validate request data against schema
      try {
        const validatedData = subscriptionContractScheduleSchema.parse(requestBody);
        
        loggerService.info(`${METHOD} processing request`, {
          storeName: validatedData.storeName,
        });
        
        // Schedule subscription orders
        const result = await subscriptionScheduleService.scheduleSubscriptions(validatedData);

        loggerService.info(`${METHOD} handler completed`, {
          status: HttpStatusCode.OK,
          routePath: ROUTE_PATH,
          summary: result.summary,
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

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  return new Response(null, { status: HttpStatusCode.OK });
})); 