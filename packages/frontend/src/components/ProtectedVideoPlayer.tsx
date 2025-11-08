import React, { useEffect, useState, useRef } from 'react';
import { DynamicWatermarkOverlay } from './DynamicWatermarkOverlay';
import { useScreenRecordingDetection } from '../hooks/useScreenRecordingDetection';
import { api } from '../services/api';

interface ProtectedVideoPlayerProps {
  contentId: string;
  videoUrl: string;
  userId: string;
  autoPlay?: boolean;
  controls?: boolean;
  onRecordingDetected?: (method: string, toolName?: string) => void;
}

/**
 * Protected Video Player with Dynamic Watermark and Recording Detection
 */
export const ProtectedVideoPlayer: React.FC<ProtectedVideoPlayerProps> = ({
  contentId,
  videoUrl,
  userId,
  autoPlay = false,
  controls = true,
  onRecordingDetected,
}) => {
  const [watermarkConfig, setWatermarkConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionId = useRef(Math.random().toString(36).substring(7));

  // Initialize recording detection
  useScreenRecordingDetection({
    contentId,
    enabled: true,
    onDetected: (method, toolName) => {
      console.warn('Recording detected:', method, toolName);
      
      // Show warning to user
      alert(
        'Screen recording detected. This content is protected and recording is not allowed. ' +
        'Continued attempts may result in access restrictions.'
      );

      if (onRecordingDetected) {
        onRecordingDetected(method, toolName);
      }
    },
  });

  /**
   * Load watermark configuration
   */
  useEffect(() => {
    const loadWatermarkConfig = async () => {
      try {
        setIsLoading(true);

        // Check if user is banned
        const banResponse = await api.get(
          `/screen-recording-prevention/ban-status/${contentId}`
        );

        if (banResponse.data.data.isBanned) {
          setIsBanned(true);
          setError('Access temporarily restricted due to security violations');
          setIsLoading(false);
          return;
        }

        // Get watermark configuration
        const response = await api.post('/screen-recording-prevention/watermark', {
          contentId,
          sessionId: sessionId.current,
        });

        setWatermarkConfig(response.data.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load watermark config:', err);
        setError('Failed to load video protection');
        setIsLoading(false);
      }
    };

    loadWatermarkConfig();
  }, [contentId]);

  /**
   * Prevent right-click context menu
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  /**
   * Prevent drag and drop
   */
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  /**
   * Disable picture-in-picture
   */
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.disablePictureInPicture = true;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-white">Loading protected content...</div>
      </div>
    );
  }

  if (error || isBanned) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <div className="text-white">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full bg-black rounded-lg overflow-hidden"
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      style={{ userSelect: 'none' }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        controls={controls}
        autoPlay={autoPlay}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        className="w-full h-full"
        style={{
          pointerEvents: 'auto',
        }}
      />

      {watermarkConfig && (
        <DynamicWatermarkOverlay
          text={watermarkConfig.text}
          updateInterval={watermarkConfig.updateInterval}
          positions={watermarkConfig.positions}
          opacity={watermarkConfig.opacity}
          fontSize={watermarkConfig.fontSize}
          color={watermarkConfig.color}
          enabled={true}
        />
      )}

      {/* Additional overlay to prevent screenshots */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'transparent',
          zIndex: 9998,
        }}
      />
    </div>
  );
};

export default ProtectedVideoPlayer;
