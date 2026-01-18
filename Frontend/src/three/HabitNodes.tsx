// src/three/HabitNodes.tsx
import React from 'react';
import { useWorld } from '../context/WorldContext';
import { HabitNode } from './HabitNode';
import { config } from '../config/environment';

export const HabitNodes: React.FC = () => {
  const { habits, focusHabit, currentFocus } = useWorld();
  const isMobile = config.IS_MOBILE();
  const maxNodes = isMobile ? config.MOBILE_MAX_NODES : config.MAX_HABIT_NODES;
  
  const visibleHabits = habits.slice(0, maxNodes);
   
  const handleNodeClick = (id: number) => {
    if (currentFocus === id) {
      focusHabit(null);
    } else {
      focusHabit(id);
    }
  };

  return (
    <group>
      {visibleHabits.map((habit) => (
        <HabitNode
          key={habit.id}
          data={habit}
          onClick={() => handleNodeClick(habit.id)}
        />
      ))}
    </group>
  );
};