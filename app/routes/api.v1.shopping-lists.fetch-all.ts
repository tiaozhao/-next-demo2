import { type ActionFunctionArgs } from '@remix-run/node';
import { shoppingListService } from '../services/shopping-lists/shopping-list.service';
import { loggerService } from '../lib/logger';
import { shoppingListFilterSchema } from '../types/shopping-lists/shopping-lists.schema';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/shopping-lists/fetch-all';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Shopping lists fetch-all handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
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
    const validatedParams = shoppingListFilterSchema.safeParse(rawParams);

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

    loggerService.info('Fetching shopping lists', { params: validatedParams.data });
    const result = await shoppingListService.fetchShoppingLists(validatedParams.data);

    loggerService.info('Shopping lists fetch-all handler completed', {
      status: 200,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify({
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        shoppingLists: result.shoppingLists
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error fetching shopping lists', { 
      error,
      routePath: ROUTE_PATH
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
  loggerService.info('Shopping lists fetch-all loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));