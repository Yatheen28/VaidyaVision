import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ConfidenceGauge({ value = 0, size = 180 }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(value * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  const percentage = Math.round(animatedValue * 100);
  const strokeDashoffset = circumference * (1 - animatedValue);

  const getColor = (val) => {
    if (val >= 0.8) return '#52B788';
    if (val >= 0.6) return '#75daa8';
    if (val >= 0.4) return '#F4A261';
    return '#ff6b6b';
  };

  const getTrailColor = (val) => {
    if (val >= 0.8) return 'rgba(82,183,136,0.15)';
    if (val >= 0.6) return 'rgba(117,218,168,0.12)';
    if (val >= 0.4) return 'rgba(244,162,97,0.12)';
    return 'rgba(255,107,107,0.12)';
  };

  const color = getColor(animatedValue);
  const trailColor = getTrailColor(animatedValue);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={trailColor} strokeWidth="10" strokeLinecap="round"
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke 0.3s ease', filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold font-display" style={{ color }}>{percentage}%</span>
        <span className="text-xs text-ink-muted mt-1">Confidence</span>
      </div>
    </motion.div>
  );
}
