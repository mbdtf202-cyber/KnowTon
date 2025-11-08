import React, {useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useOfflineStore} from '@store/offlineStore';
import {OfflinePurchase} from '@services/offlinePurchase.service';

export const OfflinePurchasesScreen: React.FC = () => {
  const {
    pendingPurchases,
    isOnline,
    isLoading,
    refreshPurchases,
    syncPurchases,
    retryPurchase,
    cancelPurchase,
  } = useOfflineStore();

  useEffect(() => {
    refreshPurchases();
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        'You need to be online to sync purchases',
        [{text: 'OK'}]
      );
      return;
    }

    try {
      await syncPurchases();
      Alert.alert(
        'Success',
        'Purchases synced successfully',
        [{text: 'OK'}]
      );
    } catch (error) {
      Alert.alert(
        'Sync Failed',
        error instanceof Error ? error.message : 'Failed to sync purchases',
        [{text: 'OK'}]
      );
    }
  };

  const handleRetry = async (purchaseId: string) => {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        'You need to be online to retry purchases',
        [{text: 'OK'}]
      );
      return;
    }

    try {
      await retryPurchase(purchaseId);
    } catch (error) {
      Alert.alert(
        'Retry Failed',
        error instanceof Error ? error.message : 'Failed to retry purchase',
        [{text: 'OK'}]
      );
    }
  };

  const handleCancel = (purchaseId: string) => {
    Alert.alert(
      'Cancel Purchase',
      'Are you sure you want to cancel this pending purchase?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => cancelPurchase(purchaseId),
        },
      ]
    );
  };

  const getStatusColor = (purchase: OfflinePurchase): string => {
    if (purchase.synced) return '#34C759';
    if ((purchase.syncAttempts || 0) >= 3) return '#FF3B30';
    return '#FF9500';
  };

  const getStatusText = (purchase: OfflinePurchase): string => {
    if (purchase.synced) return 'Synced';
    if ((purchase.syncAttempts || 0) >= 3) return 'Failed';
    if (purchase.syncAttempts && purchase.syncAttempts > 0) {
      return `Retry ${purchase.syncAttempts}/3`;
    }
    return 'Pending';
  };

  const renderPurchaseItem = ({item}: {item: OfflinePurchase}) => (
    <View style={styles.purchaseItem}>
      <View style={styles.purchaseInfo}>
        <Text style={styles.purchaseId} numberOfLines={1}>
          Purchase #{item.id.slice(-8)}
        </Text>
        <Text style={styles.purchaseDetails}>
          {item.currency} {item.price.toFixed(2)} • {item.paymentMethod}
        </Text>
        <Text style={styles.purchaseDate}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
        {item.error && (
          <Text style={styles.errorText} numberOfLines={2}>
            Error: {item.error}
          </Text>
        )}
      </View>
      
      <View style={styles.purchaseActions}>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item)}]}>
          <Text style={styles.statusText}>{getStatusText(item)}</Text>
        </View>
        
        {!item.synced && (
          <View style={styles.actionButtons}>
            {(item.syncAttempts || 0) < 3 && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => handleRetry(item.id)}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offline Purchases</Text>
        <View style={styles.headerInfo}>
          <View style={[styles.onlineIndicator, {backgroundColor: isOnline ? '#34C759' : '#FF3B30'}]} />
          <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {/* Sync Button */}
      {pendingPurchases.length > 0 && (
        <View style={styles.syncSection}>
          <Text style={styles.syncInfo}>
            {pendingPurchases.filter(p => !p.synced).length} pending purchases
          </Text>
          <TouchableOpacity
            style={[styles.syncButton, !isOnline && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={!isOnline || isLoading}
          >
            <Text style={styles.syncButtonText}>
              {isLoading ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Purchase List */}
      {pendingPurchases.length > 0 ? (
        <FlatList
          data={pendingPurchases}
          renderItem={renderPurchaseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refreshPurchases}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>All Synced</Text>
          <Text style={styles.emptyText}>
            No pending offline purchases
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  syncSection: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncInfo: {
    fontSize: 14,
    color: '#8E8E93',
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  syncButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  purchaseItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  purchaseInfo: {
    marginBottom: 12,
  },
  purchaseId: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  purchaseDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  purchaseDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  purchaseActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
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
