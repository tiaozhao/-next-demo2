import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { customerPartnerNumberUploadRequestSchema } from '~/types/product-variant/customer-partner-number-upload.schema';
import { storeCompanyMappingService } from '~/services/product-variant/store-company-mapping.service';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/product-variant/customer-partner-number/upload';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  const METHOD = 'uploadAction';
  loggerService.info('Upload handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      loggerService.warn(`${METHOD}: Invalid method`, { method: request.method });
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const formData = await request.formData();
    const requestParams = {
      storeName: formData.get('storeName'),
      format: formData.get('format') || undefined,
      file: formData.get('file')
    };

    loggerService.debug(`${METHOD}: Received upload request`, {
      storeName: requestParams.storeName,
      format: requestParams.format,
      fileName: requestParams.file instanceof File ? requestParams.file.name : undefined
    });

    const validatedParams = customerPartnerNumberUploadRequestSchema.safeParse(requestParams);
    if (!validatedParams.success) {
      loggerService.warn(`${METHOD}: Validation failed`, { 
        errors: validatedParams.error.errors,
        params: requestParams 
      });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    const result = await storeCompanyMappingService.uploadCustomerPartnerNumbers(validatedParams.data);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    loggerService.error(`${METHOD}: Upload failed`, {
      error,
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : 'Unknown error'
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Upload loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 