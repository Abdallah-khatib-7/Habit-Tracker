// src/contexts/WorldContext.tsx
import React from 'react';
import  { createContext, useContext, useState, useCallback,} from 'react';
import type { ReactNode } from 'react';
import type { Habit, HabitNodeData, WorldState } from '../types';
import { api } from '../services/api';

interface WorldContextType extends WorldState {
  loadHabits: () => Promise<void>;
  createHabit: (name: string) => Promise<void>;
  updateHabit: (id: number, name: string) => Promise<void>;
  deleteHabit: (id: number) => Promise<void>;
  logHabit: (id: number, date?: string) => Promise<void>;
  setViewMode: (mode: WorldState['viewMode']) => void;
  focusHabit: (id: number | null) => void;
  getHabitNodeData: (habit: Habit) => HabitNodeData;
}

const WorldContext = createContext<WorldContextType | undefined>(undefined);

export const useWorld = () => {
  const context = useContext(WorldContext);
  if (!context) {
    throw new Error('useWorld must be used within a WorldProvider');
  }
  return context;
};

interface WorldProviderProps {
  children: ReactNode;
}

export const WorldProvider: React.FC<WorldProviderProps> = ({ children }) => {
  const [state, setState] = useState<WorldState>({
    habits: [],
    isLoaded: false,
    isTransitioning: false,
    currentFocus: null,
    viewMode: 'overview',
    timeOfDay: 'night'
  });

  const getHabitNodeData = useCallback((habit: Habit): HabitNodeData => {
    // Generate deterministic position based on habit ID
    const seed = habit.id * 12345;
    const angle = (seed % 360) * Math.PI / 180;
    const radius = 10 + (seed % 5);
    const height = (seed % 3) - 1;
    
    const completionRate = habit.completed_logs && habit.total_logs 
      ? habit.completed_logs / habit.total_logs 
      : 0;
    
    const streak = habit.current_streak || 0;
    
    return {
      ...habit,
      position: [
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      ] as [number, number, number],
      scale: 0.5 + completionRate * 0.5,
      energy: completionRate,
      stability: Math.min(1, (habit.total_logs || 0) / 30), // More logs = more stable
      glow: Math.min(1, streak / 7), // Full glow at 7-day streak
      rotationSpeed: 0.2 + (completionRate * 0.3),
      pulseIntensity: 0.2 + (completionRate * 0.8)
    };
  }, []);

  const loadHabits = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoaded: false }));
      const habits = await api.getHabits();
      
      // Transform habits into 3D node data
      const habitNodes = habits.map(habit => getHabitNodeData(habit));
      
      setState(prev => ({
        ...prev,
        habits: habitNodes,
        isLoaded: true
      }));
    } catch (error) {
      console.error('Failed to load habits:', error);
      setState(prev => ({ ...prev, isLoaded: true }));
    }
  }, [getHabitNodeData]);

  const createHabit = useCallback(async (name: string) => {
    try {
      const newHabit = await api.createHabit(name);
      const newNode = getHabitNodeData(newHabit);
      
      setState(prev => ({
        ...prev,
        habits: [...prev.habits, newNode]
      }));
    } catch (error) {
      throw error;
    }
  }, [getHabitNodeData]);

  const updateHabit = useCallback(async (id: number, name: string) => {
    try {
      const updatedHabit = await api.updateHabit(id, name);
      setState(prev => ({
        ...prev,
        habits: prev.habits.map(node => 
          node.id === id ? getHabitNodeData({ ...node, ...updatedHabit }) : node
        )
      }));
    } catch (error) {
      throw error;
    }
  }, [getHabitNodeData]);

  const deleteHabit = useCallback(async (id: number) => {
    try {
      await api.deleteHabit(id);
      setState(prev => ({
        ...prev,
        habits: prev.habits.filter(node => node.id !== id)
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const logHabit = useCallback(async (id: number, date?: string) => {
    try {
      await api.logHabit(id, date, 1);
      // Reload habits to get updated stats
      await loadHabits();
    } catch (error) {
      throw error;
    }
  }, [loadHabits]);

  const setViewMode = useCallback((mode: WorldState['viewMode']) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const focusHabit = useCallback((id: number | null) => {
    setState(prev => ({ ...prev, currentFocus: id }));
  }, []);

  return (
    <WorldContext.Provider
      value={{
        ...state,
        loadHabits,
        createHabit,
        updateHabit,
        deleteHabit,
        logHabit,
        setViewMode,
        focusHabit,
        getHabitNodeData
      }}
    >
      {children}
    </WorldContext.Provider>
  );
};