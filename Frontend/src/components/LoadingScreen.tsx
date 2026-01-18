// src/components/LoadingScreen.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { config } from '../config/environment';

export const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 20;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsVisible(false), 500);
          return 100;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      >
        <div className="relative w-64">
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-spin" />
          
          {/* Progress ring */}
          <div className="relative rounded-full p-1 bg-black">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeDasharray={`${progress * 2.83} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={config.COLORS.primary} />
                  <stop offset="100%" stopColor={config.COLORS.secondary} />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-2"
              >
                <Loader2 className="w-8 h-8 text-white" />
              </motion.div>
              <p className="text-sm font-medium text-white/80">
                Initializing world...
              </p>
              <p className="text-xs text-white/60 mt-1">
                {Math.round(progress)}%
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};