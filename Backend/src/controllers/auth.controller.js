import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';

/**
 * Authentication Controller - Handles user authentication logic
 */
class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if email already exists
      const emailExists = await UserModel.emailExists(email);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered.'
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await UserModel.createUser({
        username,
        email,
        hashedPassword
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      );

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at
          },
          token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);

      // Handle duplicate email error
      if (error.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json({
          success: false,
          message: 'Email already registered.'
        });
      }

      // Handle database errors
      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Database error occurred during registration.'
        });
      }

      // Handle bcrypt errors
      if (error.name === 'Error' && error.message.includes('bcrypt')) {
        return res.status(500).json({
          success: false,
          message: 'Error processing password.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error.'
      });
    }
  }

  /**
   * Login user
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await UserModel.findUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Compare passwords
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      );

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: userWithoutPassword,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);

      // Handle database errors
      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Database error occurred during login.'
        });
      }

      // Handle bcrypt errors
      if (error.name === 'Error' && error.message.includes('bcrypt')) {
        return res.status(500).json({
          success: false,
          message: 'Error processing password.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error.'
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.userId;
      
      const user = await UserModel.findUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);

      if (error.code === 'DB_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Database error occurred.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error.'
      });
    }
  }
}

export default AuthController;