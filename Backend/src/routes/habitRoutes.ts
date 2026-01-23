/************************************************************
 * Habit Routes
 * Defines habit management endpoints with validation
 ************************************************************/
import { NextFunction, Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import habitController from '../controllers/habitController';
import { authenticate } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';
import { validateFrequency, validateColor } from '../utils/validators';

const router = Router();

/************************************************************
 * All habit routes require authentication
 ************************************************************/
router.use(authenticate);

/************************************************************
 * GET /api/habits
 * Get all habits for current user
 ************************************************************/
router.get(
  '/',
  [
    query('includeStats')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('includeStats must be true or false'),
    
    query('timeframe')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('timeframe must be between 1 and 365 days'),
    
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'all'])
      .withMessage('status must be active, inactive, or all')
  ],
  asyncHandler(habitController.getHabits)
);

/************************************************************
 * GET /api/habits/dashboard
 * Get dashboard statistics
 ************************************************************/
router.get(
  '/dashboard',
  [
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('period must be week, month, quarter, or year')
  ],
  asyncHandler(habitController.getDashboardStats)
);

/************************************************************
 * POST /api/habits
 * Create new habit
 ************************************************************/
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Habit name must be 1-200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    
    body('frequency')
      .isIn(['daily', 'weekly'])
      .withMessage('Frequency must be daily or weekly')
      .custom(validateFrequency),
    
    body('target_days')
      .optional()
      .custom((value) => {
        if (value && !Array.isArray(value)) {
          throw new Error('target_days must be an array');
        }
        if (value && value.some((day: number) => day < 1 || day > 7)) {
          throw new Error('target_days must contain numbers 1-7 (Monday-Sunday)');
        }
        return true;
      }),
    
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color (e.g., #3B82F6)')
      .custom(validateColor)
  ],
  asyncHandler(habitController.createHabit)
);

/************************************************************
 * GET /api/habits/:id
 * Get single habit by ID
 ************************************************************/
router.get(
  '/:id',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Habit ID must be a positive integer')
  ],
  asyncHandler(habitController.getHabit)
);

/************************************************************
 * PUT /api/habits/:id
 * Update habit
 ************************************************************/
router.put(
  '/:id',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Habit ID must be a positive integer'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Habit name must be 1-200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    
    body('frequency')
      .optional()
      .isIn(['daily', 'weekly'])
      .withMessage('Frequency must be daily or weekly')
      .custom(validateFrequency),
    
    body('target_days')
      .optional()
      .custom((value) => {
        if (value && !Array.isArray(value)) {
          throw new Error('target_days must be an array');
        }
        if (value && value.some((day: number) => day < 1 || day > 7)) {
          throw new Error('target_days must contain numbers 1-7 (Monday-Sunday)');
        }
        return true;
      }),
    
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color (e.g., #3B82F6)')
      .custom(validateColor),
    
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be true or false')
  ],
  asyncHandler(habitController.updateHabit)
);

/************************************************************
 * DELETE /api/habits/:id
 * Delete habit (soft delete)
 ************************************************************/
router.delete(
  '/:id',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Habit ID must be a positive integer')
  ],
  asyncHandler(habitController.deleteHabit)
);

/************************************************************
 * POST /api/habits/:id/log
 * Log habit completion
 ************************************************************/
router.post(
  '/:id/log',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Habit ID must be a positive integer'),
    
    body('date')
      .optional()
      .isDate()
      .withMessage('Date must be in YYYY-MM-DD format'),
    
    body('completed')
      .isBoolean()
      .withMessage('Completed must be true or false'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters')
  ],
  asyncHandler(habitController.logHabit)
);

/************************************************************
 * GET /api/habits/:id/logs
 * Get habit logs
 ************************************************************/
router.get(
  '/:id/logs',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Habit ID must be a positive integer'),
    
    query('startDate')
      .optional()
      .isDate()
      .withMessage('startDate must be in YYYY-MM-DD format'),
    
    query('endDate')
      .optional()
      .isDate()
      .withMessage('endDate must be in YYYY-MM-DD format'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('limit must be between 1 and 1000')
  ],
  asyncHandler(habitController.getHabitLogs)
);

/************************************************************
 * POST /api/habits/bulk-log
 * Bulk log multiple habits
 ************************************************************/
router.post(
  '/bulk-log',
  [
    body('date')
      .isDate()
      .withMessage('Date must be in YYYY-MM-DD format'),
    
    body('logs')
      .isArray({ min: 1 })
      .withMessage('Logs must be a non-empty array'),
    
    body('logs.*.habitId')
      .isInt({ min: 1 })
      .withMessage('Each log must have a valid habitId'),
    
    body('logs.*.completed')
      .isBoolean()
      .withMessage('Each log must have a completed boolean'),
    
    body('logs.*.notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters')
  ],
  asyncHandler(habitController.bulkLogUpdate)
);

/************************************************************
 * GET /api/habits/calendar/:year/:month
 * Get calendar view for month
 ************************************************************/
router.get(
  '/calendar/:year/:month',
  [
    param('year')
      .isInt({ min: 2000, max: 2100 })
      .withMessage('Year must be between 2000 and 2100'),
    
    param('month')
      .isInt({ min: 1, max: 12 })
      .withMessage('Month must be between 1 and 12')
  ],
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Calendar endpoint implementation
    const userId = (req as any).user.id;
    const { year, month } = req.params;
    
    // Implementation would go here
    res.json({ year, month, userId });
  })
);

export default router;