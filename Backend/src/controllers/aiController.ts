/************************************************************
 * AI Controller
 * Handles AI insight requests with proper validation
 ************************************************************/
import { Request, Response, NextFunction } from 'express';
import aiService from '../services/aiService';
import { validationResult } from 'express-validator';

class AIController {
  /************************************************************
   * Analyze all habits and provide comprehensive advice
   ************************************************************/
  async analyzeHabits(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const response = await aiService.generateResponse(userId, 'analyze');

      res.json({
        success: true,
        data: {
          type: 'analysis',
          response,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /************************************************************
   * Analyze why a specific habit is failing
   ************************************************************/
  async analyzeFailure(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const { habitId } = req.params;

      if (!habitId || isNaN(Number(habitId))) {
        return res.status(400).json({
          error: 'Valid habitId is required'
        });
      }

      const response = await aiService.generateResponse(
        userId, 
        'failure', 
        Number(habitId)
      );

      res.json({
        success: true,
        data: {
          type: 'failure_analysis',
          habitId: Number(habitId),
          response,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /************************************************************
   * Generate motivational feedback based on progress
   ************************************************************/
  async generateMotivation(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const response = await aiService.generateResponse(userId, 'motivation');

      res.json({
        success: true,
        data: {
          type: 'motivation',
          response,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AIController();