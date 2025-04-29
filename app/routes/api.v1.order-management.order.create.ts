import type { ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';
import { CreateOrderRequestSchema } from '~/types/order-management/create-order.schema';
import { orderService } from '~/services/order-management/order.service';

const ROUTE_PATH = '/api/v1/order-management/order/create';

/**
 * Create order handler
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Order create handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    // Validate HTTP method
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    // Validate request parameters
    const rawParams = await request.json();
    const validatedParams = CreateOrderRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    // Call order service to create order
    const result = await orderService.createOrder(validatedParams.data);

    loggerService.info('Order create handler completed', {
      status: result.code,
      routePath: ROUTE_PATH,
      data: result.data
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    loggerService.error('Error in order create handler', { 
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Order create loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 