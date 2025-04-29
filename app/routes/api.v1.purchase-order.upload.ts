import { type ActionFunctionArgs, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { poFileUploadSchema } from '~/types/purchase-order/file-upload.schema';
import { poFileUploadService } from '~/services/purchase-order/po-upload.service';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';
import { PoFileUploadError } from '~/lib/errors/po-file-upload-errors';
import { HttpStatusCode } from '~/lib/errors/base-error';

const ROUTE_PATH = '/api/v1/purchase-order/upload';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Route handler for purchase order file uploads
 * POST /api/v1/purchase-order/upload
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'uploadAction';
    loggerService.info(`${METHOD}: Starting purchase order file upload handler`, {
      url: request.url,
      method: request.method,
      routePath: ROUTE_PATH,
      contentType: request.headers.get('content-type')
    });

    try {
      // Check if the request method is POST
      if (request.method !== 'POST') {
        loggerService.warn(`${METHOD}: Invalid method`, { method: request.method });
        return ErrorHandler.createMethodNotAllowedResponse();
      }

      // Check content type
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        loggerService.warn(`${METHOD}: Invalid content type`, { contentType });
        return ErrorHandler.createErrorResponse(new Error('Content-Type must be multipart/form-data'));
      }

      // Parse the multipart form data using unstable_parseMultipartFormData
      let formData;
      try {
        const uploadHandler = unstable_createMemoryUploadHandler({
          maxPartSize: MAX_FILE_SIZE
        });
        formData = await unstable_parseMultipartFormData(request, uploadHandler);
        loggerService.info(`${METHOD}: Form data parsed successfully`);
      } catch (error) {
        loggerService.error(`${METHOD}: Failed to parse form data`, {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          contentType
        });
        return ErrorHandler.createErrorResponse(new Error('Failed to parse form data'));
      }

      const requestParams = {
        storeName: formData.get('storeName'),
        file: formData.get('file'),
        customerId: formData.get('customerId'),
        companyId: formData.get('companyId') ? String(formData.get('companyId')) : undefined,
        companyLocationId: formData.get('companyLocationId') ? String(formData.get('companyLocationId')) : undefined
      };

      // Special handling for PDF files
      if (requestParams.file instanceof File) {
        const fileName = requestParams.file.name.toLowerCase();
        if (fileName.endsWith('.pdf') && !requestParams.file.type) {
          Object.defineProperty(requestParams.file, 'type', {
            writable: true,
            value: 'application/pdf'
          });
        }
      }

      // Log the received parameters
      loggerService.info(`${METHOD}: Received upload request`, {
        storeName: requestParams.storeName,
        fileName: requestParams.file instanceof File ? requestParams.file.name : undefined,
        fileType: requestParams.file instanceof File ? requestParams.file.type : undefined,
        fileSize: requestParams.file instanceof File ? requestParams.file.size : undefined,
        customerId: requestParams.customerId,
        companyId: requestParams.companyId,
        companyLocationId: requestParams.companyLocationId,
        isFile: requestParams.file instanceof File,
        fileKeys: Array.from(formData.keys())
      });

      // Validate the request
      const validatedParams = poFileUploadSchema.safeParse(requestParams);
      if (!validatedParams.success) {
        loggerService.warn(`${METHOD}: Validation failed`, { 
          errors: validatedParams.error.errors,
          params: requestParams 
        });
        return ErrorHandler.createValidationErrorResponse(validatedParams.error);
      }

      // Upload the file
      const result = await poFileUploadService.uploadFile(validatedParams.data);
      
      loggerService.info(`${METHOD}: File upload completed successfully`, {
        storeName: validatedParams.data.storeName,
        fileName: validatedParams.data.file.name,
        fileUrl: result.fileUrl,
        fileId: result.fileId
      });

      return new Response(JSON.stringify(result), {
        status: HttpStatusCode.OK,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      loggerService.error(`${METHOD}: Upload failed`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });

      if (error instanceof PoFileUploadError) {
        return new Response(
          JSON.stringify({
            success: false,
            message: error.message,
            error: error.errorCode
          }),
          { 
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return ErrorHandler.createErrorResponse(error);
    }
  })
);

/**
 * Loader function for handling OPTIONS requests
 */
export const loader = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    loggerService.info('Purchase order file upload loader started', {
      method: request.method,
      routePath: ROUTE_PATH
    });
    return new Response(null, { status: HttpStatusCode.OK });
  })
); 