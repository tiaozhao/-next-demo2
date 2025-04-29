import { type ActionFunctionArgs } from '@remix-run/node';
import { shoppingListService } from '../services/shopping-lists/shopping-list.service';
import { loggerService } from '../lib/logger';
import { createShoppingListRequestSchema } from '../types/shopping-lists/shopping-lists.schema';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { ShoppingListError } from '~/lib/errors/shopping-list-errors';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';

const ROUTE_PATH = '/api/v1/shopping-lists/create';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Create shopping list handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
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

    const rawParams = await request.json();
    const validatedParams = createShoppingListRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return new Response(
        JSON.stringify({ 
          code: HttpStatusCode.BAD_REQUEST,
          message: 'Invalid parameters',
          errors: validatedParams.error.errors 
        }),
        { 
          status: HttpStatusCode.BAD_REQUEST,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      const result = await shoppingListService.createShoppingList(validatedParams.data);
      return new Response(
        JSON.stringify({
          shoppingList: result
        }),
        { 
          status: HttpStatusCode.OK,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      // Handle ShoppingListError
      if (error instanceof ShoppingListError) {
        return new Response(
          JSON.stringify({ 
            code: error.statusCode,
            message: error.message,
            errorCode: error.errorCode
          }),
          { 
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Handle old error format for backward compatibility
      if (error instanceof Error && error.message.includes('already exists')) {
        return new Response(
          JSON.stringify({ 
            code: HttpStatusCode.CONFLICT,
            message: error.message
          }),
          { 
            status: HttpStatusCode.CONFLICT,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw error;
    }

  } catch (error) {
    loggerService.error('Error creating shopping list', { error });
    
    // Use error handler for standardized error responses
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Create shopping list loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: HttpStatusCode.OK });
}));