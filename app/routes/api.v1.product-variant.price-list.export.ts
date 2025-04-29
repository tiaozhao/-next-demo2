import { type ActionFunctionArgs } from '@remix-run/node';
import { ErrorHandler } from "~/lib/errors/error-handler";
import { loggerService } from "~/lib/logger";
import { withCors } from "~/lib/middleware/cors";
import { priceService } from "~/services/product-variant/price.service";
import { PriceListExportRequestSchema } from "~/types/product-variant/price-list-export.schema";
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/product-variant/price-list/export';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Price list export handler started', {
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
    loggerService.debug('Received catalog prices export request', { params: rawParams });

    const validatedParams = PriceListExportRequestSchema.safeParse(rawParams);
    if (!validatedParams.success) {
      loggerService.warn('Catalog prices export validation failed', { 
        errors: validatedParams.error.errors,
        params: rawParams 
      });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Starting catalog prices export', { params: validatedParams.data });
    const result = await priceService.exportCatalogPrices(validatedParams.data);
    loggerService.info('Catalog prices export completed', { 
      fileName: result.filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: result.buffer.length 
    });

    return new Response(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`
      }
    });

  } catch (error) {
    loggerService.error('Catalog prices export failed', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Price list export loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));