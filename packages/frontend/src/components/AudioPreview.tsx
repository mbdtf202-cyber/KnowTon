import React, { useRef, useState, useEffect } from 'react';

interface AudioPreviewProps {
  uploadId: string;
  title?: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  className?: string;
}

export const AudioPreview: React.FC<AudioPreviewProps> = ({
  uploadId,
  title = 'Audio Preview',
  onPlayStart,
  onPlayEnd,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = `/api/v1/audio-preview/${uploadId}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStart?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayEnd?.();
    };

    const handleError = () => {
      setError('Failed to load audio preview');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onPlayStart, onPlayEnd]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={`audio-preview-error ${className}`}>
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`audio-preview ${className}`}>
      <audio ref={audioRef} src={previewUrl} preload="metadata" />
      
      <div className="audio-preview-header">
        <h3 className="audio-preview-title">{title}</h3>
        <span className="audio-preview-badge">Preview (30s)</span>
      </div>

      <div className="audio-preview-controls">
        {/* Play/Pause Button */}
        <button
          className="audio-preview-play-button"
          onClick={togglePlay}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <span className="loading-spinner">⏳</span>
          ) : isPlaying ? (
            <span className="pause-icon">⏸</span>
          ) : (
            <span className="play-icon">▶</span>
          )}
        </button>

        {/* Time Display */}
        <div className="audio-preview-time">
          <span>{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress Bar */}
        <div className="audio-preview-progress-container">
          <input
            type="range"
            className="audio-preview-progress"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            disabled={isLoading}
            aria-label="Seek"
          />
          <div
            className="audio-preview-progress-fill"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Volume Controls */}
        <div className="audio-preview-volume">
          <button
            className="audio-preview-volume-button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <span className="volume-muted-icon">🔇</span>
            ) : volume > 0.5 ? (
              <span className="volume-high-icon">🔊</span>
            ) : (
              <span className="volume-low-icon">🔉</span>
            )}
          </button>
          <input
            type="range"
            className="audio-preview-volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </div>
      </div>

      <div className="audio-preview-watermark-notice">
        <span className="watermark-icon">🔒</span>
        <span>This preview includes audio watermarks for protection</span>
      </div>

      <style jsx>{`
        .audio-preview {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 24px;
          color: white;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .audio-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .audio-preview-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .audio-preview-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .audio-preview-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .audio-preview-play-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
          flex-shrink: 0;
        }

        .audio-preview-play-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .audio-preview-play-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .audio-preview-time {
          display: flex;
          gap: 4px;
          font-size: 14px;
          font-weight: 500;
          min-width: 90px;
          flex-shrink: 0;
        }

        .time-separator {
          opacity: 0.7;
        }

        .audio-preview-progress-container {
          flex: 1;
          position: relative;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }

        .audio-preview-progress {
          position: absolute;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          z-index: 2;
        }

        .audio-preview-progress-fill {
          position: absolute;
          height: 100%;
          background: white;
          border-radius: 3px;
          transition: width 0.1s linear;
          pointer-events: none;
        }

        .audio-preview-volume {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .audio-preview-volume-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .audio-preview-volume-button:hover {
          transform: scale(1.1);
        }

        .audio-preview-volume-slider {
          width: 80px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          outline: none;
          -webkit-appearance: none;
        }

        .audio-preview-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }

        .audio-preview-volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }

        .audio-preview-watermark-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          opacity: 0.8;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }

        .watermark-icon {
          font-size: 14px;
        }

        .audio-preview-error {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          color: #c33;
        }

        .error-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .audio-preview {
            padding: 16px;
          }

          .audio-preview-controls {
            flex-wrap: wrap;
          }

          .audio-preview-progress-container {
            order: 3;
            width: 100%;
            margin-top: 12px;
          }

          .audio-preview-volume-slider {
            width: 60px;
          }
        }
      `}</style>
    </div>
  );
};
