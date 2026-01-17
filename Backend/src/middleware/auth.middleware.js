import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware - Validates JWT tokens
 */
class AuthMiddleware {
  /**
   * Verify JWT token and attach user to request
   */
  static async verifyToken(req, res, next) {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.'
        });
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Invalid token format.'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token has user ID
      if (!decoded.userId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload.'
        });
      }

      // Attach user ID to request object
      req.userId = decoded.userId;
      req.user = decoded;
      
      next();
    } catch (error) {
      // Handle different JWT errors
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired.'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.'
        });
      }

      // Handle other errors
      console.error('Token verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.'
      });
    }
  }

  /**
   * Optional authentication - doesn't block request if no token
   */
  static async optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.userId = decoded.userId;
        req.user = decoded;
      } catch (error) {
        // Don't block request if token is invalid
        req.userId = null;
        req.user = null;
      }
    }
    
    next();
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(req, res, next) {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }
    next();
  }
}

export default AuthMiddleware;