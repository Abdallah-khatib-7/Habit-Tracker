/************************************************************
 * AIRequest Model
 * Tracks AI analysis requests for audit trail and analytics
 ************************************************************/
import { pool } from '../config/database';

export interface AIRequest {
  id: number;
  user_id: number;
  prompt_type: 'analyze' | 'failure' | 'motivation';
  habit_id: number | null;
  prompt: string;
  response: string;
  tokens_used: number | null;
  created_at: Date;
}

export interface CreateAIRequestDTO {
  user_id: number;
  prompt_type: 'analyze' | 'failure' | 'motivation';
  habit_id?: number;
  prompt: string;
  response: string;
  tokens_used?: number;
}

class AIRequestModel {
  /************************************************************
   * Create AI request record
   * For audit trail and usage analytics
   ************************************************************/
  static async create(requestData: CreateAIRequestDTO): Promise<AIRequest> {
    const { user_id, prompt_type, habit_id, prompt, response, tokens_used } = requestData;
    
    const [result] = await pool.execute(
      `INSERT INTO ai_requests 
       (user_id, prompt_type, habit_id, prompt, response, tokens_used) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        prompt_type,
        habit_id || null,
        prompt.substring(0, 1000), // Limit prompt length
        response.substring(0, 2000), // Limit response length
        tokens_used || null
      ]
    );
    
    const [rows] = await pool.execute(
      'SELECT * FROM ai_requests WHERE id = ?',
      [(result as any).insertId]
    );
    
    return (rows as AIRequest[])[0];
  }

  /************************************************************
   * Get AI requests for a user
   * With pagination and filtering options
   ************************************************************/
  static async findByUserId(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      promptType?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<AIRequest[]> {
    const { 
      limit = 50, 
      offset = 0, 
      promptType, 
      startDate, 
      endDate 
    } = options;
    
    let query = `
      SELECT * FROM ai_requests 
      WHERE user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (promptType) {
      query += ' AND prompt_type = ?';
      params.push(promptType);
    }
    
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await pool.execute(query, params);
    return rows as AIRequest[];
  }

  /************************************************************
   * Get AI request by ID with user validation
   ************************************************************/
  static async findById(id: number, userId: number): Promise<AIRequest | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM ai_requests WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    return (rows as AIRequest[])[0] || null;
  }

  /************************************************************
   * Get AI usage statistics for a user
   ************************************************************/
  static async getUserStats(userId: number): Promise<{
    totalRequests: number;
    totalTokens: number;
    requestsByType: Record<string, number>;
    averageTokens: number;
  }> {
    // Total requests and tokens
    const [totalResult] = await pool.execute(
      `SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        AVG(tokens_used) as avg_tokens
       FROM ai_requests 
       WHERE user_id = ?`,
      [userId]
    );
    
    const total = (totalResult as any[])[0];
    
    // Requests by type
    const [typeResult] = await pool.execute(
      `SELECT 
        prompt_type,
        COUNT(*) as count
       FROM ai_requests 
       WHERE user_id = ?
       GROUP BY prompt_type`,
      [userId]
    );
    
    const requestsByType: Record<string, number> = {};
    (typeResult as any[]).forEach(row => {
      requestsByType[row.prompt_type] = row.count;
    });
    
    return {
      totalRequests: total.total_requests,
      totalTokens: total.total_tokens,
      requestsByType,
      averageTokens: Math.round(total.avg_tokens || 0)
    };
  }

  /************************************************************
   * Get recent AI insights for dashboard
   ************************************************************/
  static async getRecentInsights(
    userId: number,
    limit: number = 5
  ): Promise<AIRequest[]> {
    const [rows] = await pool.execute(
      `SELECT 
        id,
        prompt_type,
        habit_id,
        SUBSTRING(prompt, 1, 100) as prompt_preview,
        SUBSTRING(response, 1, 200) as response_preview,
        tokens_used,
        created_at
       FROM ai_requests 
       WHERE user_id = ?
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );
    
    return rows as AIRequest[];
  }

  /************************************************************
   * Delete old AI requests (for data retention policy)
   ************************************************************/
  static async deleteOldRequests(
    daysToKeep: number = 90
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const [result] = await pool.execute(
      'DELETE FROM ai_requests WHERE created_at < ?',
      [cutoffDate]
    );
    
    return (result as any).affectedRows;
  }

  /************************************************************
   * Get popular AI prompts (for analytics)
   ************************************************************/
  static async getPopularPrompts(
    limit: number = 10
  ): Promise<Array<{ prompt: string; count: number }>> {
    const [rows] = await pool.execute(
      `SELECT 
        SUBSTRING(prompt, 1, 100) as prompt,
        COUNT(*) as count
       FROM ai_requests 
       WHERE prompt IS NOT NULL
       GROUP BY SUBSTRING(prompt, 1, 100)
       ORDER BY count DESC
       LIMIT ?`,
      [limit]
    );
    
    return rows as Array<{ prompt: string; count: number }>;
  }
}

export default AIRequestModel;