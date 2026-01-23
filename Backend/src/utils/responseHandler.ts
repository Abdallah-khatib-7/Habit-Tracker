/************************************************************
 * Response Handler Utility
 * Standardizes API responses across the application
 * Provides consistent success and error response formats
 ************************************************************/
import { Response } from 'express';
import logger from './logger';

/************************************************************
 * Interface for standardized API response
 ************************************************************/
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  meta?: {
    timestamp: string;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

/************************************************************
 * Success response handler
 ************************************************************/
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  meta?: ApiResponse['meta'],
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };

  // Log successful response for debugging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Success response', {
      statusCode,
      path: res.req?.originalUrl,
      method: res.req?.method,
      userId: (res.req as any)?.user?.id
    });
  }

  res.status(statusCode).json(response);
};

/************************************************************
 * Error response handler
 ************************************************************/
export const sendError = (
  res: Response,
  error: string,
  details?: any,
  statusCode: number = 500
): void => {
  const response: ApiResponse = {
    success: false,
    error,
    details,
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  // Log error for monitoring
  logger.error('Error response', {
    statusCode,
    error,
    details,
    path: res.req?.originalUrl,
    method: res.req?.method,
    userId: (res.req as any)?.user?.id
  });

  res.status(statusCode).json(response);
};

/************************************************************
 * Send response with full control (legacy compatibility)
 ************************************************************/
export const sendResponse = (
  res: Response,
  statusCode: number = 200,
  data: any = {}
): void => {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    ...data,
    meta: {
      timestamp: new Date().toISOString(),
      ...data.meta
    }
  };

  // Log response for debugging
  if (process.env.NODE_ENV === 'development') {
    const logLevel = response.success ? 'debug' : 'warn';
    logger.log(logLevel, 'API Response', {
      statusCode,
      path: res.req?.originalUrl,
      method: res.req?.method,
      success: response.success
    });
  }

  res.status(statusCode).json(response);
};

/************************************************************
 * Pagination helper for list responses
 ************************************************************/
export const paginate = <T>(
  items: T[],
  page: number = 1,
  limit: number = 20,
  total: number = 0
): {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
} => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: totalPages,
      hasNext,
      hasPrev
    }
  };
};

/************************************************************
 * Send paginated response
 ************************************************************/
export const sendPaginated = <T>(
  res: Response,
  items: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  additionalData?: any
): void => {
  const paginated = paginate(items, pagination.page, pagination.limit, pagination.total);
  
  sendSuccess(res, {
    ...additionalData,
    items: paginated.items,
    pagination: paginated.pagination
  });
};

/************************************************************
 * Validation error response helper
 ************************************************************/
export const sendValidationError = (
  res: Response,
  errors: any[],
  message: string = 'Validation failed'
): void => {
  sendError(res, message, { errors }, 400);
};

/************************************************************
 * Not found response helper
 ************************************************************/
export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
): void => {
  sendError(res, `${resource} not found`, null, 404);
};

/************************************************************
 * Unauthorized response helper
 ************************************************************/
export const sendUnauthorized = (
  res: Response,
  message: string = 'Authentication required'
): void => {
  sendError(res, message, null, 401);
};

/************************************************************
 * Forbidden response helper
 ************************************************************/
export const sendForbidden = (
  res: Response,
  message: string = 'Access forbidden'
): void => {
  sendError(res, message, null, 403);
};

/************************************************************
 * Conflict response helper (for duplicate resources)
 ************************************************************/
export const sendConflict = (
  res: Response,
  message: string = 'Resource already exists'
): void => {
  sendError(res, message, null, 409);
};

/************************************************************
 * Rate limit response helper
 ************************************************************/
export const sendRateLimit = (
  res: Response,
  retryAfter?: number
): void => {
  const headers: Record<string, string> = {};
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }
  
  const response: ApiResponse = {
    success: false,
    error: 'Too many requests',
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  if (retryAfter) {
    response.details = { retryAfter };
  }

  res.set(headers).status(429).json(response);
};

/************************************************************
 * Empty response helper (204 No Content)
 ************************************************************/
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

/************************************************************
 * Created response helper (201 Created)
 ************************************************************/
export const sendCreated = <T>(
  res: Response,
  data: T,
  location?: string
): void => {
  if (location) {
    res.set('Location', location);
  }
  
  sendSuccess(res, data, undefined, 201);
};

/************************************************************
 * Bad request response helper
 ************************************************************/
export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request',
  details?: any
): void => {
  sendError(res, message, details, 400);
};

/************************************************************
 * Internal server error response helper
 ************************************************************/
export const sendInternalError = (
  res: Response,
  error: Error,
  requestId?: string
): void => {
  const details: any = {};
  
  if (requestId) {
    details.requestId = requestId;
  }
  
  if (process.env.NODE_ENV !== 'production') {
    details.stack = error.stack;
  }
  
  sendError(res, 'Internal server error', details, 500);
};

/************************************************************
 * Health check response helper
 ************************************************************/
export const sendHealthCheck = (
  res: Response,
  services: Record<string, boolean>
): void => {
  const allHealthy = Object.values(services).every(status => status === true);
  
  const response: ApiResponse = {
    success: allHealthy,
    data: {
      status: allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
  
  res.status(allHealthy ? 200 : 503).json(response);
};

export default {
  sendSuccess,
  sendError,
  sendResponse,
  sendPaginated,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendRateLimit,
  sendNoContent,
  sendCreated,
  sendBadRequest,
  sendInternalError,
  sendHealthCheck
};