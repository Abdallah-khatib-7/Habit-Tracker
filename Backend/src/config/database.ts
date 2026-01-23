/************************************************************
 * Database Configuration
 * Creates MySQL connection pool with proper error handling
 ************************************************************/
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'habit_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/************************************************************
 * Test database connection on startup
 ************************************************************/
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export { pool, testConnection };