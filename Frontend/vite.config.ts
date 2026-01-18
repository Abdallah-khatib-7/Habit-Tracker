// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three', '@react-three/fiber', '@react-three/drei'],
          'animation': ['gsap', 'framer-motion'],
          'utils': ['date-fns', 'zod', 'jwt-decode'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});