// src/three/Scene.tsx
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { config } from '../config/environment';
import  { CameraController } from './CameraController';
import { Environment } from './Environment';
import  { HabitNodes } from './HabitNodes';
import { Lights } from './Lights';
import { useWorld } from '../context/WorldContext';

export const Scene: React.FC = () => {
  const { gl, scene } = useThree();
  const { habits, isLoaded } = useWorld();
  const isMobile = config.IS_MOBILE();

  useEffect(() => {
    // Set scene background
    scene.background = null;
     
    // Performance optimization
    gl.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  }, [gl, scene, isMobile]);

  return (
    <>
      <CameraController />
      <Lights />
      <Environment />
      
      {isLoaded && <HabitNodes />}
      
      {/* Post-processing effects */}
      {config.QUALITY === 'high' && !isMobile && (
        <EffectComposer multisampling={4}>
          <Bloom
            intensity={0.5}
            kernelSize={KernelSize.LARGE}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.025}
          />
          <Vignette
            eskil={false}
            offset={0.3}
            darkness={0.5}
            blendFunction={BlendFunction.NORMAL}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.002, 0.002]}
          />
        </EffectComposer>
      )}
    </>
  );
};