import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Sound from 'react-native-sound';
import Slider from '@react-native-community/slider';
import {COLORS, SPACING, FONT_SIZES} from '@utils/constants';

interface AudioPlayerProps {
  uri: string;
  title?: string;
  artist?: string;
  onEnd?: () => void;
  onProgress?: (progress: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  uri,
  title,
  artist,
  onEnd,
  onProgress,
}) => {
  const soundRef = useRef<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize sound
    Sound.setCategory('Playback');
    
    soundRef.current = new Sound(uri, '', (error) => {
      if (error) {
        console.error('Failed to load sound', error);
        setLoading(false);
        return;
      }
      
      setDuration(soundRef.current?.getDuration() || 0);
      setLoading(false);
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [uri]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startProgressTracking = () => {
    intervalRef.current = setInterval(() => {
      soundRef.current?.getCurrentTime((seconds) => {
        setCurrentTime(seconds);
        if (onProgress && duration > 0) {
          onProgress((seconds / duration) * 100);
        }
      });
    }, 100);
  };

  const stopProgressTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const togglePlayPause = () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
      stopProgressTracking();
      setIsPlaying(false);
    } else {
      soundRef.current.play((success) => {
        if (success) {
          stopProgressTracking();
          setIsPlaying(false);
          setCurrentTime(0);
          if (onEnd) {
            onEnd();
          }
        }
      });
      startProgressTracking();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number) => {
    if (!soundRef.current) return;
    soundRef.current.setCurrentTime(value);
    setCurrentTime(value);
  };

  const skipForward = () => {
    const newTime = Math.min(currentTime + 15, duration);
    handleSeek(newTime);
  };

  const skipBackward = () => {
    const newTime = Math.max(currentTime - 15, 0);
    handleSeek(newTime);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(title || artist) && (
        <View style={styles.infoContainer}>
          {title && <Text style={styles.title}>{title}</Text>}
          {artist && <Text style={styles.artist}>{artist}</Text>}
        </View>
      )}

      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={skipBackward}>
          <Text style={styles.controlButtonText}>⏪ 15s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
          <Text style={styles.playButtonText}>{isPlaying ? '⏸️' : '▶️'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={skipForward}>
          <Text style={styles.controlButtonText}>15s ⏩</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  artist: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  slider: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    minWidth: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  controlButton: {
    padding: SPACING.sm,
  },
  controlButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 28,
  },
});
