/**
 * Responsive Utility Hooks
 * 
 * Features:
 * - Detect screen size
 * - Breakpoint-based rendering
 * - Orientation detection
 * - Touch device detection
 */

import { useState, useEffect } from 'react';

/**
 * Get current breakpoint
 * @returns {string} 'mobile' | 'tablet' | 'desktop'
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('desktop');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);

    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};

/**
 * Check if mobile device
 * @returns {boolean}
 */
export const useIsMobile = () => {
  const breakpoint = useBreakpoint();
  return breakpoint === 'mobile';
};

/**
 * Check if tablet device
 * @returns {boolean}
 */
export const useIsTablet = () => {
  const breakpoint = useBreakpoint();
  return breakpoint === 'tablet';
};

/**
 * Check if desktop
 * @returns {boolean}
 */
export const useIsDesktop = () => {
  const breakpoint = useBreakpoint();
  return breakpoint === 'desktop';
};

/**
 * Get screen dimensions
 * @returns {Object} {width, height}
 */
export const useScreenSize = () => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
};

/**
 * Detect touch device
 * @returns {boolean}
 */
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
};

/**
 * Get orientation
 * @returns {string} 'portrait' | 'landscape'
 */
export const useOrientation = () => {
  const [orientation, setOrientation] = useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
};

/**
 * Media query hook
 * @param {string} query - Media query string
 * @returns {boolean}
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const updateMatch = () => setMatches(media.matches);
    updateMatch();

    media.addEventListener('change', updateMatch);
    return () => media.removeEventListener('change', updateMatch);
  }, [query]);

  return matches;
};

export default {
  useBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useScreenSize,
  useIsTouchDevice,
  useOrientation,
  useMediaQuery
};

