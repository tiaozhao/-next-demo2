import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { poParserRequestSchema } from '~/types/purchase-order/po-parser.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';
import { poParserService } from '~/services/purchase-order/po-parser.service';

const ROUTE_PATH = '/api/v1/purchase-order/parse';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('PO parser handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = poParserRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Parsing purchase order', { params: validatedParams.data });
    const result = await poParserService.parseOrder(validatedParams.data);

    loggerService.info('PO parser handler completed', {
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
    loggerService.error('Error parsing purchase order', { 
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('PO parser loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 