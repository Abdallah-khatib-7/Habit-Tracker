/************************************************************
 * Auth Routes
 * Defines authentication endpoints with proper validation
 ************************************************************/
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';
import { validateEmail, validatePassword, validateUsername } from '../utils/validators';

const router = Router();

/************************************************************
 * POST /api/auth/register
 * Register new user
 ************************************************************/
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
      .custom(validateEmail),
    
    body('password')
      .isLength({ min: 8, max: 100 })
      .withMessage('Password must be 8-100 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number')
      .custom(validatePassword),
    
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .custom(validateUsername)
  ],
  asyncHandler(authController.register)
);

/************************************************************
 * POST /api/auth/login
 * User login
 ************************************************************/
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  asyncHandler(authController.login)
);

/************************************************************
 * GET /api/auth/profile
 * Get current user profile (Protected)
 ************************************************************/
router.get(
  '/profile',
  authenticate,
  asyncHandler(authController.getProfile)
);

/************************************************************
 * PUT /api/auth/profile
 * Update user profile (Protected)
 ************************************************************/
router.put(
  '/profile',
  authenticate,
  [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
      .custom(validateEmail),
    
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .custom(validateUsername)
  ],
  asyncHandler(authController.updateProfile)
);

/************************************************************
 * POST /api/auth/change-password
 * Change password (Protected)
 ************************************************************/
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8, max: 100 })
      .withMessage('New password must be 8-100 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number')
      .custom(validatePassword)
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      })
  ],
  asyncHandler(authController.changePassword)
);

/************************************************************
 * POST /api/auth/logout
 * User logout (invalidate token on client side)
 ************************************************************/
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // Note: For stateless JWT, client should discard the token
    // For stateful sessions, you would invalidate the token server-side
    
    res.send({
      success: true,
      message: 'Logged out successfully'
    });
  })
);

/************************************************************
 * GET /api/auth/verify-token
 * Verify JWT token validity
 ************************************************************/
router.get(
  '/verify-token',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: (req as any).user.id,
          email: (req as any).user.email,
          username: (req as any).user.username
        }
      }
    });
  })
);

export default router;