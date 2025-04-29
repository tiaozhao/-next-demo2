import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { storeCompanyMappingService } from '~/services/product-variant/store-company-mapping.service';
import { bulkDeleteMappingSchema } from '~/types/product-variant/store-company-mapping.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/product-variant/customer-partner-number/bulk-delete';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Bulk delete handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = bulkDeleteMappingSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    const result = await storeCompanyMappingService.bulkDelete(validatedParams.data);
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Bulk delete loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 