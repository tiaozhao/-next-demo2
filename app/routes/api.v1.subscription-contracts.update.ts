import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { subscriptionContractService } from '~/services/subscription-contracts/subscription-contract.service';
import { loggerService } from '~/lib/logger';
import { updateSubscriptionContractSchema } from '~/types/subscription-contracts/subscription-contract-update.schema';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError } from 'zod';
import { SubscriptionContractError, SubscriptionContractErrorCodes } from '~/lib/errors/subscription-contract-error';

const ROUTE_PATH = '/api/v1/subscription-contracts/update';

/**
 * POST /api/v1/subscription-contracts/update
 * Updates an existing subscription contract including its line items.
 * Uses a full replacement strategy for line items to ensure data consistency.
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'subscription-contracts.update';
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
      let body;
      try {
        body = await request.json();
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new SubscriptionContractError(
            'Invalid JSON in request body',
            SubscriptionContractErrorCodes.VALIDATION_ERROR,
            HttpStatusCode.BAD_REQUEST
          );
        }
        throw error;
      }

      loggerService.info(`${METHOD} processing request`, {
        subscriptionContractId: body.subscriptionContractId,
        storeName: body.storeName,
        customerId: body.customerId,
      });

      // Validate request data against schema
      try {
        const validatedParams = updateSubscriptionContractSchema.parse(body);
        
        // Update subscription contract
        const result = await subscriptionContractService.update(validatedParams);

        loggerService.info(`${METHOD} handler completed`, {
          status: HttpStatusCode.OK,
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
 * GET request handler - allowed for options/preflight requests
 */
export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  return new Response(null, { status: HttpStatusCode.OK });
})); 