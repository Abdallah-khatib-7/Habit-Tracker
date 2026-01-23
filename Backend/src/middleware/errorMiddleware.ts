/************************************************************
 * Error Middleware
 * Centralized error handling for Express.js
 * Provides consistent error responses and logging
 ************************************************************/
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/************************************************************
 * Error Handler Middleware
 * Catches all errors and sends appropriate responses
 ************************************************************/
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id || 'anonymous',
    ip: req.ip
  });

  // Default error response
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let details = error.details;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Authentication required';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access forbidden';
  } else if (error.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry detected';
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 404;
    message = 'Referenced record not found';
  }

  // In production, don't expose stack traces
  const isProduction = process.env.NODE_ENV === 'production';

  const errorResponse: any = {
    success: false,
    error: message,
    ...(details && { details }),
    ...(!isProduction && { stack: error.stack })
  };

  // Special handling for rate limiting
  if (statusCode === 429) {
    errorResponse.retryAfter = req.get('Retry-After');
  }

  res.status(statusCode).json(errorResponse);
};

/************************************************************
 * 404 Not Found Handler
 * Catches undefined routes
 ************************************************************/
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error: AppError = new Error(`Route not found: ${req.method} ${req.url}`);
  error.statusCode = 404;
  next(error);
};

/************************************************************
 * Async Handler Wrapper
 * Eliminates try-catch blocks in async route handlers
 ************************************************************/
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/************************************************************
 * Validation Error Handler
 * Handles express-validator errors
 ************************************************************/
export const validationErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = (req as any).validationErrors;
  if (errors) {
    const error: AppError = new Error('Validation failed');
    error.statusCode = 400;
    error.details = errors;
    return next(error);
  }
  next();
};

/************************************************************
 * Database Connection Error Handler
 ************************************************************/
export const databaseErrorHandler = (error: AppError) => {
  logger.error('Database error:', error);
  
  // Map database errors to user-friendly messages
  if (error.code === 'ECONNREFUSED') {
    error.message = 'Database connection failed. Please try again later.';
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    error.message = 'Database access denied. Please contact administrator.';
  } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
    error.message = 'Database connection lost. Reconnecting...';
  }
  
  error.statusCode = 503; // Service Unavailable
  return error;
};

/************************************************************
 * Rate Limit Error Handler
 ************************************************************/
export const rateLimitErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error: AppError = new Error('Too many requests');
  error.statusCode = 429;
  next(error);
};

/************************************************************
 * Security Error Handler
 * Handles security-related errors
 ************************************************************/
export const securityErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Token expired';
  }
  next(error);
};