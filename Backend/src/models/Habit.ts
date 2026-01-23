/************************************************************
 * Habit Model
 * Handles CRUD operations for habits and habit logs
 ************************************************************/
import { pool } from '../config/database';

export interface Habit {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  target_days?: number[];
  color: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  log_date: string;
  completed: boolean;
  notes?: string;
  created_at: Date;
}

export interface CreateHabitDTO {
  user_id: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  target_days?: number[];
  color?: string;
}

export interface UpdateHabitDTO {
  name?: string;
  description?: string;
  frequency?: 'daily' | 'weekly';
  target_days?: number[];
  color?: string;
  is_active?: boolean;
}

class HabitModel {
  /************************************************************
   * Create a new habit for a user
   ************************************************************/
  static async create(habitData: CreateHabitDTO): Promise<Habit> {
    const { user_id, name, description, frequency, target_days, color } = habitData;
    
    const [result] = await pool.execute(
      `INSERT INTO habits 
       (user_id, name, description, frequency, target_days, color) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id, 
        name, 
        description || null,
        frequency,
        target_days ? JSON.stringify(target_days) : null,
        color || '#3B82F6'
      ]
    );
    
    const [rows] = await pool.execute(
      'SELECT * FROM habits WHERE id = ?',
      [(result as any).insertId]
    );
    
    return (rows as Habit[])[0];
  }

  /************************************************************
   * Get all habits for a user with completion statistics
   ************************************************************/
  static async findByUserId(userId: number): Promise<any[]> {
    const [rows] = await pool.execute(
      `SELECT 
        h.*,
        COUNT(hl.id) as total_logs,
        SUM(CASE WHEN hl.completed THEN 1 ELSE 0 END) as completed_count,
        MAX(hl.log_date) as last_log_date
       FROM habits h
       LEFT JOIN habit_logs hl ON h.id = hl.habit_id
       WHERE h.user_id = ? AND h.is_active = TRUE
       GROUP BY h.id
       ORDER BY h.created_at DESC`,
      [userId]
    );
    
    return rows as any[];
  }

  /************************************************************
   * Get single habit by ID with user validation
   ************************************************************/
  static async findById(id: number, userId: number): Promise<Habit | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM habits WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    return (rows as Habit[])[0] || null;
  }

  /************************************************************
   * Update habit details
   ************************************************************/
  static async update(
    id: number, 
    userId: number, 
    updates: UpdateHabitDTO
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'target_days' && value ? JSON.stringify(value) : value);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id, userId);
    
    const [result] = await pool.execute(
      `UPDATE habits SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    
    return (result as any).affectedRows > 0;
  }

  /************************************************************
   * Soft delete habit by setting is_active to false
   ************************************************************/
  static async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute(
      'UPDATE habits SET is_active = FALSE WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    return (result as any).affectedRows > 0;
  }

  /************************************************************
   * Log habit completion for a specific date
   ************************************************************/
  static async logCompletion(
    habitId: number, 
    userId: number, 
    date: string, 
    completed: boolean,
    notes?: string
  ): Promise<HabitLog> {
    // Verify habit belongs to user
    const habit = await this.findById(habitId, userId);
    if (!habit) throw new Error('Habit not found');
    
    const [result] = await pool.execute(
      `INSERT INTO habit_logs (habit_id, log_date, completed, notes) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE completed = ?, notes = ?`,
      [habitId, date, completed, notes || null, completed, notes || null]
    );
    
    const [rows] = await pool.execute(
      'SELECT * FROM habit_logs WHERE id = ?',
      [(result as any).insertId || habitId] // Handle upsert
    );
    
    return (rows as HabitLog[])[0];
  }

  /************************************************************
   * Get habit logs for a specific period
   ************************************************************/
  static async getLogs(
    habitId: number, 
    userId: number, 
    startDate: string, 
    endDate: string
  ): Promise<HabitLog[]> {
    const [rows] = await pool.execute(
      `SELECT hl.* FROM habit_logs hl
       JOIN habits h ON hl.habit_id = h.id
       WHERE h.id = ? AND h.user_id = ? 
         AND hl.log_date BETWEEN ? AND ?
       ORDER BY hl.log_date DESC`,
      [habitId, userId, startDate, endDate]
    );
    
    return rows as HabitLog[];
  }
}

export default HabitModel;