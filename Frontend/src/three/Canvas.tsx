// src/three/Canvas.tsx
import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas as ThreeCanvas } from '@react-three/fiber';
import { Perf } from 'r3f-perf';
import { config } from '../config/environment';
import { Scene } from './Scene';
import { LoadingScreen } from '../components/LoadingScreen';

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = config.IS_MOBILE();
 
  return (
    <div className="fixed inset-0 bg-black">
      <ThreeCanvas
        ref={canvasRef}
        camera={{
          fov: isMobile ? 65 : 75,
          position: [0, 5, 15],
          near: 0.1,
          far: 1000
        }}
        dpr={[1, config.QUALITY === 'high' ? 2 : 1.5]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}
        shadows={config.QUALITY === 'high' && !isMobile}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          touchAction: 'none'
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        
        {import.meta.env.DEV && config.QUALITY === 'high' && (
          <Perf position="top-left" />
        )}
      </ThreeCanvas>
      
      <LoadingScreen />
    </div>
  );
};