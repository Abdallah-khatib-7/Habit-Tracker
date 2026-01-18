// src/three/HabitNode.tsx
import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, Color } from 'three';
import { Text, Float, Billboard } from '@react-three/drei';
import gsap from 'gsap';
import type { HabitNodeData } from '../types';
import { useWorld } from '../context/WorldContext';

interface HabitNodeProps { 
  data: HabitNodeData;
  onClick: () => void;
}

export const HabitNode: React.FC<HabitNodeProps> = ({ data, onClick }) => {
  const meshRef = useRef<Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { currentFocus } = useWorld();
  
  const isFocused = currentFocus === data.id;
  
  // Calculate visual properties
  const { color, emissiveIntensity, scale } = useMemo(() => {
    const hue = (data.id * 137.508) % 360; // Golden angle distribution
    const baseColor = new Color(`hsl(${hue}, 70%, 60%)`);
    
    // Adjust color based on completion rate
    const saturation = 30 + data.energy * 40;
    const lightness = 30 + data.energy * 20;
    baseColor.setHSL(hue / 360, saturation / 100, lightness / 100);
    
    return {
      color: baseColor,
      emissiveIntensity: data.glow * 0.5,
      scale: data.scale * (isHovered ? 1.2 : 1) * (isFocused ? 1.5 : 1)
    };
  }, [data, isHovered, isFocused]);

  // Animation on click
  const handleClick = () => {
    if (meshRef.current) {
      gsap.to(meshRef.current.scale, {
        x: scale * 1.3,
        y: scale * 1.3,
        z: scale * 1.3,
        duration: 0.2,
        yoyo: true,
        repeat: 1
      });
    }
    onClick();
  };

  // Update rotation and pulse
  useFrame((state) => {
    if (meshRef.current) {
      // Rotate slowly
      meshRef.current.rotation.y += data.rotationSpeed * 0.01;
      
      // Pulsing effect based on streak
      const pulse = Math.sin(state.clock.elapsedTime * 2) * data.pulseIntensity * 0.1 + 1;
      meshRef.current.scale.setScalar(scale * pulse);
      
      // Hover animation
      if (isHovered && !isFocused) {
        meshRef.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      }
    }
  });

  return (
    <group position={data.position}>
      <Float
        speed={2}
        rotationIntensity={1}
        floatIntensity={data.stability * 0.5}
      >
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[scale, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            roughness={0.1 + (1 - data.stability) * 0.3}
            metalness={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>
      
      {/* Glow effect */}
      {data.glow > 0.3 && (
        <mesh position={[0, 0, 0]} scale={scale * 2}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={data.glow * 0.1}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Name label */}
      <Billboard>
        <Text
          position={[0, scale + 0.5, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
          visible={isHovered || isFocused}
        >
          {data.name}
          {data.current_streak && data.current_streak > 0 && (
            <Text
              position={[0, -0.2, 0]}
              fontSize={0.15}
              color="#00FF9D"
            >
              🔥 {data.current_streak} days
            </Text>
          )}
        </Text>
      </Billboard>
      
      {/* Energy rings for completed habits */}
      {data.energy > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -scale * 0.5, 0]}>
          <ringGeometry args={[scale * 0.8, scale * 0.9, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={data.energy * 0.3}
            side={2}
          />
        </mesh>
      )}
    </group>
  );
};