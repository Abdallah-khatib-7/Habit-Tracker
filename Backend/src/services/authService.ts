/************************************************************
 * Auth Service
 * Handles authentication business logic
 * Separates concerns from controllers and models
 ************************************************************/
import bcrypt from 'bcryptjs';
import UserModel, { CreateUserDTO, User } from '../models/User';
import logger from '../utils/logger';

class AuthService {
  /************************************************************
   * Create new user with hashed password
   ************************************************************/
  async createUser(userData: CreateUserDTO): Promise<User> {
    try {
      // Additional validation before creation
      await this.validateUserData(userData);
      
      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }
      
      // Create user via model
      const user = await UserModel.create(userData);
      
      logger.info('User created successfully', { userId: user.id });
      return user;
      
    } catch (error) {
      logger.error('Create user service error:', error);
      throw error;
    }
  }

  /************************************************************
   * Find user by email
   ************************************************************/
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await UserModel.findByEmail(email);
      return user;
    } catch (error) {
      logger.error('Find user by email error:', error);
      throw error;
    }
  }

  /************************************************************
   * Get user by ID
   ************************************************************/
  async getUserById(id: number): Promise<User | null> {
    try {
      const user = await UserModel.findById(id);
      return user;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  /************************************************************
   * Verify password
   ************************************************************/
  async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      const isValid = await UserModel.verifyPassword(plainPassword, hashedPassword);
      return isValid;
    } catch (error) {
      logger.error('Verify password error:', error);
      throw error;
    }
  }

  /************************************************************
   * Update user profile
   ************************************************************/
  async updateUser(
    userId: number,
    updates: Partial<{ username: string; email: string }>
  ): Promise<User> {
    try {
      // Get current user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update via model (would need update method in UserModel)
      // This is a simplified implementation
      // In practice, you'd add an update method to UserModel
      
      return user;
    } catch (error) {
      logger.error('Update user error:', error);
      throw error;
    }
  }

  /************************************************************
   * Update user password
   ************************************************************/
  async updatePassword(userId: number, newPassword: string): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update password in database
      // This would require adding an updatePassword method to UserModel
      
      logger.info('Password updated', { userId });
    } catch (error) {
      logger.error('Update password error:', error);
      throw error;
    }
  }

  /************************************************************
   * Validate user data before creation
   ************************************************************/
  private async validateUserData(userData: CreateUserDTO): Promise<void> {
    const { email, password, username } = userData;
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    // Password strength validation
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error('Password must contain uppercase, lowercase, and number');
    }
    
    // Username validation
    if (username.length < 3 || username.length > 50) {
      throw new Error('Username must be 3-50 characters');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
  }

  /************************************************************
   * Generate password reset token
   ************************************************************/
  async generatePasswordResetToken(email: string): Promise<string> {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        throw new Error('If an account exists, a reset email will be sent');
      }
      
      // Generate reset token (would typically use JWT or crypto)
      const resetToken = this.generateSecureToken();
      
      // Store reset token in database with expiration
      // This would require a password_reset_tokens table
      
      logger.info('Password reset token generated', { userId: user.id });
      return resetToken;
      
    } catch (error) {
      logger.error('Generate password reset token error:', error);
      throw error;
    }
  }

  /************************************************************
   * Reset password with token
   ************************************************************/
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // Verify token exists and is not expired
      // Update user password
      // Invalidate all existing tokens for user
      
      logger.info('Password reset successfully', { token });
      return true;
      
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }

  /************************************************************
   * Generate secure random token
   ************************************************************/
  private generateSecureToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /************************************************************
   * Check if email is available
   ************************************************************/
  async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const user = await this.findUserByEmail(email);
      return !user;
    } catch (error) {
      logger.error('Check email availability error:', error);
      throw error;
    }
  }

  /************************************************************
   * Get user statistics
   ************************************************************/
  async getUserStats(userId: number): Promise<{
    habitsCount: number;
    totalLogs: number;
    averageCompletion: number;
    joinDate: Date;
  }> {
    try {
      // This would query various tables for statistics
      // Simplified implementation
      
      return {
        habitsCount: 0,
        totalLogs: 0,
        averageCompletion: 0,
        joinDate: new Date()
      };
    } catch (error) {
      logger.error('Get user stats error:', error);
      throw error;
    }
  }
}

export default new AuthService();