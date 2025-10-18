import { Elysia } from "elysia";
import { logger } from "./logger";

/**
 * Middleware to log all incoming requests and responses
 */
export const requestLoggingMiddleware = (app: Elysia) => {
  return app
    .onRequest((context: any) => {
      const request = context.request;
      const method = request.method;
      const url = new URL(request.url);
      const path = url.pathname + url.search;
      
      // Store start time for duration calculation
      context._startTime = Date.now();
      
      logger.trace(`📨 ${method} ${path}`);
    })
    .onError((context: any) => {
      const request = context.request;
      const error = context.error;
      const code = context.code;
      const method = request.method;
      const url = new URL(request.url);
      const path = url.pathname + url.search;
      
      logger.logError(method, path, error);
      
      logger.debug(`Error Code: ${code}`, {
        error: error?.message,
        stack: error?.stack
      });
    });
};

export default requestLoggingMiddleware;
