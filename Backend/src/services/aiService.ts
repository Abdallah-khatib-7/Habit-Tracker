/************************************************************
 * AI Service
 * Handles OpenAI API interactions with proper prompt engineering
 * and response validation to prevent hallucinations
 ************************************************************/
import OpenAI from 'openai';
import HabitModel from '../models/Habit';
import AIRequestModel from '../models/AIRequest';

interface UserHabitData {
  habits: Array<{
    name: string;
    frequency: string;
    streak: number;
    completion_rate: number;
    logs: Array<{
      date: string;
      completed: boolean;
    }>;
  }>;
  userInfo: {
    totalActiveHabits: number;
    overallCompletionRate: number;
    bestStreak: number;
  };
}

class AIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /************************************************************
   * Generate AI response based on prompt type and user data
   * Includes strict system prompts to prevent hallucinations
   ************************************************************/
  async generateResponse(
    userId: number, 
    promptType: 'analyze' | 'failure' | 'motivation',
    habitId?: number
  ): Promise<string> {
    try {
      // Get user habit data
      const userData = await this.getUserHabitData(userId, habitId);
      
      // Construct prompt based on type
      const prompt = this.constructPrompt(promptType, userData);
      
      // Generate AI response
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(promptType)
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content || 
        'Unable to generate insights at this time.';

      // Log the request for audit trail
      await AIRequestModel.create({
        user_id: userId,
        prompt_type: promptType,
        habit_id: habitId ?? undefined,
        prompt,
        response: aiResponse,
        tokens_used: response.usage?.total_tokens || 0
      });

      return aiResponse;

    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to generate AI insights');
    }
  }

  /************************************************************
   * Get structured habit data for AI analysis
   ************************************************************/
  private async getUserHabitData(
    userId: number, 
    habitId?: number
  ): Promise<UserHabitData> {
    // Implementation depends on your data structure
    // This is a simplified version
    const habits = await HabitModel.findByUserId(userId);
    
    const habitData = await Promise.all(
      habits.map(async (habit) => {
        if (habitId && habit.id !== habitId) return null;
        
        const logs = await HabitModel.getLogs(
          habit.id, 
          userId, 
          this.getDateNDaysAgo(30), 
          new Date().toISOString().split('T')[0]
        );
        
        return {
          name: habit.name,
          frequency: habit.frequency,
          streak: this.calculateStreak(logs),
          completion_rate: this.calculateCompletionRate(logs),
          logs: logs.map(log => ({
            date: log.log_date,
            completed: log.completed
          }))
        };
      })
    );

    const filteredHabits = habitData.filter((h): h is NonNullable<typeof h> => h !== null);

    return {
      habits: filteredHabits,
      userInfo: {
        totalActiveHabits: filteredHabits.length,
        overallCompletionRate: this.calculateOverallCompletionRate(filteredHabits),
        bestStreak: Math.max(...filteredHabits.map(h => h.streak), 0)
      }
    };
  }

  /************************************************************
   * Construct specific prompts for each AI feature
   ************************************************************/
  private constructPrompt(
    type: 'analyze' | 'failure' | 'motivation', 
    data: UserHabitData
  ): string {
    const basePrompt = `Based on the following habit tracking data:\n\n${JSON.stringify(data, null, 2)}\n\n`;

    switch (type) {
      case 'analyze':
        return `${basePrompt}Analyze my habits and give me practical advice for improvement. Focus on patterns, consistency, and achievable next steps.`;
      
      case 'failure':
        return `${basePrompt}Why might I be struggling with this specific habit? Provide empathetic, constructive feedback based on the completion pattern.`;
      
      case 'motivation':
        return `${basePrompt}Generate motivational feedback that acknowledges progress while encouraging continued effort. Be specific about what's working well.`;
      
      default:
        return `${basePrompt}Provide general insights about this habit tracking data.`;
    }
  }

  /************************************************************
   * System prompts to prevent hallucinations and ensure
   * responses stay within data boundaries
   ************************************************************/
  private getSystemPrompt(type: string): string {
    const baseSystemPrompt = `
      You are a helpful habit analysis assistant. 
      Your role is to provide insights based ONLY on the user's habit tracking data.
      
      RULES:
      1. NEVER invent data not present in the user's logs
      2. NEVER suggest features not in the habit tracker
      3. Be concise and practical
      4. Focus on patterns in the actual data
      5. Acknowledge limitations when data is sparse
      6. Provide actionable, specific advice
      
      IMPORTANT: If you cannot provide a useful insight based on the data, 
      say "Based on the available data, I don't have enough information to provide specific insights."
    `;

    const typeSpecificPrompts: Record<string, string> = {
      analyze: `${baseSystemPrompt} Focus on overall patterns and strategic improvements.`,
      failure: `${baseSystemPrompt} Be empathetic about struggles while staying data-driven.`,
      motivation: `${baseSystemPrompt} Be encouraging while staying truthful to the data.`
    };

    return typeSpecificPrompts[type] || baseSystemPrompt;
  }

  /************************************************************
   * Helper methods for data processing
   ************************************************************/
  private getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  private calculateStreak(logs: any[]): number {
    // Simplified streak calculation
    let streak = 0;
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    );
    
    for (const log of sortedLogs) {
      if (log.completed) streak++;
      else break;
    }
    
    return streak;
  }

  private calculateCompletionRate(logs: any[]): number {
    if (logs.length === 0) return 0;
    const completed = logs.filter(log => log.completed).length;
    return (completed / logs.length) * 100;
  }

  private calculateOverallCompletionRate(habits: any[]): number {
    if (habits.length === 0) return 0;
    const totalRate = habits.reduce((sum, habit) => sum + habit.completion_rate, 0);
    return totalRate / habits.length;
  }
}

export default new AIService();