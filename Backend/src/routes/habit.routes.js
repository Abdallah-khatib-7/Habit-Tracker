import express from 'express';
import HabitController from '../controllers/habit.controller.js';
import AuthMiddleware from '../middleware/auth.middleware.js';
import HabitValidationMiddleware from '../middleware/habitValidation.middleware.js';

const router = express.Router();

// Apply JWT authentication to all habit routes
router.use(AuthMiddleware.verifyToken);

/**
 * @route   POST /api/habits
 * @desc    Create a new habit
 * @access  Private
 */
router.post(
  '/',
  HabitValidationMiddleware.validateCreateHabit,
  HabitController.createHabit
);

/**
 * @route   GET /api/habits
 * @desc    Get all habits for the authenticated user
 * @access  Private
 */
router.get(
  '/',
  HabitController.getHabits
);

/**
 * @route   PUT /api/habits/:id
 * @desc    Update a habit's name
 * @access  Private
 */
router.put(
  '/:id',
  HabitValidationMiddleware.validateUpdateHabit,
  HabitController.updateHabit
);

/**
 * @route   DELETE /api/habits/:id
 * @desc    Delete a habit and all its logs
 * @access  Private
 */
router.delete(
  '/:id',
  HabitValidationMiddleware.validateHabitId,
  HabitController.deleteHabit
);

/**
 * @route   POST /api/habits/:id/log
 * @desc    Log habit completion for a specific date
 * @access  Private
 */
router.post(
  '/:id/log',
  HabitValidationMiddleware.validateLogHabit,
  HabitController.logHabit
);

/**
 * @route   GET /api/habits/:id/logs
 * @desc    Get all logs for a specific habit with optional filtering
 * @access  Private
 */
router.get(
  '/:id/logs',
  HabitValidationMiddleware.validateGetLogs,
  HabitController.getHabitLogs
);

/**
 * @route   GET /api/habits/stats
 * @desc    Get habit statistics and analytics
 * @access  Private
 */
router.get(
  '/stats',
  HabitController.getHabitStats
);

export default router;