/************************************************************
 * AI Routes
 * Defines endpoints for AI insight features
 ************************************************************/
import { Router } from 'express';
import { body } from 'express-validator';
import OpenAI from 'openai';

import { authenticate } from '../middleware/authMiddleware';
import aiController from '../controllers/aiController';

const router = Router();

/************************************************************
 * OpenAI Client
 ************************************************************/
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/************************************************************
 * PUBLIC TEST ROUTE (No Auth)
 * GET /api/ai/test
 * Used only to verify OpenAI key + SDK wiring
 ************************************************************/
router.get('/test', async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say only: OpenAI is working' }],
    });

    res.json({
      success: true,
      reply: response.choices[0].message.content,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/************************************************************
 * All routes below require authentication
 ************************************************************/
router.use(authenticate);

/************************************************************
 * POST /api/ai/analyze
 * Analyze all habits and provide advice
 ************************************************************/
router.post(
  '/analyze',
  [
    body('timeframe').optional().isIn(['week', 'month', 'all']),
    body('focus').optional().isString().trim(),
  ],
  aiController.analyzeHabits
);

/************************************************************
 * POST /api/ai/failure/:habitId
 * Analyze why a specific habit is failing
 ************************************************************/
router.post(
  '/failure/:habitId',
  [
    body('context').optional().isString().trim(),
  ],
  aiController.analyzeFailure
);

/************************************************************
 * POST /api/ai/motivation
 * Generate motivational feedback
 ************************************************************/
router.post(
  '/motivation',
  [
    body('tone').optional().isIn(['encouraging', 'celebratory', 'reflective']),
  ],
  aiController.generateMotivation
);

export default router;
