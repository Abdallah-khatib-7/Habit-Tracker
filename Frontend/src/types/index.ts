// src/types/index.ts
export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Habit {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  total_logs?: number;
  completed_logs?: number;
  last_logged?: string;
  current_streak?: number;
  completion_rate?: number;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  log_date: string;
  status: number; // 0 = missed, 1 = completed
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthTokens {
  token: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface HabitNodeData extends Habit {
  position: [number, number, number];
  scale: number;
  energy: number; // 0-1 based on completion rate
  stability: number; // 0-1 based on consistency
  glow: number; // 0-1 based on streak
  rotationSpeed: number;
  pulseIntensity: number;
}

export interface WorldState {
  habits: HabitNodeData[];
  isLoaded: boolean;
  isTransitioning: boolean;
  currentFocus: number | null;
  viewMode: 'overview' | 'detail' | 'creation';
  timeOfDay: 'day' | 'night' | 'dawn';
}