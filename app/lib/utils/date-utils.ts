import { loggerService } from '../logger';

/**
 * Utility class for handling date operations throughout the application
 * Provides consistent date parsing, formatting and validation
 */
export class DateUtils {
  /**
   * Safely parse a date string into a Date object
   * Supports multiple formats including ISO 8601 and YYYY-MM-DD
   * 
   * @param dateString - The date string to parse
   * @returns A valid Date object or null if parsing fails
   */
  static safeParseDate(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    
    try {
      // Try direct parsing (works for ISO 8601 format)
      const date = new Date(dateString);
      
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // If it's YYYY-MM-DD format, add time part
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const dateWithTime = new Date(`${dateString}T00:00:00.000Z`);
        if (!isNaN(dateWithTime.getTime())) {
          return dateWithTime;
        }
      }
      
      loggerService.warn('Invalid date format', { dateString });
      return null;
    } catch (error) {
      loggerService.warn('Error parsing date', { error, dateString });
      return null;
    }
  }
  
  /**
   * Format a date to ISO 8601 string
   * 
   * @param date - Date object or string to format
   * @returns ISO 8601 string or null if formatting fails
   */
  static toISOString(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    
    try {
      const dateObj = typeof date === 'string' ? this.safeParseDate(date) : date;
      return dateObj ? dateObj.toISOString() : null;
    } catch (error) {
      loggerService.warn('Error converting date to ISO string', { error, date });
      return null;
    }
  }
  
  /**
   * Prepare a date for Prisma query
   * Returns a valid Date object or undefined (to avoid passing null to Prisma)
   * 
   * @param dateString - Date string to prepare for Prisma
   * @returns Date object or undefined
   */
  static toPrismaDate(dateString: string | null | undefined): Date | undefined {
    const date = this.safeParseDate(dateString);
    return date || undefined;
  }
  
  /**
   * Format a date to YYYY-MM-DD format
   * 
   * @param date - Date object or string to format
   * @returns Formatted date string or null if formatting fails
   */
  static formatDateOnly(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    
    try {
      const dateObj = typeof date === 'string' ? this.safeParseDate(date) : date;
      if (!dateObj) return null;
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      loggerService.warn('Error formatting date', { error, date });
      return null;
    }
  }

  /**
   * Check if a date string is valid
   * 
   * @param dateString - Date string to validate
   * @returns Boolean indicating if the date is valid
   */
  static isValidDate(dateString: string | null | undefined): boolean {
    if (!dateString) return false;
    return this.safeParseDate(dateString) !== null;
  }
}
