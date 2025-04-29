import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { storeFeatureRequestSchema } from '~/types/store/store-feature.schema';
import { storeFeatureService } from '~/services/store-feature.service';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { loggerService } from '~/lib/logger';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/store/features';

/**
 * POST /api/v1/store/features
 * Get store feature configuration
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Store feature handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = storeFeatureRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Getting store feature configuration', { 
      storeName: validatedParams.data.storeName
    });

    const featureConfig = await storeFeatureService.getFeatures(
      validatedParams.data
    );

    if (!featureConfig) {
      loggerService.warn('Store feature configuration not found', { 
        storeName: validatedParams.data.storeName 
      });
      
      return new Response(
        JSON.stringify({ message: 'Store feature configuration not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    loggerService.info('Store feature handler completed', {
      status: 200,
      storeName: validatedParams.data.storeName,
      routePath: ROUTE_PATH,
      featureCount: featureConfig.features.length
    });

    return new Response(
      JSON.stringify({ featureConfig }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    loggerService.error('Error getting store feature configuration', { 
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Store feature loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 