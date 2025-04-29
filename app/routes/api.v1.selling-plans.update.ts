import { type ActionFunctionArgs } from '@remix-run/node';
import { sellingPlanService } from '~/services/selling-plans/selling-plan.service';
import { loggerService } from '~/lib/logger';
import { updateSellingPlanSchema } from '~/types/selling-plans/selling-plan.schema';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError } from 'zod';

const ROUTE_PATH = '/api/v1/selling-plans/update';

/**
 * POST /api/v1/selling-plans/update
 * Update an existing selling plan
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'selling-plans.update';
    try {
      loggerService.info(`${METHOD} handler started`, {
        url: request.url,
        method: request.method,
        routePath: ROUTE_PATH,
      });

      // Check if request method is POST
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({
            code: HttpStatusCode.METHOD_NOT_ALLOWED,
            message: 'Method not allowed'
          }),
          {
            status: HttpStatusCode.METHOD_NOT_ALLOWED,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      const requestBody = await request.json();
      
      // Validate request data against schema
      try {
        const validatedData = updateSellingPlanSchema.parse(requestBody);
        
        loggerService.info(`${METHOD} processing request`, {
          id: validatedData.id,
          storeName: validatedData.storeName,
        });
        
        // Update selling plan
        const result = await sellingPlanService.updateSellingPlan(validatedData);

        loggerService.info(`${METHOD} handler completed`, {
          status: HttpStatusCode.OK,
          routePath: ROUTE_PATH,
          id: result.id,
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
          
          return new Response(
            JSON.stringify({
              code: HttpStatusCode.BAD_REQUEST,
              message: 'Invalid parameters',
              errors: validationError.errors
            }),
            {
              status: HttpStatusCode.BAD_REQUEST,
              headers: { 'Content-Type': 'application/json' }
            }
          );
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

      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'SellingPlanError') {
          const statusCode = 'statusCode' in error ? (error as any).statusCode : HttpStatusCode.INTERNAL_SERVER_ERROR;
          return new Response(
            JSON.stringify({
              code: statusCode,
              message: error.message
            }),
            {
              status: statusCode,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // Default error response
      return new Response(
        JSON.stringify({
          code: HttpStatusCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error'
        }),
        {
          status: HttpStatusCode.INTERNAL_SERVER_ERROR,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  })
);

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  return new Response(null, { status: HttpStatusCode.OK });
})); 