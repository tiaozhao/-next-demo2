import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';
import { shopSettingsRequestSchema } from '~/types/shop/shop-settings.schema';
import { shopSettingsService } from '~/services/shop/shop-settings.service';

const ROUTE_PATH = '/api/v1/shop/settings-general/fetch-all';

/**
 * Handle OPTIONS requests for CORS
 */
export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Shop settings general fetch-all loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));

/**
 * Fetch shop general settings including timezone information
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Shop settings general fetch-all handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = shopSettingsRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.debug('Parameters validated successfully', { params: validatedParams.data });
    const shop = await shopSettingsService.fetchGeneralSettings(validatedParams.data);
    
    loggerService.info('Shop settings fetched successfully');
    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Shop settings fetched successfully',
        shop
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error fetching shop general settings', { error });
    return ErrorHandler.createErrorResponse(error);
  }
})); 