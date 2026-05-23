/**
 * Logger utility for debugging and monitoring API requests
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE'
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return colors.red;
      case LogLevel.WARN:
        return colors.yellow;
      case LogLevel.INFO:
        return colors.green;
      case LogLevel.DEBUG:
        return colors.cyan;
      case LogLevel.TRACE:
        return colors.blue;
      default:
        return colors.white;
    }
  }

  private formatLog(level: LogLevel, message: string, data?: any): void {
    const timestamp = this.getTimestamp();
    const color = this.getColor(level);
    const reset = colors.reset;
    const bright = colors.bright;

    const prefix = `${bright}[${timestamp}] ${color}[${level}]${reset}`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  error(message: string, error?: any): void {
    this.formatLog(LogLevel.ERROR, message, error);
  }

  warn(message: string, data?: any): void {
    this.formatLog(LogLevel.WARN, message, data);
  }

  info(message: string, data?: any): void {
    this.formatLog(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      this.formatLog(LogLevel.DEBUG, message, data);
    }
  }

  trace(message: string, data?: any): void {
    if (this.isDevelopment) {
      this.formatLog(LogLevel.TRACE, message, data);
    }
  }

  // API Request/Response logging
  logRequest(method: string, path: string, statusCode: number, duration: number): void {
    const statusColor = statusCode >= 400 ? colors.red : statusCode >= 300 ? colors.yellow : colors.green;
    const message = `${statusColor}${method} ${path} - ${statusCode}${colors.reset} (${duration}ms)`;
    console.log(`${colors.bright}[${this.getTimestamp()}] [API]${colors.reset} ${message}`);
  }

  logError(method: string, path: string, error: any): void {
    console.error(
      `${colors.red}${colors.bright}[${this.getTimestamp()}] [ERROR] ${method} ${path}${colors.reset}`,
      error
    );
  }

  logAuth(message: string, userId?: string): void {
    const userInfo = userId ? ` - User: ${userId}` : '';
    console.log(
      `${colors.magenta}${colors.bright}[${this.getTimestamp()}] [AUTH]${colors.reset} ${message}${userInfo}`
    );
  }

  logFile(message: string, filename?: string): void {
    const fileInfo = filename ? ` - File: ${filename}` : '';
    console.log(
      `${colors.cyan}${colors.bright}[${this.getTimestamp()}] [FILE]${colors.reset} ${message}${fileInfo}`
    );
  }

  // Separator for visual debugging
  separator(title?: string): void {
    if (title) {
      console.log(`\n${colors.bright}${'='.repeat(80)}${colors.reset}`);
      console.log(`${colors.bright}${title}${colors.reset}`);
      console.log(`${colors.bright}${'='.repeat(80)}${colors.reset}\n`);
    } else {
      console.log(`${colors.dim}${'-'.repeat(80)}${colors.reset}`);
    }
  }
}

export const logger = new Logger();
