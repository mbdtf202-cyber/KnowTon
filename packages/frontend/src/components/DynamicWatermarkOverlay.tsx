import React, { useEffect, useState, useRef } from 'react';

interface DynamicWatermarkOverlayProps {
  text: string;
  updateInterval?: number;
  positions?: Array<{ x: number; y: number }>;
  opacity?: number;
  fontSize?: number;
  color?: string;
  enabled?: boolean;
}

/**
 * Dynamic Watermark Overlay Component
 * Displays a moving watermark overlay during content playback to prevent screen recording
 */
export const DynamicWatermarkOverlay: React.FC<DynamicWatermarkOverlayProps> = ({
  text,
  updateInterval = 5000,
  positions = [],
  opacity = 0.3,
  fontSize = 14,
  color = '#FFFFFF',
  enabled = true,
}) => {
  const [currentPosition, setCurrentPosition] = useState({ x: 50, y: 50 });
  const [positionIndex, setPositionIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || positions.length === 0) {
      return;
    }

    // Update position at intervals
    intervalRef.current = setInterval(() => {
      setPositionIndex((prev) => {
        const next = (prev + 1) % positions.length;
        setCurrentPosition(positions[next]);
        return next;
      });
    }, updateInterval);

    // Set initial position
    setCurrentPosition(positions[0]);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, positions, updateInterval]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: `${currentPosition.y}%`,
        left: `${currentPosition.x}%`,
        transform: 'translate(-50%, -50%)',
        color,
        fontSize: `${fontSize}px`,
        opacity,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 9999,
        transition: 'all 1s ease-in-out',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

export default DynamicWatermarkOverlay;
