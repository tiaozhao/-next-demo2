import type { ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { orderService } from '~/services/order-management/order.service';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { OrderDetailRequestSchema } from '~/types/order-management/order-detail.schema';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/order-management/order/get-by-id';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Order get-by-id handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = OrderDetailRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Getting order by ID', { 
      orderId: validatedParams.data.orderId,
      storeName: validatedParams.data.storeName,
      companyLocationId: validatedParams.data.companyLocationId
    });

    const result = await orderService.getOrderById(
      validatedParams.data.orderId, 
      validatedParams.data.storeName,
      validatedParams.data.companyLocationId
    );

    loggerService.info('Order get-by-id handler completed', {
      status: 200,
      routePath: ROUTE_PATH,
      orderId: validatedParams.data.orderId
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error getting order by ID', { 
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Order get-by-id loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 