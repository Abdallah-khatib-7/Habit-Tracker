// src/config/environment.ts
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  ENVIRONMENT: import.meta.env.MODE,
  IS_MOBILE: () => window.innerWidth < 768,
  IS_TABLET: () => window.innerWidth >= 768 && window.innerWidth < 1024,
  IS_DESKTOP: () => window.innerWidth >= 1024,
  
  // Performance settings
  QUALITY: import.meta.env.MODE === 'development' ? 'high' : 'adaptive',
  MAX_HABIT_NODES: 50,
  MOBILE_MAX_NODES: 20,
  
  // Animation
  CAMERA_TRANSITION_SPEED: 0.8,
  HOVER_ANIMATION_DURATION: 0.3,
  
  // Visual
  COLORS: {
    primary: '#00D4FF',
    secondary: '#FF6B9D',
    success: '#00FF9D',
    warning: '#FFD166',
    danger: '#FF4D6D',
    background: '#0A0A14',
    surface: '#1A1A2E',
    text: '#F0F0F5'
  }
} as const;