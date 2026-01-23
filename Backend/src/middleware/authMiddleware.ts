/************************************************************
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request
 ************************************************************/
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserModel from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/************************************************************
 * Middleware to verify JWT token from Authorization header
 ************************************************************/
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.'
      });
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'User not found. Please log in again.'
      });
    }

    // Attach user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token. Please log in again.'
      });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed. Please try again.'
    });
  }
};

/************************************************************
 * Generate JWT token for authenticated user
 ************************************************************/
export const generateToken = (userId: number): string => {
  const JWT_SECRET = process.env.JWT_SECRET;
  
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};