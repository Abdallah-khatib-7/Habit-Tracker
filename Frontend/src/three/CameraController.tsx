// src/three/CameraController.tsx
import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';
import { config } from '../config/environment';
import { useWorld } from '../context/WorldContext';
import { useScroll } from '../hooks/useScroll';
import { TOUCH } from 'three/src/Three.js';
 
export const CameraController: React.FC = () => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const { currentFocus, viewMode, habits } = useWorld();
  const { scrollProgress } = useScroll();
  const isMobile = config.IS_MOBILE();

  // Handle scroll-based camera movement
  useFrame(() => {
    if (viewMode === 'overview' && !currentFocus) {
      const targetY = 5 + scrollProgress * 5;
      const targetZ = 15 - scrollProgress * 3;
      
      gsap.to(camera.position, {
        y: targetY,
        z: targetZ,
        duration: config.CAMERA_TRANSITION_SPEED,
        ease: "power2.out"
      });
    }
  });

  // Handle habit focus
  useEffect(() => {
    if (currentFocus && habits.length > 0) {
      const habit = habits.find(h => h.id === currentFocus);
      if (habit) {
        const [x, y, z] = habit.position;
        
        gsap.to(camera.position, {
          x: x + 3,
          y: y + 2,
          z: z + 5,
          duration: 1,
          ease: "power2.out"
        });
        
        if (controlsRef.current) {
          gsap.to(controlsRef.current.target, {
            x,
            y,
            z,
            duration: 1,
            ease: "power2.out"
          });
        }
      }
    } else {
      // Return to overview
      gsap.to(camera.position, {
        x: 0,
        y: 5,
        z: 15,
        duration: 1,
        ease: "power2.out"
      });
      
      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          ease: "power2.out"
        });
      }
    }
  }, [currentFocus, habits, camera.position]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableZoom={!isMobile}
      enablePan={!isMobile}
      enableRotate={true}
      maxPolarAngle={Math.PI / 1.5}
      minPolarAngle={Math.PI / 3}
      maxDistance={50}
      minDistance={3}
      zoomSpeed={0.5}
      rotateSpeed={0.5}
      panSpeed={0.5}
      target={[0, 0, 0]}
      domElement={gl.domElement}
      touches={{
        ONE: isMobile ? TOUCH.ROTATE : undefined,
        TWO: isMobile ? TOUCH.DOLLY_PAN : undefined,
        
      }}
    />
  );
};