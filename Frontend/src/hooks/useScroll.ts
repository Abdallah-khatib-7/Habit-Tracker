// src/hooks/useScroll.ts
import { useEffect, useState } from 'react';
import Lenis from '@studio-freight/lenis';

export const useScroll = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  gestureOrientation: "vertical",
  lerp: 0.1,

  // Touch handling
  syncTouch: true,
  touchInertiaMultiplier: 35,

  // Sensitivity
  touchMultiplier: 2,

  infinite: false,
});


    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    lenis.on('scroll', (e: any) => {
      const progress = e.progress;
      setScrollProgress(progress);
      setIsScrolling(e.direction !== 0);
    });

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return { scrollProgress, isScrolling };
};