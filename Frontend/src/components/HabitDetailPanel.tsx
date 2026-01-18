// src/components/HabitDetailPanel.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  Calendar, 
  Flame, 
  Target, 
  TrendingUp, 
  Edit2, 
  Trash2, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useWorld } from '../context/WorldContext';
import type { Habit, HabitLog } from '../types';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { format, subDays, addDays, isToday, parseISO } from 'date-fns';

interface HabitDetailPanelProps {
  habitId: number;
  onClose: () => void;
}

export const HabitDetailPanel: React.FC<HabitDetailPanelProps> = ({ habitId, onClose }) => {
  const { habits, updateHabit, deleteHabit, logHabit, focusHabit } = useWorld();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadHabitData();
  }, [habitId]);

  const loadHabitData = async () => {
    setIsLoading(true);
    try {
      // Get habit from local state or fetch fresh
      const localHabit = habits.find(h => h.id === habitId);
      if (localHabit) {
        setHabit(localHabit);
        setEditedName(localHabit.name);
      }

      // Load logs and streak
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      
      const { logs: habitLogs, streak: habitStreak } = await api.getHabitLogs(
        habitId,
        format(thirtyDaysAgo, 'yyyy-MM-dd'),
        format(today, 'yyyy-MM-dd')
      );

      setLogs(habitLogs);
      setStreak(habitStreak);
    } catch (error: any) {
      toast.error('Failed to load habit details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateHabit = async () => {
    if (!habit || !editedName.trim() || editedName === habit.name) return;

    try {
      await updateHabit(habit.id, editedName);
      setIsEditing(false);
      toast.success('Habit updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update habit');
    }
  };

  const handleDeleteHabit = async () => {
    if (!habit) return;

    if (window.confirm(`Are you sure you want to delete "${habit.name}"? This action cannot be undone.`)) {
      try {
        await deleteHabit(habit.id);
        toast.success('Habit deleted successfully');
        onClose();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete habit');
      }
    }
  };

  const handleLogHabit = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      await logHabit(habitId, dateStr);
      await loadHabitData(); // Refresh data
      toast.success('Habit logged successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to log habit');
    }
  };

  const getLogStatus = (date: Date): 'completed' | 'missed' | 'pending' => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = logs.find(l => l.log_date === dateStr);
    
    if (log) {
      return log.status === 1 ? 'completed' : 'missed';
    }
    
    return 'pending';
  };

  const calculateStats = () => {
    if (!habit || !logs.length) {
      return {
        completionRate: 0,
        longestStreak: 0,
        totalCompletions: 0,
        currentStreak: streak?.current_streak || 0
      };
    }

    const completedLogs = logs.filter(l => l.status === 1);
    const completionRate = logs.length > 0 ? (completedLogs.length / logs.length) * 100 : 0;

    // Calculate longest streak
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    logs
      .filter(l => l.status === 1)
      .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
      .forEach(log => {
        const currentDate = parseISO(log.log_date);
        
        if (lastDate && 
            currentDate.getTime() - lastDate.getTime() === 86400000) { // 1 day in milliseconds
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        
        longestStreak = Math.max(longestStreak, currentStreak);
        lastDate = currentDate;
      });

    return {
      completionRate: Math.round(completionRate),
      longestStreak,
      totalCompletions: completedLogs.length,
      currentStreak: streak?.current_streak || 0
    };
  };

  const stats = calculateStats();

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();
    const startDate = subDays(today, calendarView === 'week' ? 6 : 29);
    
    for (let i = 0; i < (calendarView === 'week' ? 7 : 30); i++) {
      const date = addDays(startDate, i);
      const status = getLogStatus(date);
      const isCurrentDay = isToday(date);
      
      days.push(
        <button
          key={i}
          onClick={() => {
            if (date <= today) {
              handleLogHabit(date);
            }
          }}
          disabled={date > today}
          className={`
            relative flex flex-col items-center justify-center p-2 rounded-lg transition-all
            ${isCurrentDay ? 'ring-2 ring-cyan-500 ring-opacity-50' : ''}
            ${status === 'completed' 
              ? 'bg-green-500/20 hover:bg-green-500/30' 
              : status === 'missed'
                ? 'bg-red-500/20 hover:bg-red-500/30'
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            }
            ${date > today ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
          `}
        >
          <span className="text-xs text-gray-400">
            {format(date, 'EEE')}
          </span>
          <span className={`
            text-lg font-semibold mt-1
            ${status === 'completed' ? 'text-green-400' :
              status === 'missed' ? 'text-red-400' :
              'text-gray-300'
            }
          `}>
            {format(date, 'd')}
          </span>
          {status === 'completed' && (
            <CheckCircle className="absolute top-1 right-1 w-3 h-3 text-green-400" />
          )}
          {status === 'missed' && (
            <div className="absolute top-1 right-1 w-3 h-3 text-red-400">✕</div>
          )}
        </button>
      );
    }
    
    return days;
  };

  const navigateHabit = (direction: 'prev' | 'next') => {
    const currentIndex = habits.findIndex(h => h.id === habitId);
    if (direction === 'prev' && currentIndex > 0) {
      focusHabit(habits[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < habits.length - 1) {
      focusHabit(habits[currentIndex + 1].id);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] z-40 bg-gray-900/95 backdrop-blur-xl border-l border-gray-800 shadow-2xl flex items-center justify-center"
      >
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading habit details...</p>
        </div>
      </motion.div>
    );
  }

  if (!habit) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] z-40 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border-l border-gray-800 shadow-2xl overflow-y-auto scrollbar-hide"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 p-6 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateHabit('prev')}
                  disabled={habits.findIndex(h => h.id === habitId) === 0}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                
                <button
                  onClick={() => navigateHabit('next')}
                  disabled={habits.findIndex(h => h.id === habitId) === habits.length - 1}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5 text-cyan-400" />
              </button>
              <button
                onClick={handleDeleteHabit}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
          
          {isEditing ? (
            <div className="mt-4">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateHabit()}
                className="w-full px-4 py-2 bg-gray-800 border border-cyan-500/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                autoFocus
              />
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={handleUpdateHabit}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedName(habit.name);
                  }}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h2 className="text-2xl font-bold text-white mt-4">{habit.name}</h2>
          )}
          
          <div className="flex items-center space-x-4 mt-3">
            <div className="flex items-center text-sm text-gray-400">
              <Calendar className="w-4 h-4 mr-1" />
              Created {format(new Date(habit.created_at), 'MMM d, yyyy')}
            </div>
            {habit.last_logged && (
              <div className="flex items-center text-sm text-gray-400">
                <Zap className="w-4 h-4 mr-1" />
                Last logged {format(new Date(habit.last_logged), 'MMM d')}
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Overview</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-xs text-gray-400">Current Streak</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.currentStreak} days</div>
              <div className="text-xs text-green-400 mt-1">🔥 Keep going!</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-purple-400" />
                <span className="text-xs text-gray-400">Completion Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
              <div className="w-full bg-gray-700 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-xs text-gray-400">Total Completions</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.totalCompletions}</div>
              <div className="text-xs text-gray-400 mt-1">All time</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-5 h-5 text-yellow-400" />
                <span className="text-xs text-gray-400">Longest Streak</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.longestStreak} days</div>
              <div className="text-xs text-gray-400 mt-1">Personal best</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleLogHabit(new Date())}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Log Today
              </button>
              <button
                onClick={() => {
                  const yesterday = subDays(new Date(), 1);
                  handleLogHabit(yesterday);
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
              >
                Log Yesterday
              </button>
              <button
                onClick={() => setCalendarView(calendarView === 'week' ? 'month' : 'week')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
              >
                {calendarView === 'week' ? 'Show Month' : 'Show Week'}
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Activity Calendar</h3>
              <span className="text-sm text-gray-400">
                {calendarView === 'week' ? 'Last 7 days' : 'Last 30 days'}
              </span>
            </div>
            
            <div className={`
              grid gap-2
              ${calendarView === 'week' ? 'grid-cols-7' : 'grid-cols-6 md:grid-cols-10'}
            `}>
              {renderCalendarDays()}
            </div>
            
            <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500/20 rounded mr-2" />
                <span className="text-gray-400">Completed</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500/20 rounded mr-2" />
                <span className="text-gray-400">Missed</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-800/50 rounded mr-2" />
                <span className="text-gray-400">Pending</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center mr-3
                      ${log.status === 1 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                      }
                    `}>
                      {log.status === 1 ? '✓' : '✕'}
                    </div>
                    <div>
                      <div className="text-white">
                        {format(parseISO(log.log_date), 'MMMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(parseISO(log.created_at), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                  <span className={`
                    text-sm font-medium px-2 py-1 rounded
                    ${log.status === 1 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                    }
                  `}>
                    {log.status === 1 ? 'Completed' : 'Missed'}
                  </span>
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activity logged yet</p>
                  <p className="text-sm mt-1">Start building your streak today!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend for 3D visualization */}
        <div className="p-6 border-t border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-2">3D Visualization Legend</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 mr-2" />
              <span className="text-gray-300">Size = Completion Rate</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500/50 mr-2 animate-pulse" />
              <span className="text-gray-300">Glow = Current Streak</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500/50 mr-2" />
              <span className="text-gray-300">Color = Habit Type</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500/50 mr-2 animate-bounce" />
              <span className="text-gray-300">Pulse = Activity Level</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};