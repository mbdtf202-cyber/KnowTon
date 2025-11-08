import React, {useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import {useOfflineStore} from '@store/offlineStore';
import {CachedContent} from '@services/offlineStorage.service';

export const DownloadsScreen: React.FC = () => {
  const {
    downloadedContent,
    activeDownloads,
    cacheSize,
    isLoading,
    refreshDownloads,
    deleteDownload,
    clearCache,
    refreshCacheSize,
  } = useOfflineStore();

  useEffect(() => {
    refreshDownloads();
    refreshCacheSize();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDelete = (contentId: string, title: string) => {
    Alert.alert(
      'Delete Download',
      `Are you sure you want to delete "${title}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDownload(contentId),
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Downloads',
      'Are you sure you want to delete all downloaded content?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearCache(),
        },
      ]
    );
  };

  const renderDownloadItem = ({item}: {item: CachedContent}) => (
    <View style={styles.downloadItem}>
      {item.thumbnailPath && (
        <Image
          source={{uri: `file://${item.thumbnailPath}`}}
          style={styles.thumbnail}
        />
      )}
      <View style={styles.contentInfo}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.metadata}>
          {item.contentType.toUpperCase()} • {formatBytes(item.metadata.size)}
        </Text>
        <Text style={styles.date}>
          Downloaded: {new Date(item.metadata.downloadedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.title)}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveDownload = ({item}: {item: any}) => (
    <View style={styles.activeDownloadItem}>
      <View style={styles.downloadInfo}>
        <Text style={styles.downloadTitle}>Downloading...</Text>
        <Text style={styles.downloadProgress}>{item.progress}%</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, {width: `${item.progress}%`}]} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloads</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>
            {downloadedContent.length} items • {formatBytes(cacheSize)}
          </Text>
          {downloadedContent.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearButton}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active Downloads */}
      {activeDownloads.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Downloads</Text>
          <FlatList
            data={activeDownloads}
            renderItem={renderActiveDownload}
            keyExtractor={(item) => item.contentId}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Downloaded Content */}
      {downloadedContent.length > 0 ? (
        <FlatList
          data={downloadedContent}
          renderItem={renderDownloadItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refreshDownloads}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📥</Text>
          <Text style={styles.emptyTitle}>No Downloads</Text>
          <Text style={styles.emptyText}>
            Download content to watch offline
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  clearButton: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  listContent: {
    padding: 16,
  },
  downloadItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  contentInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metadata: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  deleteIcon: {
    fontSize: 24,
  },
  activeDownloadItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  downloadInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  downloadTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  downloadProgress: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
