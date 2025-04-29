import winston from 'winston';
import { loggerConfig } from '../config/logger.config';
import { trace, context } from '@opentelemetry/api';
import { maskSensitiveData } from '../utils/mask-sensitive-data';

/**
 * Service for handling application logging
 * @class LoggerService
 */
class LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger(loggerConfig);
  }

  /**
   * Get current trace ID from OpenTelemetry context
   */
  private getTraceId(): string | undefined {
    try {
      const activeSpan = trace.getSpan(context.active());
      if (!activeSpan) {
        return undefined;
      }
      return activeSpan.spanContext().traceId;
    } catch {
      return undefined;
    }
  }

  /**
   * Add trace context to metadata and mask sensitive data
   */
  private processMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
    // First add trace context
    const traceId = this.getTraceId();
    const metaWithTrace = traceId ? { ...meta, traceId } : (meta || {});

    // Then mask sensitive data
    return maskSensitiveData(metaWithTrace);
  }

  /**
   * Log information message
   * @param message - Message to log
   * @param meta - Additional metadata to log
   */
  public info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, this.processMetadata(meta));
  }

  /**
   * Log error message
   * @param message - Error message to log
   * @param meta - Error object or metadata to log
   */
  public error(message: string, meta?: Error | Record<string, unknown>): void {
    if (meta instanceof Error) {
      // Extract error details but limit stack trace length
      const stack = meta.stack ? meta.stack.split('\n').slice(0, 3).join('\n') + '...' : undefined;

      this.logger.error(message, this.processMetadata({
        error: {
          name: meta.name,
          message: meta.message,
          stack,
        },
      }));
    } else {
      this.logger.error(message, this.processMetadata(meta));
    }
  }

  /**
   * Log warning message
   * @param message - Warning message to log
   * @param meta - Additional metadata to log
   */
  public warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, this.processMetadata(meta));
  }

  /**
   * Log debug message
   * @param message - Debug message to log
   * @param meta - Additional metadata to log
   */
  public debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, this.processMetadata(meta));
  }

  /**
   * Check if a specific log level is enabled
   * @param level - Log level to check
   * @returns Whether the level is enabled
   */
  public isLevelEnabled(level: string): boolean {
    const currentLevel = this.logger.level;
    const levels = this.logger.levels;

    return levels[currentLevel] >= levels[level];
  }
}

export const loggerService = new LoggerService();