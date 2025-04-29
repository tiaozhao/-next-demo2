import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { subscriptionContractService } from '~/services/subscription-contracts/subscription-contract.service';
import { loggerService } from '~/lib/logger';
import { createSubscriptionContractSchema } from '~/types/subscription-contracts/subscription-contract-create.schema';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError } from 'zod';
import { SubscriptionContractError } from '~/lib/errors/subscription-contract-error';

const ROUTE_PATH = '/api/v1/subscription-contracts/create';

/**
 * POST /api/v1/subscription-contracts/create
 * Create a new subscription contract with lines
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'subscription-contracts.create';
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
        companyId: params.companyId,
        companyLocationId: params.companyLocationId,
        subscriptionName: params.subscription?.name,
      });

      // Validate request data against schema
      try {
        const validatedParams = createSubscriptionContractSchema.parse(params);
        
        // Create subscription contract
        const result = await subscriptionContractService.create(validatedParams);

        loggerService.info(`${METHOD} handler completed`, {
          status: 200,
          subscriptionContractId: result.subscriptionContractId,
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
        
        // Handle business validation errors from service layer
        if (validationError instanceof SubscriptionContractError) {
          loggerService.warn(`${METHOD} business validation error`, {
            error: validationError.message,
            routePath: ROUTE_PATH,
          });
          
          return new Response(
            JSON.stringify({
              message: validationError.message,
              errorCode: validationError.errorCode,
              statusCode: validationError.statusCode
            }),
            {
              status: validationError.statusCode,
              headers: {
                'Content-Type': 'application/json'
              }
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

      // Use the ErrorHandler to create a standardized error response
      return ErrorHandler.createErrorResponse(error);
    }
  })
);

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  return new Response(null, { status: HttpStatusCode.OK });
})); 