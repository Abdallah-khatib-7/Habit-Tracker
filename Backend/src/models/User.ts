/************************************************************
 * User Model
 * Handles database operations for user management
 ************************************************************/
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  username: string;
}

class UserModel {
  /************************************************************
   * Create new user with hashed password
   ************************************************************/
  static async create(userData: CreateUserDTO): Promise<User> {
    const { email, password, username } = userData;
    const password_hash = await bcrypt.hash(password, 12);
    
    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)',
      [email, password_hash, username]
    );
    
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [(result as any).insertId]
    );
    
    return (rows as User[])[0];
  }

  /************************************************************
   * Find user by email for login authentication
   ************************************************************/
  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    return (rows as User[])[0] || null;
  }

  /************************************************************
   * Find user by ID (for JWT verification)
   ************************************************************/
  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.execute(
      'SELECT id, email, username, created_at FROM users WHERE id = ?',
      [id]
    );
    
    return (rows as User[])[0] || null;
  }

  /************************************************************
   * Verify password against stored hash
   ************************************************************/
  static async verifyPassword(
    plainPassword: string, 
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

export default UserModel;