import React, {useState, useEffect} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import {useOfflineStore} from '@store/offlineStore';
import {downloadManagerService} from '@services/downloadManager.service';

interface DownloadButtonProps {
  contentId: string;
  title: string;
  contentType: 'pdf' | 'video' | 'audio' | 'course';
  downloadUrl: string;
  thumbnailUrl?: string;
  size?: 'small' | 'medium' | 'large';
  onDownloadComplete?: () => void;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  contentId,
  title,
  contentType,
  downloadUrl,
  thumbnailUrl,
  size = 'medium',
  onDownloadComplete,
}) => {
  const {
    downloadedContent,
    activeDownloads,
    startDownload,
    pauseDownload,
    cancelDownload,
    deleteDownload,
  } = useOfflineStore();

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Check if content is downloaded
    const downloaded = downloadedContent.find(c => c.id === contentId);
    setIsDownloaded(!!downloaded);

    // Check if currently downloading
    const activeDownload = activeDownloads.find(d => d.contentId === contentId);
    if (activeDownload) {
      setIsDownloading(activeDownload.status === 'downloading');
      setDownloadProgress(activeDownload.progress);

      if (activeDownload.status === 'completed') {
        setIsDownloaded(true);
        setIsDownloading(false);
        setDownloadProgress(null);
        onDownloadComplete?.();
      }
    } else {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [downloadedContent, activeDownloads, contentId, onDownloadComplete]);

  const handleDownload = async () => {
    try {
      await startDownload({
        contentId,
        title,
        contentType,
        downloadUrl,
        thumbnailUrl,
      });
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handlePause = async () => {
    try {
      await pauseDownload(contentId);
    } catch (error) {
      console.error('Pause failed:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelDownload(contentId);
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDownload(contentId);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const buttonSize = size === 'small' ? 32 : size === 'large' ? 56 : 44;
  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  if (isDownloaded) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.downloadedButton, {width: buttonSize, height: buttonSize}]}
        onPress={handleDelete}
      >
        <Text style={[styles.icon, {fontSize: iconSize}]}>✓</Text>
      </TouchableOpacity>
    );
  }

  if (isDownloading && downloadProgress !== null) {
    return (
      <View style={[styles.button, styles.downloadingButton, {width: buttonSize, height: buttonSize}]}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, {width: `${downloadProgress}%`}]} />
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={[styles.icon, {fontSize: iconSize}]}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, styles.downloadButton, {width: buttonSize, height: buttonSize}]}
      onPress={handleDownload}
    >
      <Text style={[styles.icon, {fontSize: iconSize}]}>↓</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  downloadButton: {
    backgroundColor: '#007AFF',
  },
  downloadingButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    position: 'relative',
  },
  downloadedButton: {
    backgroundColor: '#34C759',
  },
  icon: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
