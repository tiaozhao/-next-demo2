import { type ActionFunctionArgs } from '@remix-run/node';
import { shoppingListService } from '~/services/shopping-lists/shopping-list.service';
import { 
  shoppingListItemsAggregationRequestSchema,
  shoppingListItemsAggregationResponseSchema
} from '~/types/shopping-lists/shopping-list-items.schema';
import { loggerService } from '~/lib/logger';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/shopping-lists/:id/items/aggregation';

export const action = withTracing(withCors(async ({ request, params }: ActionFunctionArgs) => {
  const start = Date.now();
  loggerService.info('Shopping list items aggregation handler started', {
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
    const validatedParams = shoppingListItemsAggregationRequestSchema.safeParse({
      ...rawParams,
      shoppingListId: Number(params.id)
    });

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
      const result = await shoppingListService.getShoppingListAggregation(validatedParams.data);
      const validatedResponse = shoppingListItemsAggregationResponseSchema.parse(result);

      const duration = Date.now() - start;
      loggerService.info('Successfully retrieved shopping list items aggregation', {
        shoppingListId: params.id,
        duration
      });

      return new Response(
        JSON.stringify(validatedResponse),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
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
      }
      throw error;
    }

  } catch (error) {
    const duration = Date.now() - start;
    loggerService.error('Failed to get shopping list items aggregation', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      shoppingListId: params.id,
      duration
    });
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
  loggerService.info('Shopping list items aggregation loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 