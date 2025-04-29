import { type ActionFunctionArgs } from '@remix-run/node';
import { sellingPlanService } from '~/services/selling-plans/selling-plan.service';
import { loggerService } from '~/lib/logger';
import { createSellingPlanSchema } from '~/types/selling-plans/selling-plan.schema';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/selling-plans/create';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Selling plan create handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          code: 405,
          message: 'Method not allowed'
        }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const rawParams = await request.json();
    const validatedParams = createSellingPlanSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return new Response(
        JSON.stringify({ 
          code: 400,
          message: 'Invalid parameters',
          errors: validatedParams.error.errors 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    loggerService.info('Creating selling plan', { params: validatedParams.data });
    const result = await sellingPlanService.createSellingPlan(validatedParams.data);

    loggerService.info('Selling plan create handler completed', {
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
    loggerService.error('Error creating selling plan', { 
      error,
      routePath: ROUTE_PATH
    });
    return new Response(
      JSON.stringify({
        code: 500,
        message: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Selling plan create loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 