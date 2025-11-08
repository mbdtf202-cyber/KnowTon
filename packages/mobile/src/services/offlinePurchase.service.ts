import NetInfo from '@react-native-community/netinfo';
import {offlineStorageService} from './offlineStorage.service';
import {apiService} from './api';

export interface OfflinePurchase {
  id: string;
  contentId: string;
  userId: string;
  price: number;
  currency: string;
  paymentMethod: string;
  timestamp: string;
  synced: boolean;
  syncAttempts?: number;
  lastSyncAttempt?: string;
  error?: string;
}

class OfflinePurchaseService {
  private syncInProgress = false;
  private maxSyncAttempts = 3;

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener(): void {
    // Listen for network changes and sync when online
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.syncInProgress) {
        this.syncPurchases();
      }
    });
  }

  async queuePurchase(purchase: Omit<OfflinePurchase, 'id' | 'timestamp' | 'synced'>): Promise<string> {
    const purchaseId = this.generatePurchaseId();
    
    const offlinePurchase: OfflinePurchase = {
      ...purchase,
      id: purchaseId,
      timestamp: new Date().toISOString(),
      synced: false,
      syncAttempts: 0,
    };

    await offlineStorageService.addOfflinePurchase(offlinePurchase);
    
    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.syncPurchases();
    }

    return purchaseId;
  }

  async syncPurchases(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const purchases = await offlineStorageService.getOfflinePurchases();
      const unsyncedPurchases = purchases.filter(p => !p.synced);

      for (const purchase of unsyncedPurchases) {
        await this.syncSinglePurchase(purchase);
      }

      // Clean up synced purchases
      await offlineStorageService.clearSyncedPurchases();
    } catch (error) {
      console.error('Failed to sync purchases:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncSinglePurchase(purchase: OfflinePurchase): Promise<void> {
    try {
      // Check if max attempts reached
      if ((purchase.syncAttempts || 0) >= this.maxSyncAttempts) {
        console.warn(`Max sync attempts reached for purchase ${purchase.id}`);
        return;
      }

      // Attempt to sync with backend
      const response = await apiService.post('/purchases/offline-sync', {
        offlinePurchaseId: purchase.id,
        contentId: purchase.contentId,
        price: purchase.price,
        currency: purchase.currency,
        paymentMethod: purchase.paymentMethod,
        timestamp: purchase.timestamp,
      });

      // Mark as synced
      await offlineStorageService.markPurchaseAsSynced(purchase.id);
      
      console.log(`Successfully synced purchase ${purchase.id}`);
    } catch (error) {
      console.error(`Failed to sync purchase ${purchase.id}:`, error);

      // Update sync attempts
      const purchases = await offlineStorageService.getOfflinePurchases();
      const updatedPurchases = purchases.map(p => {
        if (p.id === purchase.id) {
          return {
            ...p,
            syncAttempts: (p.syncAttempts || 0) + 1,
            lastSyncAttempt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Sync failed',
          };
        }
        return p;
      });

      await offlineStorageService.addOfflinePurchase(updatedPurchases[0]);
    }
  }

  async getPendingPurchases(): Promise<OfflinePurchase[]> {
    const purchases = await offlineStorageService.getOfflinePurchases();
    return purchases.filter(p => !p.synced);
  }

  async getPurchaseStatus(purchaseId: string): Promise<OfflinePurchase | null> {
    const purchases = await offlineStorageService.getOfflinePurchases();
    return purchases.find(p => p.id === purchaseId) || null;
  }

  async retryFailedPurchase(purchaseId: string): Promise<void> {
    const purchase = await this.getPurchaseStatus(purchaseId);
    if (purchase && !purchase.synced) {
      await this.syncSinglePurchase(purchase);
    }
  }

  async cancelPendingPurchase(purchaseId: string): Promise<void> {
    await offlineStorageService.removeOfflinePurchase(purchaseId);
  }

  async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected || false;
  }

  private generatePurchaseId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if a purchase can be made offline
  async canPurchaseOffline(contentId: string): Promise<boolean> {
    // Check if content is already purchased
    try {
      const response = await apiService.get(`/purchases/check/${contentId}`);
      return false; // Already purchased
    } catch (error) {
      // If offline or not purchased, allow offline purchase
      const isOnline = await this.isOnline();
      return !isOnline;
    }
  }

  // Validate offline purchase before queuing
  async validateOfflinePurchase(purchase: Omit<OfflinePurchase, 'id' | 'timestamp' | 'synced'>): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Check if user has sufficient balance (if applicable)
    // Check if content is available
    // Check if payment method is valid for offline purchases
    
    if (!purchase.contentId || !purchase.userId) {
      return {
        valid: false,
        error: 'Missing required purchase information',
      };
    }

    if (purchase.price <= 0) {
      return {
        valid: false,
        error: 'Invalid purchase price',
      };
    }

    // Only allow certain payment methods for offline purchases
    const allowedOfflinePaymentMethods = ['wallet', 'stored_card'];
    if (!allowedOfflinePaymentMethods.includes(purchase.paymentMethod)) {
      return {
        valid: false,
        error: 'Payment method not supported for offline purchases',
      };
    }

    return {valid: true};
  }
}

export const offlinePurchaseService = new OfflinePurchaseService();
