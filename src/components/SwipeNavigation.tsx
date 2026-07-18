import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SWIPE_THRESHOLD = 80; // Minimum distance to trigger back navigation
const EDGE_THRESHOLD = 40;  // Area from the left edge where swipe is active

export default function SwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger if starting near the left edge
      if (touch.clientX <= EDGE_THRESHOLD) {
        startX.current = touch.clientX;
        startY.current = touch.clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = Math.abs(touch.clientY - startY.current);

      // If they are swiping more vertically than horizontally, cancel
      if (deltaY > Math.abs(deltaX)) {
        startX.current = null;
        startY.current = null;
        return;
      }

      // Prevent native browser behavior if we are handling a potential back swipe
      if (deltaX > 0) {
        // Optional: preventDefault() could be tricky here as it might block scrolling
        // But since we checked EDGE_THRESHOLD and vertical scroll, it's safer
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startX.current === null) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX.current;

      // Don't navigate back if we're already at the root
      const isRoot = location.pathname === '/';

      if (deltaX > SWIPE_THRESHOLD && !isRoot) {
        navigate(-1);
      }

      startX.current = null;
      startY.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate, location.pathname]);

  return null; // This component doesn't render anything
}
