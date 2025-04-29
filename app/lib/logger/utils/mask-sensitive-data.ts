/**
 * Utility functions for masking sensitive data in logs
 */

/**
 * Mask a string by showing only the first and last few characters
 * @param value String to mask
 * @param visibleStart Number of characters to show at the start
 * @param visibleEnd Number of characters to show at the end
 * @returns Masked string
 */
export function maskString(value: string, visibleStart = 4, visibleEnd = 4): string {
  if (!value) return '';
  if (value.length <= visibleStart + visibleEnd) return value;

  const start = value.substring(0, visibleStart);
  const end = value.substring(value.length - visibleEnd);
  return `${start}...${end}`;
}

/**
 * Mask an ID (typically a GUID or long identifier)
 * @param id ID to mask
 * @returns Masked ID
 */
export function maskId(id: string): string {
  return maskString(id, 6, 4);
}

/**
 * Mask an email address
 * @param email Email to mask
 * @returns Masked email
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const [username, domain] = email.split('@');
  return `${maskString(username, 2, 1)}@${domain}`;
}

/**
 * Create a preview of a long text
 * @param text Text to preview
 * @param maxLength Maximum length of preview
 * @returns Text preview
 */
export function createTextPreview(text: string, maxLength = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return `${text.substring(0, maxLength)}...`;
}

/**
 * Mask sensitive data in an object
 * @param obj Object to process
 * @param sensitiveKeys Keys to mask (exact match or regex pattern)
 * @param excludeKeys Keys to exclude from masking (exact match only)
 * @returns Object with masked sensitive data
 */
export function maskSensitiveData<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: (string | RegExp)[] = [
    /id$/i,
    /key$/i,
    'customerId',
    'companyLocationId',
    'email',
    'password',
    'token',
    'secret',
    'apiKey',
    'accessToken',
    'refreshToken',
    'fullPrompt',
    'prompt'
  ],
  excludeKeys: string[] = [
    'traceId',
  ]
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };

  for (const key in result) {
    // Skip if the value is null or undefined
    if (result[key] == null) continue;

    // Check if this key should be excluded from masking
    const isExcluded = excludeKeys.includes(key);

    // Check if this is a sensitive key
    const isSensitive = !isExcluded && sensitiveKeys.some(pattern =>
      typeof pattern === 'string'
        ? key === pattern
        : pattern.test(key)
    );

    if (isSensitive) {
      // Mask sensitive string values
      if (typeof result[key] === 'string') {
        if (key.toLowerCase().includes('email')) {
          result[key] = maskEmail(result[key] as string) as any;
        } else if (key.toLowerCase().includes('prompt') || key.toLowerCase().includes('text')) {
          result[key] = createTextPreview(result[key] as string) as any;
        } else {
          result[key] = maskId(result[key] as string) as any;
        }
      }
    } else if (typeof result[key] === 'object') {
      // Recursively process nested objects
      if (Array.isArray(result[key])) {
        // For arrays, only process objects, not primitives
        result[key] = result[key].map((item: any) =>
          typeof item === 'object' && item !== null
            ? maskSensitiveData(item, sensitiveKeys, excludeKeys)
            : item
        );
      } else {
        // Process regular objects
        result[key] = maskSensitiveData(result[key], sensitiveKeys, excludeKeys);
      }
    }
  }

  return result;
}

/**
 * Create a summary of an array
 * @param arr Array to summarize
 * @param maxItems Maximum number of items to include
 * @returns Summary object
 */
export function summarizeArray<T>(arr: T[], maxItems = 3): { count: number, items: T[] } {
  if (!arr || !Array.isArray(arr)) return { count: 0, items: [] };

  return {
    count: arr.length,
    items: arr.slice(0, maxItems)
  };
}
