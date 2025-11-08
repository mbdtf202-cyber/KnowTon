import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useAuthStore} from '@store/authStore';
import {COLORS, SPACING, FONT_SIZES} from '@utils/constants';

interface WalletConnectButtonProps {
  onConnect?: (address: string) => void;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onConnect,
}) => {
  const {user, isAuthenticated} = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const walletProviders = [
    {id: 'metamask', name: 'MetaMask', icon: '🦊'},
    {id: 'walletconnect', name: 'WalletConnect', icon: '🔗'},
    {id: 'coinbase', name: 'Coinbase Wallet', icon: '💼'},
  ];

  const handleWalletConnect = async (providerId: string) => {
    setConnecting(true);
    try {
      // Simulate wallet connection
      // In production, this would use actual wallet SDKs
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      
      if (onConnect) {
        onConnect(mockAddress);
      }
      
      Alert.alert(
        'Success',
        `Connected to ${providerId}`,
        [{text: 'OK', onPress: () => setModalVisible(false)}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  if (isAuthenticated && user?.walletAddress) {
    return (
      <View style={styles.connectedContainer}>
        <Text style={styles.connectedLabel}>Connected</Text>
        <Text style={styles.address}>
          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
        </Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonText}>🔗 Connect Wallet</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect Wallet</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Choose a wallet provider to connect
            </Text>

            {walletProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={styles.providerButton}
                onPress={() => handleWalletConnect(provider.id)}
                disabled={connecting}>
                <Text style={styles.providerIcon}>{provider.icon}</Text>
                <Text style={styles.providerName}>{provider.name}</Text>
                {connecting && (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}

            <Text style={styles.disclaimer}>
              By connecting your wallet, you agree to our Terms of Service
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  connectedContainer: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectedLabel: {
    color: COLORS.background,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: 2,
  },
  address: {
    color: COLORS.background,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.textSecondary,
  },
  modalDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  providerIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  providerName: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
