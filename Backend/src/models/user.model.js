import pool from '../config/db.js';

/**
 * User Model - Handles all database operations for users
 */
class UserModel {
  /**
   * Create a new user
   * @param {Object} userData - User data including username, email, and hashedPassword
   * @returns {Promise<Object>} - Created user object without password
   */
  static async createUser({ username, email, hashedPassword }) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );

      // Return user data without password
      const user = {
        id: result.insertId,
        username,
        email,
        created_at: new Date()
      };

      return user;
    } catch (error) {
      // Handle duplicate email error (MySQL error code 1062)
      if (error.code === 'ER_DUP_ENTRY') {
        const duplicateError = new Error('Email already registered');
        duplicateError.code = 'DUPLICATE_EMAIL';
        throw duplicateError;
      }
      
      // Handle other database errors
      const dbError = new Error('Database error occurred');
      dbError.originalError = error;
      dbError.code = 'DB_ERROR';
      throw dbError;
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by email
   * @param {string} email - User's email
   * @returns {Promise<Object|null>} - User object or null if not found
   */
  static async findUserByEmail(email) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT id, username, email, password, created_at FROM users WHERE email = ?',
        [email]
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      const dbError = new Error('Database error occurred while finding user');
      dbError.originalError = error;
      dbError.code = 'DB_ERROR';
      throw dbError;
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} - User object without password or null if not found
   */
  static async findUserById(id) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
        [id]
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      const dbError = new Error('Database error occurred while finding user');
      dbError.originalError = error;
      dbError.code = 'DB_ERROR';
      throw dbError;
    } finally {
      connection.release();
    }
  }

  /**
   * Check if email already exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} - True if email exists
   */
  static async emailExists(email) {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT 1 FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      return rows.length > 0;
    } catch (error) {
      const dbError = new Error('Database error occurred while checking email');
      dbError.originalError = error;
      dbError.code = 'DB_ERROR';
      throw dbError;
    } finally {
      connection.release();
    }
  }
}

export default UserModel;