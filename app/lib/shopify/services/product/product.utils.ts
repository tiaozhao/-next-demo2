import { loggerService } from '~/lib/logger';

/**
 * Handle GraphQL errors
 * @param errors GraphQL errors array
 * @param className Class name for logging
 */
export function handleGraphQLErrors(errors: any, className: string): void {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return;
  }

  const errorMessages = errors.map((error: any) =>
    error.message || 'Unknown GraphQL error'
  ).join(', ');

  loggerService.error(`${className}.handleGraphQLErrors: GraphQL errors encountered`, {
    errors: errors.map((error: any) => ({
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: error.extensions
    }))
  });

  throw new Error(`GraphQL errors: ${errorMessages}`);
} 