// src/services/api.ts
import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import { config } from '../config/environment';
import type { User, Habit, HabitLog, ApiResponse } from '../types';

interface Streak {
  current: number;
  longest: number;
  lastLogDate: string | null;
}

interface HabitStats {
  totalHabits: number;
  completedToday: number;
  overallCompletionRate: number;
  [key: string]: number | string;
}

class ApiService {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = config.API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
    
    // Set up axios instance
    axios.defaults.baseURL = this.baseURL;
    if (this.token) {
      this.setAuthToken(this.token);
    }
  }

  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    delete axios.defaults.headers.common['Authorization'];
  }

  async handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): Promise<T> {
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Request failed');
  }

  private handleError(error: AxiosError): never {
  if (error.response?.data) {
    throw error.response.data;
  }

  throw new Error(error.message || "Server error");
}


  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const response = await axios.post<ApiResponse<{ user: User; token: string }>>(
        '/auth/login',
        { email, password }
      );
      const data = await this.handleResponse(response);
      this.setAuthToken(data.token);
      return data;
    } catch (error) {
       this.handleError(error as AxiosError);
      throw error;
    }
  }

  async register(username: string, email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const response = await axios.post<ApiResponse<{ user: User; token: string }>>(
        '/auth/register',
        { username, email, password }
      );
      const data = await this.handleResponse(response);
      this.setAuthToken(data.token);
      return data;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  // Habits
  async getHabits(): Promise<Habit[]> {
    try {
      const response = await axios.get<ApiResponse<{ habits: Habit[] }>>('/habits');
      const data = await this.handleResponse(response);
      return data.habits || [];
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  async createHabit(name: string): Promise<Habit> {
    try {
      const response = await axios.post<ApiResponse<{ habit: Habit }>>('/habits', { name });
      const data = await this.handleResponse(response);
      return data.habit;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  async updateHabit(id: number, name: string): Promise<Habit> {
    try {
      const response = await axios.put<ApiResponse<{ habit: Habit }>>(`/habits/${id}`, { name });
      const data = await this.handleResponse(response);
      return data.habit;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  async deleteHabit(id: number): Promise<boolean> {
    try {
      const response = await axios.delete<ApiResponse<{ deleted: boolean }>>(`/habits/${id}`);
      const data = await this.handleResponse(response);
      return data.deleted;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  async logHabit(id: number, date?: string, status: number = 1): Promise<HabitLog> {
    try {
      const response = await axios.post<ApiResponse<{ log: HabitLog }>>(
        `/habits/${id}/log`,
        { date, status }
      );
      const data = await this.handleResponse(response);
      return data.log;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  async getHabitLogs(id: number, startDate?: string, endDate?: string): Promise<{ logs: HabitLog[]; streak: Streak }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await axios.get<ApiResponse<{ logs: HabitLog[]; streak: Streak }>>(
        `/habits/${id}/logs${params.toString() ? `?${params.toString()}` : ''}`
      );
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  async getHabitStats(): Promise<HabitStats> {
    try {
      const response = await axios.get<ApiResponse<{ stats: HabitStats }>>('/habits/stats');
      const data = await this.handleResponse(response);
      return data.stats;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }
}

export const api = new ApiService();