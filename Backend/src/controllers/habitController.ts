/************************************************************
 * Habit Controller
 * Handles CRUD operations for habits and habit logging
 * Includes streak calculations and completion tracking
 ************************************************************/
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import habitService from '../services/habitService';
import streakService from '../services/streakService';
import { sendResponse } from '../utils/responseHandler';
import logger from '../utils/logger';

class HabitController {
  /************************************************************
   * Get All Habits for User
   * Returns habits with statistics and recent logs
   ************************************************************/
  async getHabits(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { includeStats = 'true', timeframe = '30' } = req.query;

      const habits = await habitService.getUserHabits(
        userId,
        includeStats === 'true',
        parseInt(timeframe as string)
      );

      sendResponse(res, 200, {
        success: true,
        data: { habits }
      });

    } catch (error) {
      logger.error('Get habits error:', error);
      next(error);
    }
  }

  /************************************************************
   * Get Single Habit
   * Returns detailed habit information with logs
   ************************************************************/
  async getHabit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const habit = await habitService.getHabitById(
        parseInt(id),
        userId
      );

      if (!habit) {
        return sendResponse(res, 404, {
          success: false,
          error: 'Habit not found'
        });
      }

      // Get recent logs for this habit
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const defaultStartDateStr = defaultStartDate.toISOString().split('T')[0];

      const logs = await habitService.getHabitLogs(
        parseInt(id),
        userId,
        defaultStartDateStr,
        defaultEndDate,
        30
      );

      // Calculate detailed statistics
      const stats = await streakService.calculateHabitStats(
        parseInt(id),
        userId
      );

      sendResponse(res, 200, {
        success: true,
        data: {
          habit: {
            ...habit,
            logs,
            stats
          }
        }
      });

    } catch (error) {
      logger.error('Get habit error:', error);
      next(error);
    }
  }

  /************************************************************
   * Create New Habit
   * Creates habit with validation and default values
   ************************************************************/
  async createHabit(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = (req as any).user.id;
      const habitData = req.body;

      // Set default color if not provided
      if (!habitData.color) {
        const colors = [
          '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
          '#EC4899', '#14B8A6', '#F97316', '#6366F1'
        ];
        habitData.color = colors[Math.floor(Math.random() * colors.length)];
      }

      const habit = await habitService.createHabit(userId, habitData);

      logger.info(`Habit created: ${habit.name}`, {
        userId,
        habitId: habit.id
      });

      sendResponse(res, 201, {
        success: true,
        data: {
          habit,
          message: 'Habit created successfully'
        }
      });

    } catch (error) {
      logger.error('Create habit error:', error);
      next(error);
    }
  }

  /************************************************************
   * Update Habit
   * Updates habit details with partial update support
   ************************************************************/
  async updateHabit(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = (req as any).user.id;
      const { id } = req.params;
      const updates = req.body;

      const habit = await habitService.updateHabit(
        parseInt(id),
        userId,
        updates
      );

      if (!habit) {
        return sendResponse(res, 404, {
          success: false,
          error: 'Habit not found'
        });
      }

      logger.info(`Habit updated: ${habit.name}`, {
        userId,
        habitId: habit.id
      });

      sendResponse(res, 200, {
        success: true,
        data: {
          habit,
          message: 'Habit updated successfully'
        }
      });

    } catch (error) {
      logger.error('Update habit error:', error);
      next(error);
    }
  }

  /************************************************************
   * Delete Habit (Soft Delete)
   * Sets is_active to false instead of hard deletion
   ************************************************************/
  async deleteHabit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const deleted = await habitService.deleteHabit(
        parseInt(id),
        userId
      );

      if (!deleted) {
        return sendResponse(res, 404, {
          success: false,
          error: 'Habit not found'
        });
      }

      logger.info(`Habit deleted: ${id}`, { userId });

      sendResponse(res, 200, {
        success: true,
        data: {
          message: 'Habit deleted successfully'
        }
      });

    } catch (error) {
      logger.error('Delete habit error:', error);
      next(error);
    }
  }

  /************************************************************
   * Log Habit Completion
   * Records completion status for a specific date
   ************************************************************/
  async logHabit(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = (req as any).user.id;
      const { id } = req.params;
      const { date, completed, notes } = req.body;

      // Validate date format
      const logDate = date || new Date().toISOString().split('T')[0];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(logDate)) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      // Check if date is not in the future
      const today = new Date().toISOString().split('T')[0];
      if (logDate > today) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Cannot log habits for future dates'
        });
      }

      const habitLog = await habitService.logCompletion(
        parseInt(id),
        userId,
        logDate,
        completed,
        notes
      );

      // Calculate updated streak
      const stats = await streakService.calculateHabitStats(
        parseInt(id),
        userId
      );

      logger.info(`Habit logged: ${id} - ${completed ? 'Completed' : 'Missed'}`, {
        userId,
        habitId: id,
        date: logDate
      });

      sendResponse(res, 200, {
        success: true,
        data: {
          log: habitLog,
          stats,
          message: `Habit ${completed ? 'marked as completed' : 'marked as incomplete'}`
        }
      });

    } catch (error) {
      logger.error('Log habit error:', error);
      next(error);
    }
  }

  /************************************************************
   * Get Habit Logs
   * Returns logs for a habit within a date range
   ************************************************************/
  async getHabitLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { startDate, endDate, limit = '100' } = req.query;

      // Default to last 30 days if no dates provided
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const defaultStartDateStr = defaultStartDate.toISOString().split('T')[0];

      const logs = await habitService.getHabitLogs(
        parseInt(id),
        userId,
        (startDate as string) || defaultStartDateStr,
        (endDate as string) || defaultEndDate,
        parseInt(limit as string)
      );

      sendResponse(res, 200, {
        success: true,
        data: { logs }
      });

    } catch (error) {
      logger.error('Get habit logs error:', error);
      next(error);
    }
  }

  /************************************************************
   * Get Dashboard Statistics
   * Returns comprehensive statistics for dashboard view
   ************************************************************/
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const stats = await streakService.getUserStats(userId);
      const recentLogs = await habitService.getRecentLogs(userId, 10);
      const streakHistory = await streakService.getStreakHistory(userId, 30);

      sendResponse(res, 200, {
        success: true,
        data: {
          stats,
          recentLogs,
          streakHistory,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      next(error);
    }
  }

  /************************************************************
   * Bulk Log Update
   * Updates multiple habits for a specific date
   ************************************************************/
  async bulkLogUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = (req as any).user.id;
      const { date, logs } = req.body;

      // Validate date
      const logDate = date || new Date().toISOString().split('T')[0];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(logDate)) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const results = await habitService.bulkLogUpdate(
        userId,
        logDate,
        logs
      );

      sendResponse(res, 200, {
        success: true,
        data: {
          results,
          message: 'Bulk update completed'
        }
      });

    } catch (error) {
      logger.error('Bulk log update error:', error);
      next(error);
    }
  }
}

export default new HabitController();