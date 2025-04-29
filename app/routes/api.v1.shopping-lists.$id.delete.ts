import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { shoppingListService } from '../services/shopping-lists/shopping-list.service';
import { loggerService } from '../lib/logger';
import { deleteShoppingListRequestSchema } from '../types/shopping-lists/shopping-lists.schema';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/shopping-lists/:id/delete';

export const action = withTracing(withCors(async ({ request, params }: ActionFunctionArgs) => {
  loggerService.info('Delete shopping list handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH,
    params
  });

  try {
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          code: 405,
          message: 'Method not allowed'
        }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const rawParams = await request.json();
    loggerService.info('Raw parameters', { rawParams, params });
    const validatedParams = deleteShoppingListRequestSchema.safeParse({
      ...rawParams,
      id: Number(params.id)
    });
    loggerService.info('Validated parameters', { validatedParams });
    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return new Response(
        JSON.stringify({ 
          code: 400,
          message: 'Invalid parameters',
          errors: validatedParams.error.errors 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      const result = await shoppingListService.deleteShoppingList(validatedParams.data);
      return new Response(
        JSON.stringify({
          shoppingList: result
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      loggerService.error('Error deleting shopping list1', { error });
      if (error instanceof Error) {
        if (error.message === 'Shopping list not found') {
          return new Response(
            JSON.stringify({ 
              code: 404,
              message: error.message 
            }),
            { 
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        if (error.message === 'Not authorized to delete this shopping list') {
          return new Response(
            JSON.stringify({ 
              code: 403,
              message: error.message 
            }),
            { 
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }
      throw error;
    }

  } catch (error) {
    loggerService.error('Error deleting shopping list', { error });
    return new Response(
      JSON.stringify({
        code: 500,
        message: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Delete shopping list loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));