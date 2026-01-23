/************************************************************
 * Streak Service
 * Handles streak calculations and habit statistics
 * Optimized for performance with complex streak logic
 ************************************************************/
import HabitModel from '../models/Habit';
import HabitLogModel from '../models/HabitLog';
import { pool } from '../config/database';
import logger from '../utils/logger';

interface HabitStats {
  habit_id: number;
  current_streak: number;
  longest_streak: number;
  completion_rate: number;
  total_logs: number;
  completed_logs: number;
  last_completed_date: string | null;
  best_day_of_week?: number;
  consistency_score: number;
}

interface UserStats {
  overall_completion_rate: number;
  total_active_habits: number;
  total_completed_logs: number;
  current_streak: number;
  best_streak: number;
  average_streak: number;
  habits_by_completion: Array<{
    habit_id: number;
    name: string;
    completion_rate: number;
    current_streak: number;
  }>;
}

class StreakService {
  /************************************************************
   * Calculate detailed statistics for a habit
   ************************************************************/
  async calculateHabitStats(
    habitId: number,
    userId: number,
    timeframeDays: number = 30
  ): Promise<HabitStats> {
    try {
      // Verify habit belongs to user
      const habit = await HabitModel.findById(habitId, userId);
      if (!habit) {
        throw new Error('Habit not found or access denied');
      }
      
      const startDate = this.getDateNDaysAgo(timeframeDays);
      const today = new Date().toISOString().split('T')[0];
      
      // Get logs for the timeframe
      const logs = await HabitLogModel.findByHabitAndDateRange(
        habitId,
        startDate,
        today
      );
      
      // Calculate basic statistics
      const totalLogs = logs.length;
      const completedLogs = logs.filter(log => log.completed).length;
      const completionRate = totalLogs > 0 ? 
        (completedLogs / totalLogs) * 100 : 0;
      
      // Calculate streaks
      const { currentStreak, longestStreak, lastCompletedDate } = 
        this.calculateStreaks(logs);
      
      // Calculate best day of week
      const bestDay = await this.calculateBestDayOfWeek(habitId);
      
      // Calculate consistency score (0-100)
      const consistencyScore = this.calculateConsistencyScore(
        logs,
        habit.frequency,
        habit.target_days
      );
      
      return {
        habit_id: habitId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        completion_rate: Math.round(completionRate * 100) / 100,
        total_logs: totalLogs,
        completed_logs: completedLogs,
        last_completed_date: lastCompletedDate,
        best_day_of_week: bestDay,
        consistency_score: consistencyScore
      };
      
    } catch (error) {
      logger.error('Calculate habit stats error:', error);
      throw error;
    }
  }

  /************************************************************
   * Get comprehensive user statistics for dashboard
   ************************************************************/
  async getUserStats(userId: number): Promise<UserStats> {
    try {
      const habits = await HabitModel.findByUserId(userId);
      
      if (habits.length === 0) {
        return {
          overall_completion_rate: 0,
          total_active_habits: 0,
          total_completed_logs: 0,
          current_streak: 0,
          best_streak: 0,
          average_streak: 0,
          habits_by_completion: []
        };
      }
      
      // Calculate stats for each habit
      const habitStatsPromises = habits.map(async (habit) => {
        const stats = await this.calculateHabitStats(habit.id, userId);
        return {
          habit_id: habit.id,
          name: habit.name,
          completion_rate: stats.completion_rate,
          current_streak: stats.current_streak
        };
      });
      
      const habitsByCompletion = await Promise.all(habitStatsPromises);
      
      // Calculate overall statistics
      const overallCompletionRate = habitsByCompletion.length > 0 ?
        habitsByCompletion.reduce((sum, habit) => sum + habit.completion_rate, 0) / 
        habitsByCompletion.length : 0;
      
      const streaks = habitsByCompletion.map(h => h.current_streak);
      const currentStreak = Math.max(...streaks, 0);
      const bestStreak = Math.max(...streaks, 0);
      const averageStreak = streaks.length > 0 ?
        streaks.reduce((sum, streak) => sum + streak, 0) / streaks.length : 0;
      
      // Get total completed logs
      const [totalResult] = await pool.execute(
        `SELECT COUNT(*) as total_completed
         FROM habit_logs hl
         JOIN habits h ON hl.habit_id = h.id
         WHERE h.user_id = ? 
           AND h.is_active = TRUE
           AND hl.completed = TRUE`,
        [userId]
      );
      
      const totalCompletedLogs = (totalResult as any[])[0]?.total_completed || 0;
      
      return {
        overall_completion_rate: Math.round(overallCompletionRate * 100) / 100,
        total_active_habits: habits.length,
        total_completed_logs: totalCompletedLogs,
        current_streak: currentStreak,
        best_streak: bestStreak,
        average_streak: Math.round(averageStreak * 100) / 100,
        habits_by_completion: habitsByCompletion.sort(
          (a, b) => b.completion_rate - a.completion_rate
        )
      };
      
    } catch (error) {
      logger.error('Get user stats error:', error);
      throw error;
    }
  }

  /************************************************************
   * Calculate streak history for chart visualization
   ************************************************************/
  async getStreakHistory(
    userId: number,
    days: number = 30
  ): Promise<Array<{ date: string; streak: number }>> {
    try {
      const startDate = this.getDateNDaysAgo(days);
      const today = new Date().toISOString().split('T')[0];
      
      const [rows] = await pool.execute(
        `WITH RECURSIVE dates(date) AS (
           SELECT ? as date
           UNION ALL
           SELECT DATE_ADD(date, INTERVAL 1 DAY)
           FROM dates
           WHERE date < ?
         )
         SELECT 
           d.date,
           COALESCE((
             SELECT COUNT(DISTINCT h.id)
             FROM habits h
             LEFT JOIN habit_logs hl ON h.id = hl.habit_id 
               AND hl.log_date <= d.date
             WHERE h.user_id = ? 
               AND h.is_active = TRUE
               AND (
                 SELECT hl2.completed
                 FROM habit_logs hl2
                 WHERE hl2.habit_id = h.id
                   AND hl2.log_date = d.date
                 LIMIT 1
               ) = TRUE
           ), 0) as streak
         FROM dates d
         ORDER BY d.date`,
        [startDate, today, userId]
      );
      
      return (rows as Array<{ date: string; streak: number }>);
      
    } catch (error) {
      logger.error('Get streak history error:', error);
      throw error;
    }
  }

  /************************************************************
   * Calculate streaks from logs
   ************************************************************/
  private calculateStreaks(logs: any[]): {
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate: string | null;
  } {
    if (logs.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
    }
    
    // Sort logs by date descending (newest first)
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    );
    
    let currentStreak = 0;
    let tempStreak = 0;
    let longestStreak = 0;
    let lastCompletedDate: string | null = null;
    let prevDate: Date | null = null;
    
    for (const log of sortedLogs) {
      const logDate = new Date(log.log_date);
      
      if (log.completed) {
        if (currentStreak === 0) {
          // Start of current streak
          currentStreak = 1;
          lastCompletedDate = log.log_date;
        } else if (prevDate) {
          // Check if consecutive
          const dayDiff = Math.floor(
            (prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (dayDiff === 1) {
            currentStreak++;
          } else {
            break; // Streak broken
          }
        }
        
        // Track for longest streak calculation
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        // Reset temp streak on missed day
        tempStreak = 0;
      }
      
      prevDate = logDate;
    }
    
    return { currentStreak, longestStreak, lastCompletedDate };
  }

  /************************************************************
   * Calculate best day of week for a habit
   ************************************************************/
  private async calculateBestDayOfWeek(habitId: number): Promise<number | undefined> {
    try {
      const [rows] = await pool.execute(
        `SELECT 
          DAYOFWEEK(log_date) as day_of_week,
          COUNT(*) as total,
          SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed,
          ROUND(
            (SUM(CASE WHEN completed THEN 1 ELSE 0 END) / COUNT(*)) * 100, 
            2
          ) as completion_rate
         FROM habit_logs 
         WHERE habit_id = ?
         GROUP BY DAYOFWEEK(log_date)
         HAVING total >= 5  -- Minimum sample size
         ORDER BY completion_rate DESC
         LIMIT 1`,
        [habitId]
      );
      
      const result = (rows as any[])[0];
      return result?.day_of_week;
      
    } catch (error) {
      logger.error('Calculate best day of week error:', error);
      return undefined;
    }
  }

  /************************************************************
   * Calculate consistency score (0-100)
   * Factors in adherence to schedule, streaks, and completion rate
   ************************************************************/
  private calculateConsistencyScore(
    logs: any[],
    frequency: string,
    targetDays?: number[]
  ): number {
    if (logs.length === 0) return 0;
    
    const totalDays = logs.length;
    const completedDays = logs.filter(log => log.completed).length;
    
    // Base score from completion rate (50% weight)
    const completionScore = (completedDays / totalDays) * 50;
    
    // Streak score (30% weight)
    const { currentStreak, longestStreak } = this.calculateStreaks(logs);
    const streakScore = Math.min(
      (currentStreak / Math.max(longestStreak, 1)) * 30,
      30
    );
    
    // Schedule adherence score (20% weight)
    let scheduleScore = 0;
    if (frequency === 'weekly' && targetDays) {
      const expectedDays = this.calculateExpectedDays(logs, targetDays);
      scheduleScore = Math.min((completedDays / expectedDays) * 20, 20);
    } else if (frequency === 'daily') {
      // Daily habits get full schedule score if completed any day
      scheduleScore = completedDays > 0 ? 20 : 0;
    }
    
    return Math.round(completionScore + streakScore + scheduleScore);
  }

  /************************************************************
   * Calculate expected number of completion days
   ************************************************************/
  private calculateExpectedDays(logs: any[], targetDays: number[]): number {
    const uniqueDays = new Set(
      logs.map(log => new Date(log.log_date).getDay())
    );
    
    // Count how many unique logged days match target days
    return Array.from(uniqueDays).filter(day => 
      targetDays.includes(day === 0 ? 7 : day)  // Convert Sunday from 0 to 7
    ).length;
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
   * Predict next streak milestone
   ************************************************************/
  async predictNextMilestone(
    habitId: number,
    userId: number
  ): Promise<{
    nextMilestone: number;
    daysToReach: number;
    confidence: number;
  }> {
    try {
      const stats = await this.calculateHabitStats(habitId, userId, 90);
      
      // Common streak milestones
      const milestones = [3, 7, 14, 21, 30, 60, 90, 100];
      const nextMilestone = milestones.find(m => m > stats.current_streak) || 
        stats.current_streak + 7;
      
      // Calculate estimated days to reach based on completion rate
      const completionRate = stats.completion_rate / 100;
      const daysToReach = completionRate > 0 ? 
        Math.ceil((nextMilestone - stats.current_streak) / completionRate) : 
        99; // Arbitrary high number
      
      // Confidence based on recent consistency
      const confidence = Math.min(
        Math.round(completionRate * 100),
        95
      );
      
      return {
        nextMilestone,
        daysToReach,
        confidence
      };
      
    } catch (error) {
      logger.error('Predict next milestone error:', error);
      return {
        nextMilestone: 0,
        daysToReach: 0,
        confidence: 0
      };
    }
  }

  /************************************************************
   * Get streak comparison with similar users
   ************************************************************/
  async getStreakComparison(
    userId: number,
    habitId: number
  ): Promise<{
    userStreak: number;
    averageStreak: number;
    percentile: number;
    topHabit: string;
  }> {
    try {
      // This would typically query aggregate data from all users
      // Simplified implementation for now
      
      const stats = await this.calculateHabitStats(habitId, userId);
      
      // Mock data - in production, this would come from analytics database
      const averageStreak = 7; // Placeholder
      const percentile = Math.min(Math.round((stats.current_streak / 30) * 100), 99);
      
      return {
        userStreak: stats.current_streak,
        averageStreak,
        percentile,
        topHabit: 'Meditation' // Placeholder
      };
      
    } catch (error) {
      logger.error('Get streak comparison error:', error);
      throw error;
    }
  }
}

export default new StreakService();