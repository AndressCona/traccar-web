import React, { useEffect, useState } from 'react';

const AnimatedNumber = ({ value, duration = 500 }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTime;
    const startValue = displayValue;
    const endValue = value;

    if (startValue === endValue) return;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const t = Math.min(progress / duration, 1);
      
      // easeOutExpo function for smooth deceleration
      const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      
      const current = startValue + (endValue - startValue) * ease;
      setDisplayValue(Math.round(current));

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [value, duration]); // Intentionally leaving displayValue out of dependencies

  return <>{displayValue}</>;
};

export default AnimatedNumber;
