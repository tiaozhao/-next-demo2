import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';
import { ShippingMethodService } from '~/services/purchase-order/shipping-method.service';
import { GetShippingMethodsParamsSchema } from '~/types/shipping/shipping-method.schema';

const ROUTE_PATH = '/api/v1/shipping-methods/fetch-all';

/**
 * POST /api/v1/shipping-methods/fetch-all
 * Get eligible shipping methods for a given address and order details
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Shipping methods handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = GetShippingMethodsParamsSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    const shippingMethodService = new ShippingMethodService();
    const eligibleMethods = await shippingMethodService.getEligibleShippingMethods(validatedParams.data);

    loggerService.info('Shipping methods handler completed', {
      status: 200,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify(eligibleMethods),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    loggerService.error('Error getting shipping methods', { 
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Shipping methods loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 