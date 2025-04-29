import { type ActionFunctionArgs } from '@remix-run/node';
import { TransformService } from '~/services/shopify-to-coveo/transfrom.service';
import { loggerService } from '../lib/logger';
import { z } from 'zod';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/transform';

const transformParamsSchema = z.object({
  storeName: z.string(),
  first: z.number().int().positive().optional().default(50),
  doDelete: z.boolean().optional().default(false)
});

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Transform handler started', {
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
    const validatedParams = transformParamsSchema.safeParse(rawParams);

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

    loggerService.info('Starting transform', { params: validatedParams.data });
    const { storeName, first, doDelete } = validatedParams.data;
    const transformService = new TransformService(storeName, first);

    if (doDelete) {
      await transformService.deleteAllProducts();
    } else {
      await transformService.pushProductsToCoveo();
    }

    loggerService.info('Transform handler completed', {
      status: 200,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: doDelete ? 'All products deleted' : 'Products pushed successfully'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error in transform', { 
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
  loggerService.info('Transform loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 