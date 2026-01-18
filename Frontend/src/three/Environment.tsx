// src/three/Environment.tsx
import React, { useMemo } from 'react';
import { Sky, Cloud, Stars, Sparkles } from '@react-three/drei';
import { config } from '../config/environment';
import { useWorld } from '../context/WorldContext';

export const Environment: React.FC = () => {
  const { timeOfDay, habits } = useWorld();
  const isMobile = config.IS_MOBILE();
   
  const totalEnergy = useMemo(() => 
    habits.reduce((sum, habit) => sum + habit.energy, 0), 
    [habits]
  );
  
  // Adjust sky based on total energy and time of day
  const skyConfig = useMemo(() => {
    const baseTurbidity = 10 - totalEnergy * 2;
    const baseRayleigh = 1 + totalEnergy;
    
    switch (timeOfDay) {
      case 'night':
        return {
          turbidity: baseTurbidity,
          rayleigh: baseRayleigh * 0.5,
          mieCoefficient: 0.005,
          mieDirectionalG: 0.7,
          inclination: 0.49,
          azimuth: 0.25,
          distance: 1000
        };
      case 'dawn':
        return {
          turbidity: baseTurbidity,
          rayleigh: baseRayleigh * 1.5,
          mieCoefficient: 0.005,
          mieDirectionalG: 0.7,
          inclination: 0.6,
          azimuth: 0.25,
          distance: 1000
        };
      default: // day
        return {
          turbidity: baseTurbidity,
          rayleigh: baseRayleigh * 2,
          mieCoefficient: 0.005,
          mieDirectionalG: 0.7,
          inclination: 0.6,
          azimuth: 0.25,
          distance: 1000
        };
    }
  }, [timeOfDay, totalEnergy]);

  return (
    <>
      <Sky {...skyConfig} />
      
      {!isMobile && timeOfDay === 'night' && (
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
      )}
      
      {/* Interactive particles based on habit energy */}
      {totalEnergy > 0 && (
        <Sparkles
          count={Math.floor(totalEnergy * 50)}
          size={1 + totalEnergy}
          speed={0.3 + totalEnergy * 0.2}
          opacity={0.3 + totalEnergy * 0.2}
          color="#ffffff"
          scale={20}
        />
      )}
      
      {/* Floating clouds */}
      {!isMobile && (
        <Cloud
          position={[-15, 10, -10]}
          speed={0.2}
          opacity={0.3}
          segments={20}
        />
      )}
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
    </>
  );
};