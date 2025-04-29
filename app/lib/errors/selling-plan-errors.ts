import { BaseError, HttpStatusCode } from './base-error';

/**
 * Error codes for selling plan operations
 */
export enum SellingPlanErrorCodes {
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  NOT_FOUND = 'NOT_FOUND',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED'
}

/**
 * Custom error class for selling plan related errors
 */
export class SellingPlanError extends BaseError {
  constructor(message: string, errorCode: SellingPlanErrorCodes, statusCode = HttpStatusCode.BAD_REQUEST) {
    super(message, statusCode, errorCode);
    this.name = 'SellingPlanError';
  }

  /**
   * Create an error for a selling plan that already exists
   */
  static alreadyExists(name: string, storeName: string): SellingPlanError {
    return new SellingPlanError(
      `Selling plan with name '${name}' already exists for store '${storeName}'`,
      SellingPlanErrorCodes.ALREADY_EXISTS,
      HttpStatusCode.CONFLICT
    );
  }

  /**
   * Create an error for a selling plan that cannot be found
   */
  static notFound(id: number | string): SellingPlanError {
    return new SellingPlanError(
      `Selling plan with ID ${id} not found`,
      SellingPlanErrorCodes.NOT_FOUND,
      HttpStatusCode.NOT_FOUND
    );
  }

  /**
   * Create an error for unauthorized access to a selling plan
   */
  static notAuthorized(message: string = 'Not authorized to access this selling plan'): SellingPlanError {
    return new SellingPlanError(
      message,
      SellingPlanErrorCodes.NOT_AUTHORIZED,
      HttpStatusCode.FORBIDDEN
    );
  }

  /**
   * Create an error for validation failures
   */
  static validationError(message: string): SellingPlanError {
    return new SellingPlanError(
      message,
      SellingPlanErrorCodes.VALIDATION_ERROR,
      HttpStatusCode.BAD_REQUEST
    );
  }

  /**
   * Create an error for operation failures
   */
  static operationFailed(message: string): SellingPlanError {
    return new SellingPlanError(
      message,
      SellingPlanErrorCodes.OPERATION_FAILED,
      HttpStatusCode.INTERNAL_SERVER_ERROR
    );
  }
} 