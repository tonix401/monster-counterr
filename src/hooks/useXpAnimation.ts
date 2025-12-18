import { useEffect, useState, useCallback } from 'react';
import { ANIMATION_DURATION } from '../constants';

export const useXpAnimation = (targetXp: number) => {
  const [displayXp, setDisplayXp] = useState(targetXp);

  const animateXpCounter = useCallback(
    (oldXp: number, newXp: number, duration: number = ANIMATION_DURATION.XP_UPDATE) => {
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.round(oldXp + (newXp - oldXp) * progress);
        setDisplayXp(current);
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    },
    []
  );

  useEffect(() => {
    if (targetXp !== displayXp) {
      animateXpCounter(displayXp, targetXp);
    }
  }, [targetXp, displayXp, animateXpCounter]);

  return { displayXp, animateXpCounter };
};
