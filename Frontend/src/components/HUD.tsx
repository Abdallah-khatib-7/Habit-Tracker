// src/components/HUD.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, BarChart3, Settings, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorld } from '../context/WorldContext';
import  { HabitCreationModal } from './HabitCreationModal';
import  { HabitDetailPanel } from './HabitDetailPanel';
import toast from 'react-hot-toast';

export const HUD: React.FC = () => {
  const { user, logout } = useAuth();
  const { habits, focusHabit, currentFocus, viewMode, setViewMode } = useWorld();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const totalHabits = habits.length;
  const completedToday = habits.filter(h => {
    const today = new Date().toISOString().split('T')[0];
    return h.last_logged === today;
  }).length;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const handleCreateHabit = () => {
    setShowCreateModal(true);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top bar */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-40 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              HabitVerse
            </span>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="text-center">
              <div className="text-sm text-gray-400">Habits</div>
              <div className="text-2xl font-bold text-white">{totalHabits}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Today</div>
              <div className="text-2xl font-bold text-green-400">{completedToday}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Focus</div>
              <div className="text-2xl font-bold text-cyan-400">
                {currentFocus ? '🔍' : '🌌'}
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-gray-900/50 backdrop-blur-sm"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={handleCreateHabit}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Habit
            </button>
            
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
            
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-40 w-64 rounded-xl bg-gray-900/90 backdrop-blur-xl border border-gray-800 shadow-2xl md:hidden"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">{user?.username}</div>
                  <div className="text-sm text-gray-400">{user?.email}</div>
                </div>
              </div>

              <button
                onClick={handleCreateHabit}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <Plus className="w-5 h-5 text-cyan-400 mr-3" />
                  <span className="text-white">New Habit</span>
                </div>
              </button>

              <button
                onClick={() => setViewMode('overview')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-white">Calendar</span>
                </div>
              </button>

              <button
                onClick={() => setViewMode('detail')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 text-purple-400 mr-3" />
                  <span className="text-white">Statistics</span>
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <div className="flex items-center">
                  <Settings className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-white">Settings</span>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <LogOut className="w-5 h-5 text-red-400 mr-3" />
                  <span className="text-white">Logout</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-40 px-6 py-4"
      >
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => focusHabit(null)}
            className="px-6 py-3 rounded-full bg-gray-900/50 backdrop-blur-sm border border-gray-800 text-white hover:bg-gray-800 transition-colors"
          >
            Reset View
          </button>
          
          <button
            onClick={() => setViewMode(viewMode === 'overview' ? 'detail' : 'overview')}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-600/20 to-purple-600/20 backdrop-blur-sm border border-cyan-500/30 text-white hover:from-cyan-600/30 hover:to-purple-600/30 transition-all"
          >
            {viewMode === 'overview' ? 'Show Details' : 'Hide Details'}
          </button>
        </div>
      </motion.div>

      {/* Modals */}
      <HabitCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      
      {currentFocus && (
        <HabitDetailPanel
          habitId={currentFocus}
          onClose={() => focusHabit(null)}
        />
      )}
    </>
  );
};