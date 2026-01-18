// src/components/HabitCreationModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles } from 'lucide-react';
import { useWorld } from '../context/WorldContext';
import toast from 'react-hot-toast';

interface HabitCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HabitCreationModal: React.FC<HabitCreationModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createHabit } = useWorld();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createHabit(name.trim());
      toast.success('Habit created successfully!');
      setName('');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create habit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Sparkles className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create New Habit</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Give life to a new habit in your universe
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Habit Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-lg"
                    placeholder="e.g., Morning Meditation, Daily Exercise"
                    autoFocus
                  />
                  <p className="mt-2 text-sm text-gray-400">
                    Choose a meaningful name for your habit. It will become a celestial body in your universe.
                  </p>
                </div>

                {/* Visual preview */}
                <div className="rounded-xl bg-gray-900/50 p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-300">Preview</span>
                    <span className="text-xs text-gray-500">New Habit</span>
                  </div>
                  <div className="flex items-center justify-center h-32">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse" />
                      <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 opacity-20 animate-ping" />
                    </div>
                  </div>
                </div>

                {/* Submission */}
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Habit'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};