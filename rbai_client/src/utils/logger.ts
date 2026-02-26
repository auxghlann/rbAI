/**
 * Secure logging utility for production environments
 * 
 * Replaces console.log/error/warn with environment-aware logging
 * that prevents sensitive data exposure in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, data || '');
    }
    // In production, could send to monitoring service
    this.logToMonitoring('info', message, data);
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data || '');
    } else {
      // In production, sanitize and log
      console.warn(`[WARN] ${message}`);
    }
    this.logToMonitoring('warn', message, data);
  }

  /**
   * Log errors (sanitized in production)
   */
  error(message: string, error?: any): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error || '');
    } else {
      // In production, never log full error objects (may contain sensitive data)
      const sanitizedMessage = this.sanitizeErrorMessage(message);
      console.error(`[ERROR] ${sanitizedMessage}`);
    }
    this.logToMonitoring('error', message, error);
  }

  /**
   * Sanitize error messages for production
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove potential sensitive patterns
    return message
      .replace(/token[=:]\s*[\w-]+/gi, 'token=***')
      .replace(/api[_-]key[=:]\s*[\w-]+/gi, 'api_key=***')
      .replace(/password[=:]\s*[\w-]+/gi, 'password=***')
      .replace(/Bearer\s+[\w-]+/gi, 'Bearer ***');
  }

  /**
   * Send logs to monitoring service (placeholder)
   * Implement this to integrate with services like Sentry, LogRocket, etc.
   */
  private logToMonitoring(level: LogLevel, message: string, data?: any): void {
    // Only log errors and warnings to monitoring in production
    if (this.isProduction && (level === 'error' || level === 'warn')) {
      // TODO: Integrate with monitoring service
      // Example: Sentry.captureMessage(message, level);
    }
  }

  /**
   * Track user action for analytics (sanitized)
   */
  trackAction(action: string, properties?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.log(`[TRACK] ${action}`, properties);
    }
    // In production, send to analytics service
    // Ensure no PII is included
  }
}

// Export singleton instance
export const logger = new Logger();

// Legacy console override for catching missed instances
if (import.meta.env.PROD) {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = (...args: any[]) => {
    // In production, block raw console.log
    // Allow through logger only
    if (args[0]?.startsWith?.('[DEBUG]') || args[0]?.startsWith?.('[INFO]')) {
      originalConsoleLog(...args);
    }
  };

  console.error = (...args: any[]) => {
    if (args[0]?.startsWith?.('[ERROR]')) {
      originalConsoleError(...args);
    }
  };

  console.warn = (...args: any[]) => {
    if (args[0]?.startsWith?.('[WARN]')) {
      originalConsoleWarn(...args);
    }
  };
}
