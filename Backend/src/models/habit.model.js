import pool from '../config/db.js';

/**
 * Custom error classes for habit operations
 */
class HabitError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'HabitError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class NotFoundError extends HabitError {
  constructor(resource, id) {
    super(`${resource} with ID ${id} not found`, 'NOT_FOUND', 404);
  }
}

class UnauthorizedError extends HabitError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'UNAUTHORIZED', 403);
  }
}

/**
 * Habit Model - Database access layer for habit operations
 */
class HabitModel {
  /**
   * Create a new habit for a user
   * @param {number} userId - The user's ID
   * @param {string} name - Habit name
   * @returns {Promise<Object>} Created habit object
   */
  static async createHabit(userId, name) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        'INSERT INTO habits (user_id, name) VALUES (?, ?)',
        [userId, name]
      );

      const [habits] = await connection.execute(
        'SELECT id, user_id, name, created_at FROM habits WHERE id = ?',
        [result.insertId]
      );

      return habits[0];
    } catch (error) {
      console.error('Database error in createHabit:', error);
      
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new HabitError('User does not exist', 'USER_NOT_FOUND', 404);
      }
      
      throw new HabitError(
        'Failed to create habit',
        'DB_ERROR',
        500
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get all habits for a specific user
   * @param {number} userId - The user's ID
   * @returns {Promise<Array>} Array of habit objects
   */
  static async getUserHabits(userId) {
    const connection = await pool.getConnection();
    
    try {
      const [habits] = await connection.execute(
        `SELECT 
          h.id, 
          h.user_id, 
          h.name, 
          h.created_at,
          COUNT(hl.id) as total_logs,
          SUM(CASE WHEN hl.status = 1 THEN 1 ELSE 0 END) as completed_logs,
          MAX(hl.log_date) as last_logged
        FROM habits h
        LEFT JOIN habit_logs hl ON h.id = hl.habit_id
        WHERE h.user_id = ?
        GROUP BY h.id
        ORDER BY h.created_at DESC`,
        [userId]
      );

      return habits;
    } catch (error) {
      console.error('Database error in getUserHabits:', error);
      throw new HabitError(
        'Failed to retrieve habits',
        'DB_ERROR',
        500
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get a specific habit with ownership verification
   * @param {number} habitId - Habit ID
   * @param {number} userId - User ID for ownership check
   * @returns {Promise<Object>} Habit object if found and owned by user
   */
  static async getHabitById(habitId, userId) {
    const connection = await pool.getConnection();
    
    try {
      const [habits] = await connection.execute(
        'SELECT id, user_id, name, created_at FROM habits WHERE id = ? AND user_id = ?',
        [habitId, userId]
      );

      if (habits.length === 0) {
        throw new NotFoundError('Habit', habitId);
      }

      return habits[0];
    } catch (error) {
      if (error instanceof HabitError) throw error;
      
      console.error('Database error in getHabitById:', error);
      throw new HabitError(
        'Failed to retrieve habit',
        'DB_ERROR',
        500
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Update a habit's name
   * @param {number} habitId - Habit ID
   * @param {number} userId - User ID for ownership verification
   * @param {string} name - New habit name
   * @returns {Promise<Object>} Updated habit object
   */
  static async updateHabit(habitId, userId, name) {
    const connection = await pool.getConnection();
    
    try {
      // First verify ownership
      await this.getHabitById(habitId, userId);

      const [result] = await connection.execute(
        'UPDATE habits SET name = ? WHERE id = ? AND user_id = ?',
        [name, habitId, userId]
      );

      if (result.affectedRows === 0) {
        throw new UnauthorizedError();
      }

      const [habits] = await connection.execute(
        'SELECT id, user_id, name, created_at FROM habits WHERE id = ?',
        [habitId]
      );

      return habits[0];
    } catch (error) {
      if (error instanceof HabitError) throw error;
      
      console.error('Database error in updateHabit:', error);
      throw new HabitError(
        'Failed to update habit',
        'DB_ERROR',
        500
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a habit and all its logs
   * @param {number} habitId - Habit ID
   * @param {number} userId - User ID for ownership verification
   * @returns {Promise<boolean>} True if deletion was successful
   */
  static async deleteHabit(habitId, userId) {
    const connection = await pool.getConnection();
    
    try {
      // Start transaction for atomic operation
      await connection.beginTransaction();

      try {
        // Delete habit logs first (foreign key constraint)
        await connection.execute(
          'DELETE FROM habit_logs WHERE habit_id = ?',
          [habitId]
        );

        // Delete the habit
        const [result] = await connection.execute(
          'DELETE FROM habits WHERE id = ? AND user_id = ?',
          [habitId, userId]
        );

        if (result.affectedRows === 0) {
          throw new NotFoundError('Habit', habitId);
        }

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof HabitError) throw error;
      
      console.error('Database error in deleteHabit:', error);
      throw new HabitError(
        'Failed to delete habit',
        'DB_ERROR',
        500
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Log habit completion for a specific date
   * @param {number} habitId - Habit ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {number} status - Log status (0 = missed, 1 = completed)
   * @returns {Promise<Object>} Created log entry
   */
  static async logHabit(habitId, date, status = 1) {
    const connection = await pool.getConnection();
    
    try {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new HabitError(
          'Invalid date format. Use YYYY-MM-DD',
          'INVALID_DATE',
          400
        );
      }

      // Check if log already exists for this date
      const [existingLogs] = await connection.execute(
        'SELECT id FROM habit_logs WHERE habit_id = ? AND log_date = ?',
        [habitId, date]
      );

      let logId;
      
      if (existingLogs.length > 0) {
        // Update existing log
        const [result] = await connection.execute(
          'UPDATE habit_logs SET status = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
          [status, existingLogs[0].id]
        );
        logId = existingLogs[0].id;
      } else {
        // Create new log
        const [result] = await connection.execute(
          'INSERT INTO habit_logs (habit_id, log_date, status) VALUES (?, ?, ?)',
          [habitId, date, status]
        );
        logId = result.insertId;
      }

      // Return the created/updated log
      const [logs] = await connection.execute(
        'SELECT id, habit_id, log_date, status, created_at FROM habit_logs WHERE id = ?',
        [logId]
      );

      return logs[0];
    } catch (error) {
      if (error instanceof HabitError) throw error;
      
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new NotFoundError('Habit', habitId);
      }
      
      console.error('Database error in logHabit:', error);
      throw new HabitError(
        'Failed to log habit',
        'DB_ERROR',
        500
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get all logs for a specific habit
   * @param {number} habitId - Habit ID
   * @param {Object} options - Query options
   * @param {string} options.startDate - Start date filter (YYYY-MM-DD)
   * @param {string} options.endDate - End date filter (YYYY-MM-DD)
   * @param {number} options.limit - Maximum number of logs to return
   * @returns {Promise<Array>} Array of log objects
   */
  static async getHabitLogs(habitId, options = {}) {
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT 
          id, 
          habit_id, 
          log_date, 
          status, 
          created_at 
        FROM habit_logs 
        WHERE habit_id = ?
      `;
      
      const params = [habitId];

      // Apply date filters if provided
      if (options.startDate) {
        query += ' AND log_date >= ?';
        params.push(options.startDate);
      }
      
      if (options.endDate) {
        query += ' AND log_date <= ?';
        params.push(options.endDate);
      }

      query += ' ORDER BY log_date DESC';

      // Apply limit if provided
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(options.limit));
      }

      const [logs] = await connection.execute(query, params);
      return logs;
    } catch (error) {
      console.error('Database error in getHabitLogs:', error);
      throw new HabitError(
        'Failed to retrieve habit logs',
        'DB_ERROR',
        500
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get habit streak data
   * @param {number} habitId - Habit ID
   * @returns {Promise<Object>} Streak information
   */
  static async getHabitStreak(habitId) {
    const connection = await pool.getConnection();
    
    try {
      const [streakData] = await connection.execute(
        `WITH streak_data AS (
          SELECT 
            log_date,
            status,
            LAG(log_date) OVER (ORDER BY log_date) as prev_date
          FROM habit_logs 
          WHERE habit_id = ? 
            AND status = 1
          ORDER BY log_date DESC
        )
        SELECT 
          MAX(log_date) as latest_completion,
          MIN(log_date) as earliest_completion,
          COUNT(*) as current_streak
        FROM streak_data
        WHERE prev_date IS NULL 
          OR prev_date = DATE_SUB(log_date, INTERVAL 1 DAY)`,
        [habitId]
      );

      return streakData[0] || {
        latest_completion: null,
        earliest_completion: null,
        current_streak: 0
      };
    } catch (error) {
      console.error('Database error in getHabitStreak:', error);
      throw new HabitError(
        'Failed to calculate streak',
        'DB_ERROR',
        500
      );
    } finally {
      connection.release();
    }
  }
}

export { HabitModel, HabitError, NotFoundError, UnauthorizedError };