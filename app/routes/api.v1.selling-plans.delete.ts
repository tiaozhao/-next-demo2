import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { loggerService } from '~/lib/logger';
import { deleteSellingPlanSchema } from '~/types/selling-plans/selling-plan.schema';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError } from 'zod';
import { sellingPlanService } from '~/services/selling-plans/selling-plan.service';

const ROUTE_PATH = '/api/v1/selling-plans/delete';

/**
 * POST /api/v1/selling-plans/delete
 * Delete (soft delete) a selling plan by ID
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'selling-plans.delete';
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
        const validatedData = deleteSellingPlanSchema.parse(requestBody);
        
        loggerService.info(`${METHOD} processing request`, {
          id: validatedData.id,
          storeName: validatedData.storeName,
        });
        
        // Delete selling plan
        const result = await sellingPlanService.deleteSellingPlan(validatedData);

        loggerService.info(`${METHOD} handler completed`, {
          status: HttpStatusCode.OK,
          routePath: ROUTE_PATH,
          success: result.success,
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