/************************************************************
 * Validators Utility
 * Centralized validation functions for request data
 * Reusable across controllers and middleware
 ************************************************************/
import { ValidationChain, body, param, query } from 'express-validator';
import logger from './logger';

/************************************************************
 * Email validation
 ************************************************************/
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const emailValidator = (field: string = 'email'): ValidationChain => {
  return body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
    .custom((value) => {
      if (!validateEmail(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    });
};

/************************************************************
 * Password validation
 ************************************************************/
export const validatePassword = (password: string): boolean => {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

export const passwordValidator = (field: string = 'password'): ValidationChain => {
  return body(field)
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be 8-100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
    .custom((value) => {
      if (!validatePassword(value)) {
        throw new Error('Password does not meet security requirements');
      }
      return true;
    });
};

/************************************************************
 * Username validation
 ************************************************************/
export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
};

export const usernameValidator = (field: string = 'username'): ValidationChain => {
  return body(field)
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom((value) => {
      if (!validateUsername(value)) {
        throw new Error('Invalid username format');
      }
      return true;
    });
};

/************************************************************
 * Habit name validation
 ************************************************************/
export const validateHabitName = (name: string): boolean => {
  return name.trim().length >= 1 && name.trim().length <= 200;
};

export const habitNameValidator = (field: string = 'name'): ValidationChain => {
  return body(field)
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Habit name must be 1-200 characters')
    .custom((value) => {
      if (!validateHabitName(value)) {
        throw new Error('Invalid habit name');
      }
      return true;
    });
};

/************************************************************
 * Habit frequency validation
 ************************************************************/
export const validateFrequency = (frequency: string): boolean => {
  return ['daily', 'weekly'].includes(frequency);
};

export const frequencyValidator = (field: string = 'frequency'): ValidationChain => {
  return body(field)
    .isIn(['daily', 'weekly'])
    .withMessage('Frequency must be daily or weekly')
    .custom((value) => {
      if (!validateFrequency(value)) {
        throw new Error('Invalid frequency');
      }
      return true;
    });
};

/************************************************************
 * Color validation (hex color)
 ************************************************************/
export const validateColor = (color: string): boolean => {
  const colorRegex = /^#[0-9A-Fa-f]{6}$/;
  return colorRegex.test(color);
};

export const colorValidator = (field: string = 'color'): ValidationChain => {
  return body(field)
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color (e.g., #3B82F6)')
    .custom((value) => {
      if (value && !validateColor(value)) {
        throw new Error('Invalid color format');
      }
      return true;
    });
};

/************************************************************
 * Date validation (YYYY-MM-DD)
 ************************************************************/
export const validateDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

export const dateValidator = (field: string = 'date'): ValidationChain => {
  return body(field)
    .optional()
    .isDate()
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((value) => {
      if (!validateDate(value)) {
        throw new Error('Invalid date format');
      }
      return true;
    });
};

/************************************************************
 * ID validation (positive integer)
 ************************************************************/
export const validateId = (id: string): boolean => {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0;
};

export const idValidator = (field: string = 'id'): ValidationChain => {
  return param(field)
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
    .custom((value) => {
      if (!validateId(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    });
};

/************************************************************
 * Pagination validation
 ************************************************************/
export const paginationValidators = (): ValidationChain[] => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'name', 'completion_rate'])
    .withMessage('Invalid sort field'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc')
];

/************************************************************
 * Target days validation (for weekly habits)
 ************************************************************/
export const validateTargetDays = (targetDays: number[]): boolean => {
  if (!Array.isArray(targetDays)) return false;
  if (targetDays.length === 0) return false;
  
  return targetDays.every(day => 
    Number.isInteger(day) && day >= 1 && day <= 7
  );
};

export const targetDaysValidator = (field: string = 'target_days'): ValidationChain => {
  return body(field)
    .optional()
    .custom((value) => {
      if (value && !validateTargetDays(value)) {
        throw new Error('target_days must be an array of numbers 1-7 (Monday-Sunday)');
      }
      return true;
    });
};

/************************************************************
 * Notes validation
 ************************************************************/
export const validateNotes = (notes: string): boolean => {
  return notes.length <= 500;
};

export const notesValidator = (field: string = 'notes'): ValidationChain => {
  return body(field)
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
    .custom((value) => {
      if (value && !validateNotes(value)) {
        throw new Error('Notes too long');
      }
      return true;
    });
};

/************************************************************
 * Boolean validation
 ************************************************************/
export const booleanValidator = (field: string): ValidationChain => {
  return body(field)
    .isBoolean()
    .withMessage(`${field} must be true or false`)
    .toBoolean();
};

/************************************************************
 * URL validation
 ************************************************************/
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const urlValidator = (field: string = 'url'): ValidationChain => {
  return body(field)
    .optional()
    .isURL()
    .withMessage('Valid URL is required')
    .custom((value) => {
      if (!validateURL(value)) {
        throw new Error('Invalid URL format');
      }
      return true;
    });
};

/************************************************************
 * Phone number validation (basic)
 ************************************************************/
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const phoneValidator = (field: string = 'phone'): ValidationChain => {
  return body(field)
    .optional()
    .custom((value) => {
      if (value && !validatePhone(value)) {
        throw new Error('Invalid phone number format');
      }
      return true;
    });
};

/************************************************************
 * Custom validation error handler
 ************************************************************/
export const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = req.validationErrors();
  
  if (errors) {
    logger.warn('Validation failed', {
      errors,
      path: req.path,
      method: req.method
    });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.map((err: any) => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/************************************************************
 * Sanitize input to prevent XSS
 ************************************************************/
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/************************************************************
 * Validate and sanitize habit data
 ************************************************************/
export const sanitizeHabitData = (data: any): any => {
  const sanitized: any = {};
  
  if (data.name) sanitized.name = sanitizeInput(data.name.trim());
  if (data.description) sanitized.description = sanitizeInput(data.description.trim());
  if (data.color) sanitized.color = data.color;
  if (data.frequency) sanitized.frequency = data.frequency;
  if (data.target_days) sanitized.target_days = data.target_days;
  
  return sanitized;
};

/************************************************************
 * Validate and sanitize user data
 ************************************************************/
export const sanitizeUserData = (data: any): any => {
  const sanitized: any = {};
  
  if (data.username) sanitized.username = sanitizeInput(data.username.trim());
  if (data.email) sanitized.email = data.email.toLowerCase().trim();
  
  return sanitized;
};

/************************************************************
 * Export all validators
 ************************************************************/
export default {
  validateEmail,
  validatePassword,
  validateUsername,
  validateHabitName,
  validateFrequency,
  validateColor,
  validateDate,
  validateId,
  validateTargetDays,
  validateNotes,
  validateURL,
  validatePhone,
  
  emailValidator,
  passwordValidator,
  usernameValidator,
  habitNameValidator,
  frequencyValidator,
  colorValidator,
  dateValidator,
  idValidator,
  targetDaysValidator,
  notesValidator,
  booleanValidator,
  urlValidator,
  phoneValidator,
  
  paginationValidators,
  handleValidationErrors,
  sanitizeInput,
  sanitizeHabitData,
  sanitizeUserData
};