/************************************************************
 * Logger Utility
 * Centralized logging with different levels and formats
 * Supports development and production environments
 ************************************************************/
import winston from 'winston';
import { format } from 'winston';

/************************************************************
 * Define log levels
 ************************************************************/
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/************************************************************
 * Define log level based on environment
 ************************************************************/
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

/************************************************************
 * Define log colors
 ************************************************************/
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

/************************************************************
 * Define log format
 ************************************************************/
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      let metaString = '';
      
      if (Object.keys(meta).length > 0) {
        metaString = JSON.stringify(meta, null, 2);
      }
      
      return `${timestamp} [${level}]: ${message} ${metaString}`;
    }
  )
);

/************************************************************
 * Define console transport format (colored for development)
 ************************************************************/
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      let metaString = '';
      
      if (Object.keys(meta).length > 0 && process.env.NODE_ENV === 'development') {
        metaString = JSON.stringify(meta, null, 2);
      }
      
      return `${timestamp} [${level}]: ${message} ${metaString}`;
    }
  )
);

/************************************************************
 * Create the logger instance
 ************************************************************/
const logger = winston.createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/************************************************************
 * Create a stream object for Morgan (HTTP logging)
 ************************************************************/
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/************************************************************
 * Logging helper methods
 ************************************************************/

export const logRequest = (req: any, res: any, responseTime: number) => {
  const { method, url, ip } = req;
  const { statusCode } = res;
  const user = req.user ? `user:${req.user.id}` : 'anonymous';
  
  logger.http(`${method} ${url} ${statusCode} - ${responseTime}ms - ${user} - ${ip}`);
};

export const logError = (
  error: Error, 
  context?: string, 
  metadata?: Record<string, any>
) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    ...metadata
  });
};

export const logInfo = (
  message: string, 
  metadata?: Record<string, any>
) => {
  logger.info({ message, ...metadata });
};

export const logWarn = (
  message: string, 
  metadata?: Record<string, any>
) => {
  logger.warn({ message, ...metadata });
};

export const logDebug = (
  message: string, 
  metadata?: Record<string, any>
) => {
  logger.debug({ message, ...metadata });
};

/************************************************************
 * Database query logger
 ************************************************************/
export const logQuery = (
  query: string,
  params: any[],
  executionTime: number,
  success: boolean = true
) => {
  if (process.env.NODE_ENV === 'development') {
    const logMessage = `Query: ${query} | Params: ${JSON.stringify(params)} | Time: ${executionTime}ms`;
    
    if (success) {
      logger.debug(logMessage);
    } else {
      logger.error(`Query failed: ${logMessage}`);
    }
  }
};

/************************************************************
 * Performance logger
 ************************************************************/
export const logPerformance = (
  operation: string,
  duration: number,
  threshold: number = 100 // ms
) => {
  if (duration > threshold) {
    logger.warn(`Slow operation detected: ${operation} took ${duration}ms`);
  }
};

/************************************************************
 * Security event logger
 ************************************************************/
export const logSecurityEvent = (
  event: string,
  details: Record<string, any>
) => {
  logger.warn(`Security Event: ${event}`, details);
};

/************************************************************
 * Business event logger
 ************************************************************/
export const logBusinessEvent = (
  event: string,
  userId: number,
  details: Record<string, any>
) => {
  logger.info(`Business Event: ${event}`, { userId, ...details });
};

export default logger;