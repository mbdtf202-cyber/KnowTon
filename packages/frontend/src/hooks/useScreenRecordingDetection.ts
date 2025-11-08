import { useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

interface RecordingDetectionOptions {
  contentId: string;
  enabled?: boolean;
  onDetected?: (method: string, toolName?: string) => void;
}

interface RecordingAttempt {
  contentId: string;
  detectionMethod: 'api' | 'browser' | 'behavior' | 'tool';
  toolName?: string;
  severity: 'low' | 'medium' | 'high';
  deviceInfo?: any;
}

/**
 * Hook for detecting screen recording attempts
 */
export const useScreenRecordingDetection = ({
  contentId,
  enabled = true,
  onDetected,
}: RecordingDetectionOptions) => {
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const behaviorCheckRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Log recording attempt to backend
   */
  const logAttempt = useCallback(
    async (attempt: RecordingAttempt) => {
      try {
        await api.post('/screen-recording-prevention/log-attempt', attempt);
      } catch (error) {
        console.error('Failed to log recording attempt:', error);
      }
    },
    []
  );

  /**
   * Detect screen recording via Media Recorder API
   */
  const detectMediaRecorder = useCallback(() => {
    try {
      // Check if MediaRecorder is being used
      if (typeof MediaRecorder !== 'undefined') {
        const originalStart = MediaRecorder.prototype.start;
        MediaRecorder.prototype.start = function (...args) {
          console.warn('MediaRecorder.start() detected');
          
          logAttempt({
            contentId,
            detectionMethod: 'api',
            toolName: 'MediaRecorder',
            severity: 'high',
          });

          if (onDetected) {
            onDetected('api', 'MediaRecorder');
          }

          return originalStart.apply(this, args);
        };
      }
    } catch (error) {
      console.error('Error detecting MediaRecorder:', error);
    }
  }, [contentId, logAttempt, onDetected]);

  /**
   * Detect screen capture via getDisplayMedia API
   */
  const detectGetDisplayMedia = useCallback(() => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        
        navigator.mediaDevices.getDisplayMedia = function (...args) {
          console.warn('getDisplayMedia() detected');
          
          logAttempt({
            contentId,
            detectionMethod: 'api',
            toolName: 'getDisplayMedia',
            severity: 'high',
          });

          if (onDetected) {
            onDetected('api', 'getDisplayMedia');
          }

          return originalGetDisplayMedia.apply(this, args);
        };
      }
    } catch (error) {
      console.error('Error detecting getDisplayMedia:', error);
    }
  }, [contentId, logAttempt, onDetected]);

  /**
   * Detect browser extensions
   */
  const detectBrowserExtensions = useCallback(async () => {
    try {
      // Check for common recording extension indicators
      const suspiciousElements = [
        'screencastify-watermark',
        'loom-watermark',
        'nimbus-watermark',
        'screen-recorder-indicator',
      ];

      for (const elementId of suspiciousElements) {
        if (document.getElementById(elementId)) {
          const extensionName = elementId.split('-')[0];
          
          await logAttempt({
            contentId,
            detectionMethod: 'browser',
            toolName: extensionName,
            severity: 'medium',
          });

          if (onDetected) {
            onDetected('browser', extensionName);
          }
        }
      }
    } catch (error) {
      console.error('Error detecting browser extensions:', error);
    }
  }, [contentId, logAttempt, onDetected]);

  /**
   * Detect suspicious behavior patterns
   */
  const detectSuspiciousBehavior = useCallback(() => {
    try {
      // Check for rapid screenshot attempts (Ctrl+Shift+S, Print Screen, etc.)
      let screenshotAttempts = 0;
      const resetTime = 5000; // Reset counter after 5 seconds

      const handleKeyDown = (e: KeyboardEvent) => {
        // Detect Print Screen
        if (e.key === 'PrintScreen') {
          screenshotAttempts++;
        }

        // Detect Ctrl+Shift+S (common screenshot shortcut)
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
          screenshotAttempts++;
        }

        // Detect Cmd+Shift+4 (Mac screenshot)
        if (e.metaKey && e.shiftKey && e.key === '4') {
          screenshotAttempts++;
        }

        if (screenshotAttempts >= 3) {
          logAttempt({
            contentId,
            detectionMethod: 'behavior',
            toolName: 'rapid-screenshots',
            severity: 'medium',
          });

          if (onDetected) {
            onDetected('behavior', 'rapid-screenshots');
          }

          screenshotAttempts = 0;
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Reset counter periodically
      const resetInterval = setInterval(() => {
        screenshotAttempts = 0;
      }, resetTime);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        clearInterval(resetInterval);
      };
    } catch (error) {
      console.error('Error detecting suspicious behavior:', error);
    }
  }, [contentId, logAttempt, onDetected]);

  /**
   * Detect visibility changes (tab switching, minimizing)
   */
  const detectVisibilityChanges = useCallback(() => {
    try {
      let hiddenCount = 0;
      const resetTime = 10000; // Reset counter after 10 seconds

      const handleVisibilityChange = () => {
        if (document.hidden) {
          hiddenCount++;

          // If user switches tabs/minimizes frequently, it might indicate recording
          if (hiddenCount >= 5) {
            logAttempt({
              contentId,
              detectionMethod: 'behavior',
              toolName: 'frequent-tab-switching',
              severity: 'low',
            });

            if (onDetected) {
              onDetected('behavior', 'frequent-tab-switching');
            }

            hiddenCount = 0;
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Reset counter periodically
      const resetInterval = setInterval(() => {
        hiddenCount = 0;
      }, resetTime);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(resetInterval);
      };
    } catch (error) {
      console.error('Error detecting visibility changes:', error);
    }
  }, [contentId, logAttempt, onDetected]);

  /**
   * Detect devtools (potential for recording via console)
   */
  const detectDevTools = useCallback(() => {
    try {
      const threshold = 160;
      let devtoolsOpen = false;

      const checkDevTools = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const isOpen = widthThreshold || heightThreshold;

        if (isOpen && !devtoolsOpen) {
          devtoolsOpen = true;
          
          logAttempt({
            contentId,
            detectionMethod: 'browser',
            toolName: 'devtools',
            severity: 'low',
          });

          if (onDetected) {
            onDetected('browser', 'devtools');
          }
        } else if (!isOpen) {
          devtoolsOpen = false;
        }
      };

      const interval = setInterval(checkDevTools, 1000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error('Error detecting devtools:', error);
    }
  }, [contentId, logAttempt, onDetected]);

  /**
   * Initialize all detection methods
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Set up API interception
    detectMediaRecorder();
    detectGetDisplayMedia();

    // Set up periodic checks
    detectionIntervalRef.current = setInterval(() => {
      detectBrowserExtensions();
    }, 10000); // Check every 10 seconds

    // Set up behavior monitoring
    const cleanupBehavior = detectSuspiciousBehavior();
    const cleanupVisibility = detectVisibilityChanges();
    const cleanupDevTools = detectDevTools();

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (cleanupBehavior) cleanupBehavior();
      if (cleanupVisibility) cleanupVisibility();
      if (cleanupDevTools) cleanupDevTools();
    };
  }, [
    enabled,
    detectMediaRecorder,
    detectGetDisplayMedia,
    detectBrowserExtensions,
    detectSuspiciousBehavior,
    detectVisibilityChanges,
    detectDevTools,
  ]);

  return {
    logAttempt,
  };
};

export default useScreenRecordingDetection;
