import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { storeCompanyMappingService } from '~/services/product-variant/store-company-mapping.service';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { exportMappingSchema } from '~/types/product-variant/store-company-mapping.schema';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/product-variant/customer-partner-number/export';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Export handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      loggerService.warn('Invalid method', { method: request.method });
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    loggerService.debug('Received export request', { params: rawParams });

    const validatedParams = exportMappingSchema.safeParse(rawParams);
    if (!validatedParams.success) {
      loggerService.warn('Export validation failed', { 
        errors: validatedParams.error.errors,
        params: rawParams 
      });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Starting export', { params: validatedParams.data });
    const result = await storeCompanyMappingService.exportMappings(validatedParams.data);
    loggerService.info('Export completed', { 
      filename: result.filename,
      contentType: result.contentType,
      size: result.buffer.length 
    });
    
    return new Response(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`
      }
    });

  } catch (error) {
    loggerService.error('Export failed', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Export loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 