/************************************************************
 * HabitLog Model (Extended)
 * Handles habit log operations with advanced analytics
 ************************************************************/
import { pool } from '../config/database';
import HabitModel from './Habit';

export interface HabitLog {
  id: number;
  habit_id: number;
  log_date: string;
  completed: boolean;
  notes?: string;
  created_at: Date;
}

export interface DailyCompletion {
  date: string;
  completed: boolean;
  streak: number;
}

export interface HabitCompletionStats {
  habit_id: number;
  total_days: number;
  completed_days: number;
  completion_rate: number;
  current_streak: number;
  longest_streak: number;
  last_completed: string | null;
}

class HabitLogModel {
  /************************************************************
   * Create or update habit log
   * Uses upsert to handle duplicate entries
   ************************************************************/
  static async createOrUpdate(
    habitId: number,
    logDate: string,
    completed: boolean,
    notes?: string
  ): Promise<HabitLog> {
    const [result] = await pool.execute(
      `INSERT INTO habit_logs (habit_id, log_date, completed, notes) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         completed = VALUES(completed),
         notes = VALUES(notes),
         created_at = CURRENT_TIMESTAMP`,
      [habitId, logDate, completed, notes || null]
    );
    
    // Get the updated/inserted record
    const [rows] = await pool.execute(
      `SELECT * FROM habit_logs 
       WHERE habit_id = ? AND log_date = ?`,
      [habitId, logDate]
    );
    
    return (rows as HabitLog[])[0];
  }

  /************************************************************
   * Get logs for a habit within date range
   ************************************************************/
  static async findByHabitAndDateRange(
    habitId: number,
    startDate: string,
    endDate: string
  ): Promise<HabitLog[]> {
    const [rows] = await pool.execute(
      `SELECT * FROM habit_logs 
       WHERE habit_id = ? 
         AND log_date BETWEEN ? AND ?
       ORDER BY log_date DESC`,
      [habitId, startDate, endDate]
    );
    
    return rows as HabitLog[];
  }

  /************************************************************
   * Get user's logs for a specific date
   ************************************************************/
  static async findByUserAndDate(
    userId: number,
    date: string
  ): Promise<Array<HabitLog & { habit_name: string }>> {
    const [rows] = await pool.execute(
      `SELECT hl.*, h.name as habit_name 
       FROM habit_logs hl
       JOIN habits h ON hl.habit_id = h.id
       WHERE h.user_id = ? 
         AND hl.log_date = ?
         AND h.is_active = TRUE
       ORDER BY h.created_at DESC`,
      [userId, date]
    );
    
    return rows as Array<HabitLog & { habit_name: string }>;
  }

  /************************************************************
   * Get completion calendar for a habit
   ************************************************************/
  static async getCompletionCalendar(
    habitId: number,
    year: number,
    month: number
  ): Promise<DailyCompletion[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
    
    const [rows] = await pool.execute(
      `SELECT 
        log_date,
        completed,
        CASE 
          WHEN completed THEN 1
          ELSE 0 
        END as streak_value
       FROM habit_logs 
       WHERE habit_id = ? 
         AND log_date BETWEEN ? AND ?
       ORDER BY log_date`,
      [habitId, startDate, endDate]
    );
    
    // Calculate running streak
    const logs = rows as DailyCompletion[];
    let currentStreak = 0;
    
    return logs.map(log => {
      if (log.completed) {
        currentStreak++;
      } else {
        currentStreak = 0;
      }
      return {
        ...log,
        streak: currentStreak
      };
    });
  }

  /************************************************************
   * Calculate habit completion statistics
   ************************************************************/
  static async getHabitStats(
    habitId: number,
    daysBack: number = 30
  ): Promise<HabitCompletionStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Get logs for the period
    const logs = await this.findByHabitAndDateRange(
      habitId,
      startDateStr,
      todayStr
    );
    
    // Calculate statistics
    const totalDays = logs.length;
    const completedDays = logs.filter(log => log.completed).length;
    const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    
    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastCompleted: string | null = null;
    
    // Sort logs by date (newest first for current streak)
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    );
    
    // Calculate current streak
    for (const log of sortedLogs) {
      if (log.completed) {
        if (currentStreak === 0) {
          // First completed log in the streak
          currentStreak = 1;
        } else {
          // Check if consecutive
          const prevDate = new Date(sortedLogs[sortedLogs.indexOf(log) - 1]?.log_date);
          const currentDate = new Date(log.log_date);
          const diffDays = Math.floor(
            (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      } else {
        break;
      }
    }
    
    // Calculate longest streak
    const chronologicalLogs = [...logs].sort((a, b) => 
      new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
    );
    
    for (const log of chronologicalLogs) {
      if (log.completed) {
        tempStreak++;
        lastCompleted = log.log_date;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }
    
    return {
      habit_id: habitId,
      total_days: totalDays,
      completed_days: completedDays,
      completion_rate: Math.round(completionRate * 100) / 100,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed: lastCompleted
    };
  }

  /************************************************************
   * Get best performing days of week
   ************************************************************/
  static async getBestDays(
    habitId: number
  ): Promise<Array<{ day_of_week: number; completion_rate: number }>> {
    const [rows] = await pool.execute(
      `SELECT 
        DAYOFWEEK(log_date) as day_of_week,
        COUNT(*) as total_logs,
        SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_logs,
        ROUND((SUM(CASE WHEN completed THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as completion_rate
       FROM habit_logs 
       WHERE habit_id = ?
       GROUP BY DAYOFWEEK(log_date)
       ORDER BY completion_rate DESC`,
      [habitId]
    );
    
    return rows as Array<{ day_of_week: number; completion_rate: number }>;
  }

  /************************************************************
   * Get monthly completion trend
   ************************************************************/
  static async getMonthlyTrend(
    habitId: number,
    months: number = 6
  ): Promise<Array<{ month: string; completion_rate: number }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startDateStr = startDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    
    const [rows] = await pool.execute(
      `SELECT 
        DATE_FORMAT(log_date, '%Y-%m') as month,
        COUNT(*) as total_logs,
        SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_logs,
        ROUND((SUM(CASE WHEN completed THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as completion_rate
       FROM habit_logs 
       WHERE habit_id = ? 
         AND log_date BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(log_date, '%Y-%m')
       ORDER BY month DESC`,
      [habitId, startDateStr, todayStr]
    );
    
    return rows as Array<{ month: string; completion_rate: number }>;
  }

  /************************************************************
   * Bulk insert logs (for data migration or bulk operations)
   ************************************************************/
  static async bulkInsert(logs: Array<{
    habit_id: number;
    log_date: string;
    completed: boolean;
    notes?: string;
  }>): Promise<number> {
    if (logs.length === 0) return 0;
    
    const values = logs.map(log => [
      log.habit_id,
      log.log_date,
      log.completed,
      log.notes || null
    ]);
    
    const placeholders = logs.map(() => '(?, ?, ?, ?)').join(', ');
    
    const [result] = await pool.execute(
      `INSERT INTO habit_logs (habit_id, log_date, completed, notes) 
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE 
         completed = VALUES(completed),
         notes = VALUES(notes)`,
      values.flat()
    );
    
    return (result as any).affectedRows;
  }

  /************************************************************
   * Get missing logs (days without entries)
   ************************************************************/
  static async getMissingLogs(
    habitId: number,
    startDate: string,
    endDate: string
  ): Promise<string[]> {
    const [rows] = await pool.execute(
      `WITH RECURSIVE dates(date) AS (
         SELECT ? as date
         UNION ALL
         SELECT DATE_ADD(date, INTERVAL 1 DAY)
         FROM dates
         WHERE date < ?
       )
       SELECT d.date as missing_date
       FROM dates d
       LEFT JOIN habit_logs hl ON d.date = hl.log_date AND hl.habit_id = ?
       WHERE hl.id IS NULL
       ORDER BY d.date`,
      [startDate, endDate, habitId]
    );
    
    return (rows as Array<{ missing_date: string }>)
      .map(row => row.missing_date);
  }
}

export default HabitLogModel;