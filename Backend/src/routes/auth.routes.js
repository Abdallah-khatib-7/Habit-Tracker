import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import ValidationMiddleware from '../middleware/validation.middleware.js';
import AuthMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  ValidationMiddleware.validateRegister,
  AuthController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  ValidationMiddleware.validateLogin,
  AuthController.login
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private (requires authentication)
 */
router.get(
  '/profile',
  AuthMiddleware.verifyToken,
  AuthController.getProfile
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token validity
 * @access  Private (requires authentication)
 */
router.get(
  '/verify',
  AuthMiddleware.verifyToken,
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Token is valid.',
      data: {
        user: req.user
      }
    });
  }
);

export default router;