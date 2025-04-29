import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { draftOrderService } from '~/services/order-management/draft-order.service';
import { draftOrderListRequestSchema } from '~/types/order-management/draft-order-list.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/order-management/draft-order/fetch-all';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Draft orders fetch-all handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      loggerService.warn('Method not allowed', {
        method: request.method,
        routePath: ROUTE_PATH
      });
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = draftOrderListRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { 
        errors: validatedParams.error.errors,
        routePath: ROUTE_PATH
      });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Fetching draft orders', {
      params: validatedParams.data,
      routePath: ROUTE_PATH
    });

    const result = await draftOrderService.fetchDraftOrders(validatedParams.data);

    loggerService.info('Draft orders fetch-all handler completed', {
      status: 200,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error fetching draft orders', {
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Draft orders fetch-all loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 