import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { draftOrderService } from '~/services/order-management/draft-order.service';
import { draftOrderRejectRequestSchema } from '~/types/order-management/draft-order-reject.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { DraftOrderError } from '~/lib/errors/draft-order-errors';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/order-management/draft-order/reject';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Draft order reject handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = draftOrderRejectRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    const result = await draftOrderService.rejectDraftOrder(validatedParams.data);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          code: 400,
          message: 'Failed to reject draft order'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Draft order rejected successfully'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    if (error instanceof DraftOrderError) {
      return new Response(
        JSON.stringify({
          code: error.statusCode,
          message: error.message
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Draft order reject loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 