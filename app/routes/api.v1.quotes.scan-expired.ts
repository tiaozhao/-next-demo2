import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { quoteService } from '~/services/quotes/quote.service';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';
import { expireQuoteSchema } from '~/types/quotes/quote.schema';

const ROUTE_PATH = '/api/v1/quotes/scan-expired';

/**
 * POST /api/v1/quotes/scan-expired
 * Scan and expire quotes that have passed their expiration date
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote scan-expired handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }


    const rawParams = await request.json();
    const validatedParams = expireQuoteSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Expiring quote', {
      quoteId: validatedParams.data.quoteId,
      storeName: validatedParams.data.storeName,
      companyLocationId: validatedParams.data.companyLocationId,
      customerId: validatedParams.data.customerId
    });

    loggerService.info('Scanning expired quotes');

    const { expiredQuoteIds } = await quoteService.scanAndExpireQuotes(validatedParams.data);

    loggerService.info('Quote scan-expired handler completed', {
      status: 200,
      expiredCount: expiredQuoteIds.length,
      expiredQuoteIds,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify({
        code: 200,
        message: `Successfully expired ${expiredQuoteIds.length} quotes`,
        data: {
          expiredQuoteIds
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    loggerService.error('Error scanning expired quotes', {
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote scan-expired loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));