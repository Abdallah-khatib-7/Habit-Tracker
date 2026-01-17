import { HabitModel, NotFoundError, UnauthorizedError } from '../models/habit.model.js';

/**
 * Habit Controller - Business logic layer for habit operations
 */
class HabitController {
  /**
   * Create a new habit
   */
  static async createHabit(req, res) {
    try {
      const userId = req.userId;
      const { name } = req.body;

      // Create habit in database
      const habit = await HabitModel.createHabit(userId, name);

      return res.status(201).json({
        success: true,
        message: 'Habit created successfully.',
        data: { habit }
      });
    } catch (error) {
      console.error('Error in createHabit:', error);

      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Failed to create habit. Please try again later.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
      });
    }
  }

  /**
   * Get all habits for the authenticated user
   */
  static async getHabits(req, res) {
    try {
      const userId = req.userId;

      const habits = await HabitModel.getUserHabits(userId);

      return res.status(200).json({
        success: true,
        data: { habits }
      });
    } catch (error) {
      console.error('Error in getHabits:', error);

      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve habits. Please try again later.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
      });
    }
  }

  /**
   * Update a habit's name
   */
  static async updateHabit(req, res) {
    try {
      const userId = req.userId;
      const { habitId, name } = req.body;

      // Update habit in database
      const habit = await HabitModel.updateHabit(habitId, userId, name);

      return res.status(200).json({
        success: true,
        message: 'Habit updated successfully.',
        data: { habit }
      });
    } catch (error) {
      console.error('Error in updateHabit:', error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error instanceof UnauthorizedError) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Failed to update habit. Please try again later.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
      });
    }
  }

  /**
   * Delete a habit and all its logs
   */
  static async deleteHabit(req, res) {
    try {
      const userId = req.userId;
      const { habitId } = req.body;

      // Delete habit from database
      const deleted = await HabitModel.deleteHabit(habitId, userId);

      return res.status(200).json({
        success: true,
        message: 'Habit deleted successfully.',
        data: { deleted }
      });
    } catch (error) {
      console.error('Error in deleteHabit:', error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete habit. Please try again later.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
      });
    }
  }

  /**
   * Log habit completion for a specific date
   */
  static async logHabit(req, res) {
    try {
      const userId = req.userId;
      const { habitId, date, status } = req.body;

      // First verify user owns the habit
      await HabitModel.getHabitById(habitId, userId);

      // Log the habit
      const log = await HabitModel.logHabit(habitId, date, status);

      return res.status(201).json({
        success: true,
        message: 'Habit logged successfully.',
        data: { log }
      });
    } catch (error) {
      console.error('Error in logHabit:', error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.code === 'INVALID_DATE') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Failed to log habit. Please try again later.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
      });
    }
  }

  /**
   * Get logs for a specific habit with optional filtering
   */
  static async getHabitLogs(req, res) {
    try {
      const userId = req.userId;
      const { habitId, options } = req.body;

      // First verify user owns the habit
      await HabitModel.getHabitById(habitId, userId);

      // Get logs from database
      const logs = await HabitModel.getHabitLogs(habitId, options);

      // Get streak data
      const streak = await HabitModel.getHabitStreak(habitId);

      return res.status(200).json({
        success: true,
        data: {
          habitId,
          logs,
          streak,
          total: logs.length
        }
      });
    } catch (error) {
      console.error('Error in getHabitLogs:', error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve habit logs. Please try again later.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
      });
    }
  }

  /**
   * Get habit statistics and analytics
   */
  static async getHabitStats(req, res) {
    try {
      const userId = req.userId;
      const habits = await HabitModel.getUserHabits(userId);

      // Calculate statistics
      const stats = {
        totalHabits: habits.length,
        totalCompleted: habits.reduce((sum, habit) => sum + (habit.completed_logs || 0), 0),
        totalLogs: habits.reduce((sum, habit) => sum + (habit.total_logs || 0), 0),
        habitsWithLogs: habits.filter(h => h.total_logs > 0).length,
        averageCompletionRate: habits.length > 0 
          ? habits.reduce((sum, habit) => {
              const rate = habit.total_logs > 0 
                ? (habit.completed_logs / habit.total_logs) * 100 
                : 0;
              return sum + rate;
            }, 0) / habits.length
          : 0
      };

      return res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Error in getHabitStats:', error);

      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve habit statistics. Please try again later.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
      });
    }
  }
}

export default HabitController;