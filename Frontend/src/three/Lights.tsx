// src/three/Lights.tsx
import React from 'react';
import { config } from '../config/environment';
import { useWorld } from '../context/WorldContext';

export const Lights: React.FC = () => {
  const { habits, timeOfDay } = useWorld();
  const isMobile = config.IS_MOBILE();
  
  // Calculate total energy for dynamic lighting
  const totalEnergy = habits.reduce((sum, habit) => sum + habit.energy, 0);
  const ambientIntensity = 0.1 + totalEnergy * 0.1;
  const directionalIntensity = timeOfDay === 'night' ? 0.5 : 1.0;

  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight 
        intensity={ambientIntensity} 
        color="#ffffff"
      />
       
      {/* Main directional light (sun/moon) */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={directionalIntensity}
        castShadow={!isMobile}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Fill light */}
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.3}
        color="#0066ff"
      />
      
      {/* Back light */}
      <directionalLight
        position={[0, 5, -10]}
        intensity={0.2}
        color="#ff3366"
      />
      
      {/* Point lights from habit nodes */}
      {habits.slice(0, isMobile ? 5 : 10).map((habit) => (
        <pointLight
          key={`light-${habit.id}`}
          position={habit.position}
          intensity={habit.energy * 0.5}
          distance={10}
          decay={2}
          color="#ffffff"
        />
      ))}
    </>
  );
};