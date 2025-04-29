import { type ActionFunctionArgs } from '@remix-run/node';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { loggerService } from '~/lib/logger';
import { withCors } from '~/lib/middleware/cors';
import { priceService } from '~/services/product-variant/price.service';
import { VariantPriceRequestSchema } from '~/types/product-variant/variant-prices.schema';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/product-variant/price/get-by-ids';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Get prices by IDs handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = VariantPriceRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters for variant prices request', { 
        errors: validatedParams.error.errors 
      });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    const { storeName, companyLocationId, variantIds } = validatedParams.data;

    const result = await priceService.getVariantPricesByIds(
      variantIds,
      companyLocationId,
      storeName
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    loggerService.error('Failed to fetch variant prices', { error });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Get prices by IDs loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 