import { useEffect } from 'react';
import { useState } from 'react';

/**
 * Custom hook to get the current window dimensions.
 *
 * This hook listens for window resize events and updates the state with the new dimensions.
 *
 * @returns {Object} An object containing:
 * - `width` {number} - The current width of the window.
 * - `height` {number} - The current height of the window.
 *
 * @example
 * const { width, height } = useWindowDimensions();
 *
 */
const useWindowDimensions = () => {
  const getSize = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth <= 768,
  });
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
    isMobile: false,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(getSize());
    };

    setWindowSize(getSize());

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
};

export default useWindowDimensions;
