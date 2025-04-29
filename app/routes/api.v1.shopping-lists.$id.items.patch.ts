import { type ActionFunctionArgs } from '@remix-run/node';
import { shoppingListService } from '~/services/shopping-lists/shopping-list.service';
import { loggerService } from '../lib/logger';
import { updateShoppingListItemsRequestSchema } from '../types/shopping-lists/shopping-list-items.schema';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { PriceListError, PriceListErrorCodes } from '~/lib/errors/price-list-errors';

const ROUTE_PATH = '/api/v1/shopping-lists/:id/items/patch';

export const action = withTracing(withCors(async ({ request, params }: ActionFunctionArgs) => {
  loggerService.info('Patch shopping list items handler started', {
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
    const validatedParams = updateShoppingListItemsRequestSchema.safeParse({
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
      const result = await shoppingListService.updateItems(validatedParams.data);
      return new Response(
        JSON.stringify({
          listItems: result
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      if (error instanceof PriceListError) {
        let statusCode = 500;
        switch (error.code) {
          case PriceListErrorCodes.NO_COMPANY_LOCATIONS:
          case PriceListErrorCodes.NO_PRICE_DATA:
          case PriceListErrorCodes.PRODUCT_NOT_FOUND:
            statusCode = 404;
            break;
          case PriceListErrorCodes.UNAUTHORIZED_ACCESS:
            statusCode = 403;
            break;
          case PriceListErrorCodes.FETCH_ERROR:
          case PriceListErrorCodes.SYNC_ERROR:
            statusCode = 500;
            break;
        }

        loggerService.warn('Price list error occurred', {
          errorCode: error.code,
          message: error.message,
          details: error.cause
        });

        return new Response(
          JSON.stringify({
            code: statusCode,
            errorCode: error.code,
            message: error.message,
            details: error.cause instanceof Error ? {
              message: error.cause.message,
              name: error.cause.name,
              data: error.code === PriceListErrorCodes.PRODUCT_NOT_FOUND 
                ? JSON.parse(error.cause.message)
                : undefined
            } : undefined
          }),
          {
            status: statusCode,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

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
        if (error.message.includes('Not authorized')) {
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
    loggerService.error('Error updating shopping list items', { error });
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
  loggerService.info('Patch shopping list items loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));