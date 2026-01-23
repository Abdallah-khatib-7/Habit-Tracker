/************************************************************
 * Entry point for the Habit Tracker backend
 * Configures Express server, middleware, and routes
 ************************************************************/
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import habitRoutes from './routes/habitRoutes';
import aiRoutes from './routes/aiRoutes';
import { errorHandler } from './middleware/errorMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/************************************************************
 * Security & Performance Middleware
 ************************************************************/
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/************************************************************
 * API Routes
 ************************************************************/
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/ai', aiRoutes);

/************************************************************
 * Health Check Endpoint
 ************************************************************/
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

/************************************************************
 * Error Handling Middleware (must be last)
 ************************************************************/
app.use(errorHandler);

/************************************************************
 * Start Server
 ************************************************************/
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🤖 AI Service: ${process.env.AI_SERVICE_URL}`);
  console.log(`🔒 Auth Service: ${process.env.AUTH_SERVICE_URL}`);
  console.log(`🛠️  Environment: ${process.env.NODE_ENV}`);
  console.log(`-----------------------------------`);
});