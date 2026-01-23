/************************************************************
 * Habit Service
 * Business logic layer for habit operations
 * Handles complex operations, validation, and data transformation
 ************************************************************/
import HabitModel, { 
  CreateHabitDTO, 
  UpdateHabitDTO, 
  Habit,
  HabitLog 
} from '../models/Habit';
import HabitLogModel from '../models/HabitLog';
import { pool } from '../config/database';
import logger from '../utils/logger';
import streakService from './streakService';

interface HabitWithStats extends Habit {
  stats?: {
    current_streak: number;
    completion_rate: number;
    longest_streak: number;
    total_logs: number;
  };
  logs?: HabitLog[];
}

class HabitService {
  /************************************************************
   * Get all habits for user with optional statistics
   ************************************************************/
  async getUserHabits(
    userId: number,
    includeStats: boolean = true,
    timeframeDays: number = 30
  ): Promise<HabitWithStats[]> {
    try {
      // Get basic habits
      const habits = await HabitModel.findByUserId(userId);
      
      if (!includeStats) {
        return habits;
      }
      
      // Enhance with statistics
      const habitsWithStats = await Promise.all(
        habits.map(async (habit) => {
          const stats = await streakService.calculateHabitStats(
            habit.id,
            userId,
            timeframeDays
          );
          
          // Get recent logs
          const logs = await this.getHabitLogs(
            habit.id,
            userId,
            this.getDateNDaysAgo(timeframeDays),
            new Date().toISOString().split('T')[0],
            10
          );
          
          return {
            ...habit,
            stats,
            logs
          };
        })
      );
      
      return habitsWithStats;
      
    } catch (error) {
      logger.error('Get user habits error:', error);
      throw error;
    }
  }

  /************************************************************
   * Get single habit by ID with validation
   ************************************************************/
  async getHabitById(
    habitId: number,
    userId: number
  ): Promise<HabitWithStats | null> {
    try {
      const habit = await HabitModel.findById(habitId, userId);
      
      if (!habit) {
        return null;
      }
      
      // Get detailed statistics
      const stats = await streakService.calculateHabitStats(habitId, userId);
      
      // Get recent logs
      const logs = await this.getHabitLogs(
        habitId,
        userId,
        this.getDateNDaysAgo(30),
        new Date().toISOString().split('T')[0],
        20
      );
      
      return {
        ...habit,
        stats,
        logs
      };
      
    } catch (error) {
      logger.error('Get habit by ID error:', error);
      throw error;
    }
  }

  /************************************************************
   * Create new habit with validation
   ************************************************************/
  async createHabit(
    userId: number,
    habitData: CreateHabitDTO
  ): Promise<Habit> {
    try {
      // Validate habit data
      await this.validateHabitData(habitData);
      
      // Create habit
      const habit = await HabitModel.create({
        ...habitData,
        user_id: userId
      });
      
      logger.info('Habit created', { 
        userId, 
        habitId: habit.id,
        habitName: habit.name 
      });
      
      return habit;
      
    } catch (error) {
      logger.error('Create habit error:', error);
      throw error;
    }
  }

  /************************************************************
   * Update existing habit
   ************************************************************/
  async updateHabit(
    habitId: number,
    userId: number,
    updates: UpdateHabitDTO
  ): Promise<Habit | null> {
    try {
      // Verify habit exists and belongs to user
      const existingHabit = await HabitModel.findById(habitId, userId);
      if (!existingHabit) {
        return null;
      }
      
      // Validate updates if frequency is changing
      if (updates.frequency && updates.frequency !== existingHabit.frequency) {
        await this.validateFrequencyChange(existingHabit, updates);
      }
      
      // Apply updates
      const updated = await HabitModel.update(habitId, userId, updates);
      if (!updated) {
        throw new Error('Failed to update habit');
      }
      
      // Get updated habit
      const habit = await HabitModel.findById(habitId, userId);
      
      logger.info('Habit updated', { 
        userId, 
        habitId,
        updates: Object.keys(updates) 
      });
      
      return habit;
      
    } catch (error) {
      logger.error('Update habit error:', error);
      throw error;
    }
  }

  /************************************************************
   * Delete habit (soft delete)
   ************************************************************/
  async deleteHabit(
    habitId: number,
    userId: number
  ): Promise<boolean> {
    try {
      const deleted = await HabitModel.delete(habitId, userId);
      
      if (deleted) {
        logger.info('Habit deleted', { userId, habitId });
      }
      
      return deleted;
      
    } catch (error) {
      logger.error('Delete habit error:', error);
      throw error;
    }
  }

  /************************************************************
   * Log habit completion
   ************************************************************/
  async logCompletion(
    habitId: number,
    userId: number,
    date: string,
    completed: boolean,
    notes?: string
  ): Promise<HabitLog> {
    try {
      // Validate date
      this.validateLogDate(date);
      
      // Log completion
      const habitLog = await HabitModel.logCompletion(
        habitId,
        userId,
        date,
        completed,
        notes
      );
      
      logger.info('Habit logged', { 
        userId, 
        habitId, 
        date, 
        completed,
        hasNotes: !!notes 
      });
      
      return habitLog;
      
    } catch (error) {
      logger.error('Log completion error:', error);
      throw error;
    }
  }

  /************************************************************
   * Get habit logs with pagination
   ************************************************************/
  async getHabitLogs(
    habitId: number,
    userId: number,
    startDate: string,
    endDate: string,
    limit?: number
  ): Promise<HabitLog[]> {
    try {
      // Verify habit belongs to user
      const habit = await HabitModel.findById(habitId, userId);
      if (!habit) {
        throw new Error('Habit not found or access denied');
      }
      
      // Get logs
      const logs = await HabitModel.getLogs(
        habitId,
        userId,
        startDate,
        endDate
      );
      
      // Apply limit if specified
      if (limit && limit > 0) {
        return logs.slice(0, limit);
      }
      
      return logs;
      
    } catch (error) {
      logger.error('Get habit logs error:', error);
      throw error;
    }
  }

  /************************************************************
   * Get recent logs across all habits
   ************************************************************/
  async getRecentLogs(
    userId: number,
    limit: number = 10
  ): Promise<Array<HabitLog & { habit_name: string }>> {
    try {
      const [rows] = await pool.execute(
        `SELECT 
          hl.*,
          h.name as habit_name
         FROM habit_logs hl
         JOIN habits h ON hl.habit_id = h.id
         WHERE h.user_id = ? 
           AND h.is_active = TRUE
         ORDER BY hl.log_date DESC, hl.created_at DESC
         LIMIT ?`,
        [userId, limit]
      );
      
      return rows as Array<HabitLog & { habit_name: string }>;
      
    } catch (error) {
      logger.error('Get recent logs error:', error);
      throw error;
    }
  }

  /************************************************************
   * Bulk log update for multiple habits
   ************************************************************/
  async bulkLogUpdate(
    userId: number,
    date: string,
    logs: Array<{
      habitId: number;
      completed: boolean;
      notes?: string;
    }>
  ): Promise<Array<{ habitId: number; success: boolean; error?: string }>> {
    try {
      const results = await Promise.all(
        logs.map(async (log) => {
          try {
            await this.logCompletion(
              log.habitId,
              userId,
              date,
              log.completed,
              log.notes
            );
            return { habitId: log.habitId, success: true };
          } catch (error: any) {
            return { 
              habitId: log.habitId, 
              success: false, 
              error: error.message 
            };
          }
        })
      );
      
      logger.info('Bulk log update completed', { 
        userId, 
        date, 
        total: logs.length,
        successful: results.filter(r => r.success).length 
      });
      
      return results;
      
    } catch (error) {
      logger.error('Bulk log update error:', error);
      throw error;
    }
  }

  /************************************************************
   * Get today's habits with completion status
   ************************************************************/
  async getTodaysHabits(userId: number): Promise<
    Array<{
      habit: Habit;
      todayLog?: HabitLog;
      canLogToday: boolean;
    }>
  > {
    try {
      const today = new Date().toISOString().split('T')[0];
      const habits = await HabitModel.findByUserId(userId);
      
      const habitsWithStatus = await Promise.all(
        habits.map(async (habit) => {
          // Check if habit should be logged today
          const canLogToday = this.canLogHabitToday(habit);
          
          // Get today's log if exists
          const logs = await HabitModel.getLogs(
            habit.id,
            userId,
            today,
            today
          );
          
          return {
            habit,
            todayLog: logs[0],
            canLogToday
          };
        })
      );
      
      return habitsWithStatus;
      
    } catch (error) {
      logger.error('Get today\'s habits error:', error);
      throw error;
    }
  }

  /************************************************************
   * Validate habit data
   ************************************************************/
  private async validateHabitData(data: CreateHabitDTO): Promise<void> {
    const { name, frequency, target_days } = data;
    
    // Name validation
    if (!name || name.trim().length === 0) {
      throw new Error('Habit name is required');
    }
    
    if (name.length > 200) {
      throw new Error('Habit name must be less than 200 characters');
    }
    
    // Frequency validation
    if (!['daily', 'weekly'].includes(frequency)) {
      throw new Error('Frequency must be daily or weekly');
    }
    
    // Target days validation for weekly habits
    if (frequency === 'weekly') {
      if (!target_days || !Array.isArray(target_days) || target_days.length === 0) {
        throw new Error('Weekly habits require at least one target day');
      }
      
      if (target_days.some(day => day < 1 || day > 7)) {
        throw new Error('Target days must be numbers 1-7 (Monday-Sunday)');
      }
    }
  }

  /************************************************************
   * Validate frequency change
   ************************************************************/
  private async validateFrequencyChange(
    existingHabit: Habit,
    updates: UpdateHabitDTO
  ): Promise<void> {
    // Additional validation when changing frequency
    // For example, check if there are existing logs that would become invalid
    
    if (updates.frequency === 'weekly' && !updates.target_days) {
      throw new Error('Weekly habits require target_days');
    }
  }

  /************************************************************
   * Validate log date
   ************************************************************/
  private validateLogDate(date: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    
    const logDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (logDate > today) {
      throw new Error('Cannot log habits for future dates');
    }
  }

  /************************************************************
   * Check if habit can be logged today
   ************************************************************/
  private canLogHabitToday(habit: Habit): boolean {
    if (!habit.is_active) {
      return false;
    }
    
    if (habit.frequency === 'daily') {
      return true;
    }
    
    if (habit.frequency === 'weekly' && habit.target_days) {
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      // Convert to 1-7 where Monday = 1
      const adjustedDay = today === 0 ? 7 : today;
      return habit.target_days.includes(adjustedDay);
    }
    
    return false;
  }

  /************************************************************
   * Get date N days ago
   ************************************************************/
  private getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /************************************************************
   * Get habit suggestions based on existing habits
   ************************************************************/
  async getHabitSuggestions(userId: number): Promise<string[]> {
    try {
      const habits = await HabitModel.findByUserId(userId);
      const habitNames = habits.map(h => h.name.toLowerCase());
      
      // Common habit suggestions
      const commonHabits = [
        'Meditate for 10 minutes',
        'Read 20 pages',
        'Exercise for 30 minutes',
        'Drink 8 glasses of water',
        'Write in journal',
        'Learn something new',
        'Practice gratitude',
        'No screens before bed',
        'Wake up early',
        'Plan next day'
      ];
      
      // Filter out habits user already has
      return commonHabits.filter(habit => 
        !habitNames.some(name => 
          habit.toLowerCase().includes(name) || name.includes(habit.toLowerCase())
        )
      );
      
    } catch (error) {
      logger.error('Get habit suggestions error:', error);
      return [];
    }
  }
}

export default new HabitService();