import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Video, {VideoRef} from 'react-native-video';
import Slider from '@react-native-community/slider';
import {COLORS, SPACING, FONT_SIZES} from '@utils/constants';

interface VideoPlayerProps {
  uri: string;
  onEnd?: () => void;
  onProgress?: (progress: number) => void;
}

const {width} = Dimensions.get('window');

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  onEnd,
  onProgress,
}) => {
  const videoRef = useRef<VideoRef>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgress = (data: any) => {
    setCurrentTime(data.currentTime);
    if (onProgress) {
      onProgress((data.currentTime / duration) * 100);
    }
  };

  const handleLoad = (data: any) => {
    setDuration(data.duration);
    setLoading(false);
  };

  const handleSeek = (value: number) => {
    videoRef.current?.seek(value);
    setCurrentTime(value);
  };

  const togglePlayPause = () => {
    setPaused(!paused);
  };

  const handleVideoPress = () => {
    setShowControls(true);
    setTimeout(() => {
      if (!paused) {
        setShowControls(false);
      }
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={handleVideoPress}>
        <Video
          ref={videoRef}
          source={{uri}}
          style={styles.video}
          paused={paused}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onEnd={onEnd}
          resizeMode="contain"
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}

        {showControls && !loading && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayPause}>
              <Text style={styles.playButtonText}>{paused ? '▶️' : '⏸️'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    height: width * 0.5625, // 16:9 aspect ratio
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#000',
  },
  slider: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  timeText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.sm,
    minWidth: 40,
  },
});
