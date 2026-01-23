/************************************************************
 * Auth Controller
 * Handles user authentication: registration, login, and token management
 * Includes proper validation, error handling, and security measures
 ************************************************************/
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import authService from '../services/authService';
import { generateToken } from '../middleware/authMiddleware';
import { sendResponse } from '../utils/responseHandler';
import logger from '../utils/logger';

class AuthController {
  /************************************************************
   * User Registration
   * Creates new user account with email verification
   ************************************************************/
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, username } = req.body;

      // Check if user already exists
      const existingUser = await authService.findUserByEmail(email);
      if (existingUser) {
        return sendResponse(res, 409, {
          success: false,
          error: 'Email already registered'
        });
      }

      // Create new user
      const user = await authService.createUser({
        email,
        password,
        username
      });

      // Generate JWT token
      const token = generateToken(user.id);

      // Log registration
      logger.info(`User registered: ${user.email}`, { userId: user.id });

      // Return user data (excluding password)
      const userResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at
      };

      sendResponse(res, 201, {
        success: true,
        data: {
          user: userResponse,
          token,
          message: 'Registration successful'
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  /************************************************************
   * User Login
   * Authenticates user and returns JWT token
   ************************************************************/
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, {
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await authService.findUserByEmail(email);
      if (!user) {
        return sendResponse(res, 401, {
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await authService.verifyPassword(
        password,
        user.password_hash
      );

      if (!isValidPassword) {
        return sendResponse(res, 401, {
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = generateToken(user.id);

      // Log login
      logger.info(`User logged in: ${user.email}`, { userId: user.id });

      // Return user data (excluding password)
      const userResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at
      };

      sendResponse(res, 200, {
        success: true,
        data: {
          user: userResponse,
          token,
          message: 'Login successful'
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  /************************************************************
   * Get Current User Profile
   * Returns authenticated user's profile information
   ************************************************************/
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const user = await authService.getUserById(userId);
      if (!user) {
        return sendResponse(res, 404, {
          success: false,
          error: 'User not found'
        });
      }

      const userResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };

      sendResponse(res, 200, {
        success: true,
        data: { user: userResponse }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }

  /************************************************************
   * Update User Profile
   * Allows updating username and email with validation
   ************************************************************/
  async updateProfile(req: Request, res: Response, next: NextFunction) {
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
      const { username, email } = req.body;

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await authService.findUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return sendResponse(res, 409, {
            success: false,
            error: 'Email already in use'
          });
        }
      }

      const updatedUser = await authService.updateUser(userId, {
        username,
        email
      });

      const userResponse = {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        updatedAt: updatedUser.updated_at
      };

      logger.info(`Profile updated for user: ${userId}`);

      sendResponse(res, 200, {
        success: true,
        data: {
          user: userResponse,
          message: 'Profile updated successfully'
        }
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  }

  /************************************************************
   * Change Password
   * Secure password change with current password verification
   ************************************************************/
  async changePassword(req: Request, res: Response, next: NextFunction) {
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
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await authService.getUserById(userId);
      if (!user) {
        return sendResponse(res, 404, {
          success: false,
          error: 'User not found'
        });
      }

      const isValidPassword = await authService.verifyPassword(
        currentPassword,
        user.password_hash
      );

      if (!isValidPassword) {
        return sendResponse(res, 401, {
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Update to new password
      await authService.updatePassword(userId, newPassword);

      logger.info(`Password changed for user: ${userId}`);

      sendResponse(res, 200, {
        success: true,
        data: {
          message: 'Password changed successfully'
        }
      });

    } catch (error) {
      logger.error('Change password error:', error);
      next(error);
    }
  }
}

export default new AuthController();