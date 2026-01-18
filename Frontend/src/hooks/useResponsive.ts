// src/hooks/useResponsive.ts
import { useEffect, useState } from 'react';
import { config } from '../config/environment';

export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(config.IS_MOBILE());
  const [isTablet, setIsTablet] = useState(config.IS_TABLET());
  const [isDesktop, setIsDesktop] = useState(config.IS_DESKTOP());
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setIsMobile(config.IS_MOBILE());
      setIsTablet(config.IS_TABLET());
      setIsDesktop(config.IS_DESKTOP());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    windowSize,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  };
};